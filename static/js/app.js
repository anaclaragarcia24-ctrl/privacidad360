/* PRIVACIDAD 360 — Interfaz gamificada (enrutador por hash, vistas, XP, insignias y almacenamiento local). */
(function () {
  'use strict';
  const D = window.P360_DATOS;
  const L = window.P360_LOGICA;
  const J = window.P360_JUEGO;
  const I = window.P360_I18N;
  const P = window.P360;
  const t = (s, v) => I.t(s, v);
  const nombreNivel = (n) => I.loc('nivel', n).nombre;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nombreCat = (id) => (D.CATEGORIAS.find((c) => c.id === id) || { nombre: 'Repaso' }).nombre;
  const iconoCat = (id) => (D.CATEGORIAS.find((c) => c.id === id) || { icono: '🔁' }).icono;
  const hoy = () => new Date().toISOString().slice(0, 10);
  const sinMovimiento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Almacenamiento local ----------
     Los datos reales y los del modo demostración se guardan por separado para no mezclarse. */
  const CLAVE_REAL = 'p360_datos_v1', CLAVE_DEMO = 'p360_demo_v1', CLAVE_MODO = 'p360_modo';
  const vacio = () => ({ respuestas: {}, historial: [], plan: null, auditoria: {}, simulador: {}, academia: {}, evaluacion: {}, compartidos: [], retos: {}, guias: {}, avatar: '🦊', aventura: {}, monedas: 0, inventario: [], equipo: {}, modos: {} });
  let modoDemo = leerLS(CLAVE_MODO) === 'demo';
  let estado = cargar();
  let previo = L.calcularLogros(estado);   // para detectar XP, insignias y niveles nuevos
  let simRetro = null;                     // situación del simulador cuya retroalimentación se está mostrando

  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribirLS(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function cargar() {
    try { return Object.assign(vacio(), JSON.parse(leerLS(modoDemo ? CLAVE_DEMO : CLAVE_REAL) || '{}')); }
    catch (e) { return vacio(); }
  }
  function guardar(silencioso) {
    escribirLS(modoDemo ? CLAVE_DEMO : CLAVE_REAL, JSON.stringify(estado));
    const ahora = L.calcularLogros(estado);
    if (!silencioso) celebrar(previo, ahora);
    previo = ahora;
    actualizarCabecera();
  }

  function activarDemo() {
    modoDemo = true; escribirLS(CLAVE_MODO, 'demo');
    estado = vacio();
    estado.avatar = '🐼';
    estado.monedas = 300;   // ficticias, para poder mostrar la tienda en la demostración
    estado.respuestas = Object.assign({}, D.PERFIL_DEMO.respuestas);
    estado.historial.push(registroHistorial(L.calcularDiagnostico(estado.respuestas), 'Diagnóstico inicial (ficticio)'));
    const evAntes = { 0: 0, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 2, 9: 2 };
    estado.evaluacion.antes = Object.assign({ respuestas: evAntes, fecha: hoy() }, L.calificarCuestionario(D.EVALUACION.antes, evAntes));
    guardar(true); aviso(t('🎭 Modo demostración activado: todos los datos son ficticios.'));
    location.hash = '#/panel'; render();
  }
  function salirDemo() {
    modoDemo = false; escribirLS(CLAVE_MODO, 'real');
    try { localStorage.removeItem(CLAVE_DEMO); } catch (e) { /* sin acceso a almacenamiento */ }
    estado = cargar(); previo = L.calcularLogros(estado); simRetro = null;
    aviso(t('Saliste del modo demostración. Se borraron los datos ficticios.'));
    location.hash = '#/inicio'; render();
  }

  function registroHistorial(diag, nota) {
    const categorias = {};
    diag.categorias.forEach((c) => { categorias[c.id] = c.puntaje; });
    return { fecha: hoy(), total: diag.total, categorias, nota: nota || '' };
  }

  /* ---------- Avisos, celebraciones y confeti ---------- */
  /* Los avisos de juego (XP, insignias) hacen fila; los avisos informativos o de error se muestran de inmediato. */
  const colaAvisos = [];
  let temporizadorAviso = null;
  function aviso(texto, tipo) {
    if (tipo) { colaAvisos.push({ texto, tipo }); if (colaAvisos.length === 1) mostrarSiguienteAviso(); return; }
    colaAvisos.unshift({ texto });
    mostrarSiguienteAviso();
  }
  function mostrarSiguienteAviso() {
    const t = $('#aviso');
    const a = colaAvisos[0];
    clearTimeout(temporizadorAviso);
    if (!a) { t.hidden = true; return; }
    t.textContent = a.texto; t.className = 'aviso ' + (a.tipo || ''); t.hidden = false;
    temporizadorAviso = setTimeout(() => { colaAvisos.shift(); mostrarSiguienteAviso(); }, a.tipo ? 2300 : 3200);
  }
  /* Al reemplazar el plan se conservan los días ya completados para no perder XP ni insignias. */
  function reiniciarPlan() {
    if (estado.plan) estado.diasPrevios = Math.min((estado.diasPrevios || 0) + estado.plan.filter((d) => d.hecho).length, 7);
    estado.plan = null;
  }
  function celebrar(antes, ahora) {
    const ganado = ahora.xp - antes.xp;
    if (ganado > 0) { aviso(`+${ganado} XP`, 'xp'); J.SFX.moneda(); }
    ahora.insignias.filter((b, i) => b.obtenida && !antes.insignias[i].obtenida)
      .forEach((b) => { aviso(`${b.icono} ${t('¡Nueva insignia: {nombre}!', { nombre: t(b.nombre) })}`, 'insignia'); J.SFX.insignia(); confeti(); });
    if (ahora.nivel.n > antes.nivel.n) { J.SFX.nivel(); subirNivel(ahora.nivel); }
  }
  function subirNivel(nivel) {
    const m = $('#modal');
    $('#modal-contenido').innerHTML = `<p class="modal-icono" aria-hidden="true">${nivel.icono}</p><h2>${t('¡Subiste de nivel!')}</h2><p>${esc(t('Ahora eres {nombre} (nivel {n}).', { nombre: nombreNivel(nivel), n: nivel.n }))}</p>`;
    confeti(70);
    if (typeof m.showModal === 'function' && !m.open) m.showModal();
  }
  function confeti(cantidad = 40) {
    if (sinMovimiento()) return;
    const capa = $('#confeti');
    const colores = ['#F8D0E0', '#FDC59A', '#F7E7B3', '#CBDCBB', '#A7C6DD', '#C9A1C2', '#93B2A7', '#FCC5B8'];
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement('span');
      p.className = 'pieza';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colores[i % colores.length];
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      capa.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }
  }

  /* ---------- Piezas de interfaz ---------- */
  function barra(pct, nivel, etiqueta) {
    return `<div class="barra" role="img" aria-label="${etiqueta || pct + ' de 100'}"><span class="barra-relleno nivel-${nivel || 'medio'}" data-ancho="${pct}"></span></div>`;
  }
  function aplicarAnchos(raiz) {
    $$('[data-ancho]', raiz).forEach((el) => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.ancho))) + '%'; });
    $$('[data-pct]', raiz).forEach((el) => { el.style.setProperty('--pct', Math.max(0, Math.min(100, Number(el.dataset.pct)))); });
  }
  function tarjeta(href, icono, titulo, texto, extra = '', color = '') {
    return `<a class="tarjeta tarjeta-enlace ${color}" href="${href}"><span class="tarjeta-icono" aria-hidden="true">${icono}</span><h3>${titulo}</h3><p>${texto}</p>${extra}</a>`;
  }
  function anillo(pct, nivel, grande, pequeno) {
    return `<div class="anillo nivel-${nivel}" data-pct="${pct}" role="img" aria-label="${pct} de 100"><div><span>${grande}</span><small>${pequeno}</small></div></div>`;
  }
  function ficha(logros) {
    return `<div class="ficha-nivel">${P.avatar(L.avatarActual(estado), 'm')}
      <div><p class="etiqueta">${t('Nivel {n}', { n: logros.nivel.n })} · ${logros.nivel.icono} ${esc(nombreNivel(logros.nivel))}</p>
      <p class="xp-total"><strong>${logros.xp} XP</strong> · ${logros.siguiente ? esc(t('faltan {n} XP para «{nombre}»', { n: logros.siguiente.min - logros.xp, nombre: nombreNivel(logros.siguiente) })) : t('¡nivel máximo!')}</p>
      ${barra(logros.progresoNivel, 'xp', 'Avance de nivel ' + logros.progresoNivel + '%')}</div></div>`;
  }

  /* ---------- Vistas ---------- */
  const VISTAS = {
    inicio() {
      const lg = L.calcularLogros(estado);
      const estrellas = D.MUNDOS.reduce((s, m) => s + (estado.aventura[m.id] ? estado.aventura[m.id].estrellas : 0), 0);
      return `
      <section class="pantalla-titulo">
        <div class="titulo-fondo" aria-hidden="true"><span>🔐</span><span>⭐</span><span>🛡️</span><span>👾</span><span>🎁</span><span>🔥</span><span>💎</span><span>🎣</span></div>
        <img class="logo-grande" src="img/icono.svg" alt="" width="128" height="128">
        <p class="etiqueta">${t('Reto 3 · Caso: Preparatoria «Lázaro Cárdenas»')}</p>
        <h1 class="titulo-arcade">PRIVACIDAD <span>360</span></h1>
        <p class="lema">${t('Protege tu vida digital y sube de nivel')}</p>
        <a class="boton-juego grande pulso" href="#/jugar/${J.siguienteMundo(estado, modoDemo)}">${estrellas ? t('▶ CONTINUAR') : t('▶ JUGAR')}</a>
        <div class="tarjeta ficha-titulo">${ficha(lg)}<p class="nota">${t('⭐ {e} de {te} estrellas · 🏅 {i} de {ti} insignias', { e: estrellas, te: D.MUNDOS.length * 3, i: lg.obtenidas, ti: lg.insignias.length })}${estado.racha ? ' · ' + t('🔥 Racha: {n} día(s)', { n: estado.racha.dias }) : ''}</p></div>
        <div class="acciones centro">
          <a class="boton-juego" href="#/modos">🕹️ ${t('Todos los modos')}</a>
          <a class="boton-juego alterno" href="#/sala">🎟️ ${t('Entrar con código')}</a>
        </div>
        <div class="acciones centro">
          <a class="boton secundario" href="#/instalar">📲 ${t('Instalar la app')}</a>
          <button class="boton secundario" type="button" data-accion="demo">${t('🎭 Ver modo demostración')}</button>
          <a class="boton secundario" href="#/diagnostico">${t('🧭 Escanear mis hábitos')}</a>
        </div>
        <p class="nota">${t('🔒 Nunca te pedimos contraseñas reales, fotos ni acceso a tus redes. Todo se guarda solo en este navegador.')}</p>
      </section>
      <section>
        <h2>🕹️ ${t('Elige tu juego')}</h2>
        ${P.tarjetasModos()}
      </section>
      <section>
        <h2>${t('🗺️ Mundos de la aventura')}</h2>
        ${J.mapa(estado, modoDemo)}
      </section>
      <section>
        <h2>${t('⚡ Misiones extra')}</h2>
        <div class="rejilla">
          ${tarjeta('#/diagnostico', '🧭', t('Escaneo'), t('24 preguntas sobre tus hábitos con puntaje por categoría.'), '<span class="xp-chip">+100 XP</span>', 'c-rosa')}
          ${tarjeta('#/plan', '🗓️', t('Plan de 7 días'), t('Una misión diaria según tus resultados.'), '<span class="xp-chip">+20 XP/día</span>', 'c-durazno')}
          ${tarjeta('#/contrasenas', '🔑', t('Contraseñas'), t('Pon a prueba una contraseña de ejemplo. No se guarda.'), '<span class="xp-chip">+25 XP</span>', 'c-amarillo')}
          ${tarjeta('#/auditoria', '✅', t('Auditoría'), t('Revisa tus apps tú mismo, paso a paso.'), '<span class="xp-chip">+5 XP c/u</span>', 'c-verde')}
          ${tarjeta('#/simulador', '💬', t('Simulador'), t('12 situaciones ficticias: ¿qué harías?'), '<span class="xp-chip">+15 XP</span>', 'c-menta')}
          ${tarjeta('#/academia', '🎓', t('Academia'), t('6 módulos cortos con quiz.'), '<span class="xp-chip">+30 XP</span>', 'c-azul')}
          ${tarjeta('#/emergencia', '🆘', t('Emergencia'), t('Qué hacer si te roban una cuenta o difunden una foto.'), '<span class="xp-chip">+10 XP</span>', 'c-lila')}
          ${tarjeta('#/logros', '🏅', t('Logros'), t('Tu nivel, tus insignias y tu avatar.'), '', 'c-malva')}
        </div>
      </section>`;
    },

    jugar(param) {
      if (param) {
        const i = D.MUNDOS.findIndex((m) => m.id === param);
        if (i < 0) return VISTAS.noEncontrado();
        if (!modoDemo && !L.mundoDesbloqueado(i, estado.aventura)) {
          return `<div class="pantalla-fin"><p class="titulo-fin">${t('🔒 Mundo bloqueado')}</p><p>${esc(t('Gana al menos 1 estrella en «{nombre}» para abrirlo.', { nombre: J.nombreMundo(D.MUNDOS[i - 1]) }))}</p><a class="boton-juego" href="#/jugar/${D.MUNDOS[i - 1].id}">${t('▶ Ir al mundo anterior')}</a></div>`;
        }
        return '<div id="zona-juego" class="zona-juego"></div>';
      }
      return `
      <h1>${t('🗺️ Elige tu mundo')}</h1>
      <div class="tarjeta c-lila">${ficha(L.calcularLogros(estado))}</div>
      <div class="acciones">
        <a class="boton-juego" href="#/jugar/${J.siguienteMundo(estado, modoDemo)}">${t('▶ Jugar')}</a>
        <button class="boton secundario" type="button" data-accion="sin-tiempo" aria-pressed="${J.sinTiempo()}">${J.sinTiempo() ? t('⏱ Sin límite de tiempo: activado') : t('⏱ Jugar sin límite de tiempo')}</button>
      </div>
      ${J.mapa(estado, modoDemo)}
      ${modoDemo ? `<p class="nota">${t('🎭 En modo demostración todos los mundos están abiertos.')}</p>` : ''}`;
    },

    proyecto() {
      return `
      <h1>Sobre el proyecto</h1>
      <div class="rejilla dos">
        <article class="tarjeta c-rosa"><h2>😟 El problema</h2><p>En la Escuela Preparatoria «Lázaro Cárdenas» (aprox. 700 estudiantes), la escuela identificó con entrevistas y encuestas casos de información personal compartida sin conocer los riesgos, robo de cuentas, fotos difundidas sin permiso, suplantación de identidad, contraseñas débiles y desconocimiento de la configuración de privacidad.</p></article>
        <article class="tarjeta c-verde"><h2>💡 Nuestra propuesta</h2><p>Una plataforma en forma de juego que primero <strong>diagnostica</strong> tus hábitos, después <strong>recomienda</strong> acciones, te deja <strong>practicar</strong> con situaciones ficticias y <strong>mide</strong> lo que aprendiste.</p></article>
        <article class="tarjeta c-azul"><h2>🚫 Lo que NO hace</h2><ul class="lista"><li>No pide contraseñas reales ni entra a tus cuentas.</li><li>No recopila fotos ni datos que te identifiquen.</li><li>No hace ataques reales: todas las situaciones son ficticias.</li></ul></article>
        <article class="tarjeta c-amarillo"><h2>🧪 Estado</h2><p>Prototipo funcional hecho como proyecto escolar (Reto 3) con apoyo de inteligencia artificial. Los beneficios son <strong>resultados esperados</strong>: todavía no se mide su impacto con estudiantes.</p></article>
      </div>`;
    },

    panel() {
      const lg = L.calcularLogros(estado);
      const ultimo = estado.historial[estado.historial.length - 1];
      return `
      <h1>Mi base</h1>
      <div class="tarjeta c-lila base">${ficha(lg)}
        ${lg.siguienteMision ? `<a class="boton" href="${lg.siguienteMision.ruta}">${lg.siguienteMision.icono} Siguiente misión: ${esc(lg.siguienteMision.titulo)}</a>` : '<p class="exito">🏆 ¡Completaste todas las misiones!</p>'}</div>
      <h2>Mapa de misiones</h2>
      <ol class="mapa">
        ${lg.misiones.map((m, i) => `<li class="mision ${m.estado}"><a href="${m.ruta}"><span class="nodo" aria-hidden="true">${m.estado === 'hecha' ? '✔' : m.icono}</span><span class="mision-texto"><strong>${i + 1}. ${esc(m.titulo)}</strong><small>${m.estado === 'hecha' ? 'Completada' : m.estado === 'en-curso' ? 'En curso' : 'Pendiente'} · hasta ${m.xp} XP</small></span></a></li>`).join('')}
      </ol>
      <h2>Resumen</h2>
      <div class="rejilla tres">
        <div class="tarjeta c-rosa"><h3>🧭 Último escaneo</h3>${ultimo ? `<p class="numero">${ultimo.total}<small>/100</small></p><p>${L.nivelDe(ultimo.total).texto}</p>` : '<p>Aún no lo haces.</p>'}</div>
        <div class="tarjeta c-amarillo"><h3>🏅 Insignias</h3><p class="numero">${lg.obtenidas}<small>/${lg.insignias.length}</small></p><p><a href="#/logros">Ver mis logros</a></p></div>
        <div class="tarjeta c-azul"><h3>🧠 Conocimientos</h3><p class="numero">${estado.evaluacion.antes ? estado.evaluacion.antes.porcentaje + '%' : '—'}${estado.evaluacion.despues ? ' → ' + estado.evaluacion.despues.porcentaje + '%' : ''}</p><p>Evaluación inicial → final</p></div>
      </div>`;
    },

    diagnostico() {
      const zona = sessionStorageGet('p360_zona');
      if (zona) {
        const c = D.CATEGORIAS.find((x) => x.id === zona);
        const n = D.CATEGORIAS.findIndex((x) => x.id === zona) + 1;
        return `<h1>🧭 Escaneo de privacidad</h1>
        <div class="pantalla-fin zona-completa"><p class="intro-icono" aria-hidden="true">${c.icono}</p>
          <p class="titulo-fin">¡Zona completada!</p><p class="entrada">«${esc(c.nombre)}» · zona ${n} de ${D.CATEGORIAS.length}</p>
          <p class="zonas">${D.CATEGORIAS.map((x, k) => `<span class="${k < n ? 'lista' : ''}" title="${esc(x.nombre)}">${x.icono}</span>`).join('')}</p>
          <p class="nota">Tus respuestas se guardan solo en este navegador. ${n < D.CATEGORIAS.length ? '¡Sigue así!' : ''}</p>
          <button type="button" class="boton-juego grande" data-accion="seguir-escaneo">Siguiente zona ▶</button></div>`;
      }
      const total = D.PREGUNTAS.length;
      let i = Number(sessionStorageGet('p360_pregunta') || 0);
      if (i >= total) i = 0;
      const p = D.PREGUNTAS[i];
      const cat = D.CATEGORIAS.find((c) => c.id === p.cat);
      const resp = estado.respuestas[p.id];
      const contestadas = D.PREGUNTAS.filter((q) => estado.respuestas[q.id] !== undefined).length;
      return `
      <h1>🧭 Escaneo de privacidad</h1>
      <p class="entrada">Responde con sinceridad: no hay respuestas «malas» y nadie más verá lo que contestes. Al terminar ganas <strong>+100 XP</strong>.</p>
      ${modoDemo ? '<p><button class="boton secundario pequeno" type="button" data-accion="rellenar-demo">Rellenar con el perfil ficticio</button></p>' : ''}
      <div class="progreso-texto"><span>Pregunta ${i + 1} de ${total}</span><span>${contestadas} contestadas</span></div>
      ${barra(Math.round(contestadas / total * 100), 'xp', contestadas + ' de ' + total + ' contestadas')}
      <form class="tarjeta pregunta" id="form-pregunta" data-indice="${i}">
        <p class="chip-cat">${cat.icono} ${cat.nombre}</p>
        <fieldset><legend><h2>${esc(p.texto)}</h2></legend>
        ${p.opciones.map((o, k) => `<label class="opcion"><input type="radio" name="op" value="${k}" ${resp === k ? 'checked' : ''}> <span>${esc(o[0])}</span></label>`).join('')}
        </fieldset>
        <div class="acciones">
          <button type="button" class="boton secundario" data-accion="anterior" ${i === 0 ? 'disabled' : ''}>← Anterior</button>
          ${i < total - 1 ? '<button type="submit" class="boton">Siguiente →</button>' : `<button type="button" class="boton" data-accion="terminar" ${contestadas < total ? 'disabled' : ''}>Ver mis resultados 🎉</button>`}
        </div>
        ${i === total - 1 && contestadas < total ? `<p class="nota" role="status">Faltan ${total - contestadas} preguntas por contestar. Usa «Anterior» para revisarlas.</p>` : ''}
      </form>`;
    },

    resultados() {
      const diag = L.calcularDiagnostico(estado.respuestas);
      if (!diag.completo) return `<h1>Resultados</h1><div class="tarjeta"><p>Primero completa el escaneo (${diag.respondidas} de ${diag.totalPreguntas} preguntas contestadas).</p><a class="boton" href="#/diagnostico">Ir al escaneo</a></div>`;
      const yaCompartido = (estado.compartidos || []).includes('diag-' + estado.historial.length);
      return `
      <h1>Resultados del diagnóstico</h1>
      <div class="resultado-total tarjeta">
        ${anillo(diag.total, diag.nivel.id, diag.total, 'de 100')}
        <div><p class="chip-nivel nivel-${diag.nivel.id}">${diag.nivel.texto}</p>
        <p>Tu puntaje combina las ${diag.totalPreguntas} respuestas. Las preguntas sobre riesgos más graves (por ejemplo, repetir contraseñas o compartir códigos) pesan más.</p>
        <p class="nota">0–49: riesgo alto · 50–74: riesgo medio · 75–100: buenas prácticas</p></div>
      </div>
      <h2>Tu escudo por categoría</h2>
      <div class="rejilla dos">
        ${diag.categorias.map((c) => `<div class="tarjeta categoria"><h3>${c.icono} ${c.nombre}</h3>${barra(c.puntaje, c.nivel.id)}<p><strong>${c.puntaje}/100</strong> · ${c.nivel.texto}</p><p class="nota">${esc(D.CATEGORIAS.find((x) => x.id === c.id).descripcion)}</p></div>`).join('')}
      </div>
      <h2>Tus recomendaciones (${diag.recomendaciones.length})</h2>
      <ol class="recomendaciones">
        ${diag.recomendaciones.slice(0, 8).map((r) => `<li class="tarjeta"><span class="chip chip-${L.etiquetaPrioridad(r.prioridad).toLowerCase()}">${L.etiquetaPrioridad(r.prioridad)}</span> <span class="chip">${iconoCat(r.cat)} ${nombreCat(r.cat)}</span><p>${esc(r.texto)}</p></li>`).join('') || '<li class="tarjeta">¡Excelente! No tienes recomendaciones pendientes.</li>'}
      </ol>
      ${diag.recomendaciones.length > 8 ? `<details><summary>Ver las otras ${diag.recomendaciones.length - 8} recomendaciones</summary><ol class="recomendaciones">${diag.recomendaciones.slice(8).map((r) => `<li class="tarjeta"><span class="chip">${nombreCat(r.cat)}</span><p>${esc(r.texto)}</p></li>`).join('')}</ol></details>` : ''}
      <div class="acciones">
        <a class="boton" href="#/plan">🗓️ Crear mi plan de 7 días</a>
        <a class="boton secundario" href="#/progreso">Ver mi progreso</a>
      </div>
      <div class="tarjeta compartir c-menta">
        <h3>💌 Ayuda a tu escuela (opcional)</h3>
        <p>Puedes enviar <strong>solo tus puntajes por categoría</strong> para las estadísticas generales. No se envía tu nombre, tus respuestas individuales, tu dirección IP ni ningún dato que te identifique.</p>
        ${yaCompartido ? '<p class="exito">✓ Ya enviaste este resultado de forma anónima. Gracias.</p>' : `<label class="opcion"><input type="checkbox" id="consentimiento"> <span>Acepto enviar mis puntajes de forma anónima.</span></label>
        <button class="boton secundario" type="button" data-accion="compartir">Enviar puntajes anónimos</button>`}
      </div>`;
    },

    plan() {
      const diag = L.calcularDiagnostico(estado.respuestas);
      if (!diag.completo) return `<h1>Plan de 7 días</h1><div class="tarjeta"><p>Tu plan se crea con los resultados del escaneo.</p><a class="boton" href="#/diagnostico">Hacer el escaneo</a></div>`;
      if (!estado.plan) { estado.plan = L.generarPlan(diag); guardar(true); }
      const hechos = estado.plan.filter((d) => d.hecho).length;
      return `
      <h1>🗓️ Mi plan de mejora de 7 días</h1>
      <p class="entrada">Una misión pequeña por día, enfocada en tus categorías con menor puntaje. Cada día completado = <strong>+20 XP</strong>.</p>
      ${barra(Math.round(hechos / 7 * 100), 'xp', hechos + ' de 7 días')}<p>${hechos} de 7 días completados ${hechos >= 3 ? '🔥' : ''}</p>
      <ol class="plan">
        ${estado.plan.map((d, i) => `<li class="tarjeta ${d.hecho ? 'hecho' : ''}"><label class="opcion"><input type="checkbox" data-dia="${i}" ${d.hecho ? 'checked' : ''}> <span><strong>Día ${d.dia}</strong> · <span class="chip">${iconoCat(d.cat)} ${nombreCat(d.cat)}</span><br>${esc(d.texto)}</span></label></li>`).join('')}
      </ol>
      <button class="boton secundario" type="button" data-accion="regenerar-plan">Volver a generar el plan con mi último diagnóstico</button>`;
    },

    contrasenas() {
      return `
      <h1>🔑 Verificador de contraseñas</h1>
      <div class="alerta">⚠️ <strong>No escribas tu contraseña real.</strong> Escribe una parecida para aprender. Funciona solo en tu navegador: no envía, no guarda y no registra lo que escribes.</div>
      <div class="tarjeta c-amarillo">
        <label for="clave" class="etiqueta-campo">Contraseña de ejemplo</label>
        <div class="campo-clave"><input id="clave" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="128" aria-describedby="resultado-clave">
        <button class="boton secundario pequeno" type="button" data-accion="ver-clave" aria-pressed="false">Mostrar</button></div>
        <div id="resultado-clave" aria-live="polite"></div>
        <p class="nota">🎯 Reto: escribe una contraseña de ejemplo «Fuerte» o mejor y gana la insignia 🔐 Candado de acero (+25 XP).</p>
      </div>
      <div class="tarjeta"><h2>Lo que dicen los expertos</h2><ul class="lista">
        <li>La longitud es lo que más protege: el NIST recomienda que, cuando la contraseña es el único factor, tenga al menos 15 caracteres.</li>
        <li>Una frase de varias palabras al azar es fácil de recordar y difícil de adivinar.</li>
        <li>No repitas contraseñas y activa la verificación en dos pasos (CISA).</li></ul>
        <p class="nota">Este verificador es educativo: da una orientación aproximada, no una garantía de seguridad.</p></div>`;
    },

    auditoria() {
      const prog = L.progresoAuditoria(estado.auditoria);
      return `
      <h1>✅ Auditoría manual de privacidad</h1>
      <p class="entrada">Abre cada app en tu propio teléfono y revisa los puntos. PRIVACIDAD 360 <strong>no se conecta</strong> a tus cuentas: solo guarda en este navegador qué casillas marcaste. Cada punto = <strong>+5 XP</strong>.</p>
      ${barra(prog.porcentaje, 'xp', prog.porcentaje + '%')}<p>${prog.hechos} de ${prog.total} revisiones completadas (${prog.porcentaje}%)</p>
      <p class="nota">Los menús de las aplicaciones cambian con el tiempo. Si no encuentras una opción, busca en la ayuda oficial de la aplicación (ver Recursos).</p>
      <div class="rejilla dos">
        ${D.AUDITORIA.map((p, k) => { const pp = prog.porPlataforma.find((x) => x.id === p.id); return `<fieldset class="tarjeta ${['c-verde', 'c-rosa', 'c-azul', 'c-lila', 'c-amarillo', 'c-menta'][k % 6]}"><legend><h2>${p.nombre} <small>${pp.hechos}/${pp.total}${pp.hechos === pp.total ? ' ⭐' : ''}</small></h2></legend>
          ${p.items.map((it, i) => `<label class="opcion"><input type="checkbox" data-auditoria="${p.id}" data-item="${i}" ${(estado.auditoria[p.id] || {})[i] ? 'checked' : ''}> <span>${esc(it)}</span></label>`).join('')}</fieldset>`; }).join('')}
      </div>`;
    },

    simulador() {
      const s = L.calificarSimulador(estado.simulador);
      const id = simRetro || (D.ESCENARIOS.find((e) => estado.simulador[e.id] === undefined) || {}).id;
      if (!id) {
        const est = L.estrellasSimulador(s.correctas, s.total);
        return `
        <h1>🎮 Simulador de riesgos</h1>
        <div class="tarjeta final-juego c-amarillo">
          <p class="estrellas" aria-label="${est} de 3 estrellas">${'⭐'.repeat(est)}${'☆'.repeat(3 - est)}</p>
          <h2>¡Terminaste las ${s.total} situaciones!</h2>
          <p class="numero">${s.correctas}<small>/${s.total}</small></p><p>decisiones seguras</p>
          <button class="boton" type="button" data-accion="reiniciar-simulador">🔄 Jugar de nuevo</button>
        </div>`;
      }
      const n = D.ESCENARIOS.findIndex((e) => e.id === id);
      const e = D.ESCENARIOS[n];
      const el = estado.simulador[e.id];
      const resp = el !== undefined;
      return `
      <h1>🎮 Simulador de riesgos</h1>
      <div class="alerta info">🎭 Todas las situaciones, nombres, números y enlaces son <strong>ficticios</strong> y no llevan a ningún sitio.</div>
      <div class="marcador"><span>Situación ${n + 1} de ${D.ESCENARIOS.length}</span><span>✅ ${s.correctas} seguras</span></div>
      ${barra(Math.round(s.respondidas / s.total * 100), 'xp', s.respondidas + ' de ' + s.total)}
      <article class="tarjeta escenario" id="esc-${e.id}">
        <p class="chip-cat">${esc(e.canal)}</p><h2>${esc(e.titulo)}</h2>
        <div class="burbuja"><small>${esc(e.remitente)}</small><p>${esc(e.mensaje)}</p></div>
        <p class="pregunta-sim">¿Qué harías?</p>
        <div class="opciones-escenario">${e.opciones.map((o, k) => `<button type="button" class="opcion-boton ${resp ? (k === e.ok ? 'correcta' : (k === el ? 'incorrecta' : '')) : ''}" data-escenario="${e.id}" data-opcion="${k}" ${resp ? 'disabled' : ''}><span class="letra">${'ABC'[k]}</span> ${esc(o)}</button>`).join('')}</div>
        ${resp ? `<div class="retro ${el === e.ok ? 'bien' : 'mal'}" role="status"><p class="${el === e.ok ? 'exito' : 'error'}">${el === e.ok ? '✓ ¡Decisión segura! +15 XP' : '✗ Esa opción tiene riesgos. +5 XP por intentarlo'}</p><p>${esc(e.explicacion)}</p></div>
          <button class="boton" type="button" data-accion="siguiente-situacion">${n < D.ESCENARIOS.length - 1 ? 'Siguiente situación →' : 'Ver mi resultado 🏆'}</button>` : ''}
      </article>
      ${s.respondidas ? '<button class="boton secundario pequeno" type="button" data-accion="reiniciar-simulador">Reiniciar simulador</button>' : ''}`;
    },

    academia() {
      return `
      <h1>🎓 Academia de ciudadanía digital</h1>
      <p class="entrada">Seis módulos cortos. Cada uno tiene una lección y un quiz de 3 preguntas: +30 XP por módulo y +10 XP por respuesta correcta.</p>
      <div class="acciones"><a class="boton secundario" href="#/evaluacion/antes">🧠 Evaluación inicial ${estado.evaluacion.antes ? '✓' : ''}</a><a class="boton secundario" href="#/evaluacion/despues">🏆 Evaluación final ${estado.evaluacion.despues ? '✓' : ''}</a></div>
      <div class="rejilla">
        ${D.MODULOS.map((m, k) => { const r = estado.academia[m.id]; return tarjeta('#/academia/' + m.id, m.icono, m.titulo, r && r.completo ? `✔ Completado · ${r.correctas}/${r.total} correctas` : 'Pendiente', '', ['c-rosa', 'c-durazno', 'c-amarillo', 'c-verde', 'c-azul', 'c-lila'][k]); }).join('')}
      </div>`;
    },

    modulo(id) {
      const m = D.MODULOS.find((x) => x.id === id);
      if (!m) return VISTAS.noEncontrado();
      const r = estado.academia[m.id];
      return `
      <p><a href="#/academia">← Volver a la Academia</a></p>
      <h1>${m.icono} ${m.titulo}</h1>
      <div class="tarjeta c-azul"><h2>Lección</h2><ul class="lista">${m.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      ${cuestionario('form-modulo', m.quiz, r ? r.respuestas : {}, r && r.completo, m.id)}`;
    },

    evaluacion(tipo) {
      if (tipo !== 'antes' && tipo !== 'despues') return VISTAS.noEncontrado();
      const r = estado.evaluacion[tipo];
      const preguntas = D.EVALUACION[tipo];
      return `
      <p><a href="#/academia">← Volver a la Academia</a></p>
      <h1>${tipo === 'antes' ? '🧠 Evaluación inicial (antes de estudiar)' : '🏆 Evaluación final (después de estudiar)'}</h1>
      <p class="entrada">${tipo === 'antes' ? 'Respóndela antes de los módulos. Sirve para medir cuánto aprendes; no afecta ninguna calificación.' : 'Mide los mismos temas que la evaluación inicial con preguntas diferentes. Si mejoras, ganas la insignia 📈 Aprendizaje comprobado.'}</p>
      ${tipo === 'despues' && !estado.evaluacion.antes ? '<div class="alerta info">Te recomendamos responder primero la evaluación inicial para poder comparar.</div>' : ''}
      ${cuestionario('form-evaluacion', preguntas, r ? r.respuestas : {}, !!r, tipo)}`;
    },

    emergencia() {
      return `
      <h1>🆘 Guía de emergencia digital</h1>
      <div class="alerta">Si estás en peligro inmediato, llama al <strong>911</strong>. Si algo te preocupa, habla con un adulto de confianza o con orientación educativa de tu escuela. <strong>No es tu culpa.</strong></div>
      ${D.EMERGENCIAS.map((g, k) => `<details class="tarjeta guia ${['c-rosa', 'c-lila', 'c-durazno', 'c-azul'][k % 4]}" id="guia-${g.id}" data-guia="${g.id}"><summary><h2>${g.icono} ${g.titulo}</h2>${estado.guias[g.id] ? '<span class="chip">✔ leída</span>' : ''}</summary><ol class="pasos">${g.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></details>`).join('')}
      <p class="nota">Esta guía es orientativa y no sustituye la asesoría de autoridades o profesionales. Los procesos de recuperación y reporte dependen de cada plataforma.</p>`;
    },

    recursos() {
      return `
      <h1>📚 Centro de recursos confiables</h1>
      <p class="entrada">Fuentes oficiales consultadas por el equipo. Los enlaces abren sitios externos.</p>
      <div class="rejilla dos">
        ${D.RECURSOS.map((r) => `<article class="tarjeta"><p class="etiqueta">${esc(r.org)}</p><h2>${esc(r.titulo)}</h2><p>${esc(r.tema)}</p><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Abrir recurso ↗</a></article>`).join('')}
      </div>
      <p class="nota">Fecha de consulta de los enlaces: 27 de octubre de 2026. Las páginas externas pueden cambiar.</p>`;
    },

    progreso() {
      const comp = L.compararDiagnosticos(estado.historial);
      const ev = (estado.evaluacion.antes && estado.evaluacion.despues) ? L.compararEvaluaciones(estado.evaluacion.antes, estado.evaluacion.despues) : null;
      return `
      <h1>📈 Mi progreso</h1>
      <h2>Historial de diagnósticos</h2>
      ${estado.historial.length ? `<div class="tabla-envoltura"><table><thead><tr><th>#</th><th>Fecha</th><th>Puntaje</th><th>Nivel</th><th>Nota</th></tr></thead><tbody>
        ${estado.historial.map((h, i) => `<tr><td>${i + 1}</td><td>${h.fecha}</td><td>${h.total}</td><td>${L.nivelDe(h.total).texto}</td><td>${esc(h.nota || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p>Aún no hay diagnósticos guardados.</p>'}
      ${comp ? `<div class="tarjeta"><h3>Primer diagnóstico vs. último</h3><p>Total: ${comp.antes} → <strong>${comp.despues}</strong> (${comp.cambio >= 0 ? '+' : ''}${comp.cambio})</p>
        <div class="comparacion">${comp.categorias.map((c) => `<div class="fila-comp"><span>${iconoCat(c.id)} ${nombreCat(c.id)}</span><div class="barras-dobles"><div class="barra"><span class="barra-relleno antes" data-ancho="${c.antes}"></span></div><div class="barra"><span class="barra-relleno nivel-bajo" data-ancho="${c.despues}"></span></div></div><span class="cambio ${c.cambio >= 0 ? 'positivo' : 'negativo'}">${c.cambio >= 0 ? '+' : ''}${c.cambio}</span></div>`).join('')}</div>
        <p class="nota"><span class="muestra antes"></span> Primero <span class="muestra despues"></span> Último</p></div>` : '<p class="nota">Repite el diagnóstico (por ejemplo, al terminar tu plan de 7 días) para ver la comparación.</p>'}
      ${estado.historial.length ? '<button class="boton secundario" type="button" data-accion="nuevo-diagnostico">🔁 Hacer un nuevo diagnóstico</button>' : ''}
      <h2>Evaluación de conocimientos</h2>
      <div class="rejilla dos">
        <div class="tarjeta c-lila"><h3>Antes</h3><p class="numero">${estado.evaluacion.antes ? estado.evaluacion.antes.porcentaje + '%' : '—'}</p>${estado.evaluacion.antes ? '' : '<a href="#/evaluacion/antes">Responder</a>'}</div>
        <div class="tarjeta c-verde"><h3>Después</h3><p class="numero">${estado.evaluacion.despues ? estado.evaluacion.despues.porcentaje + '%' : '—'}</p>${estado.evaluacion.despues ? '' : '<a href="#/evaluacion/despues">Responder</a>'}</div>
      </div>
      ${ev ? `<div class="tarjeta"><p>Cambio: <strong>${ev.cambio >= 0 ? '+' : ''}${ev.cambio} puntos porcentuales</strong>.</p>${ev.mejoraron.length ? `<p>Temas que mejoraste: ${ev.mejoraron.map(esc).join(', ')}.</p>` : ''}${ev.empeoraron.length ? `<p>Temas para repasar: ${ev.empeoraron.map(esc).join(', ')}.</p>` : ''}</div>` : ''}
      <h2>Otras actividades</h2>
      <ul class="lista"><li>Simulador: decisiones seguras ${L.calificarSimulador(estado.simulador).correctas} de ${L.calificarSimulador(estado.simulador).respondidas} respondidas.</li>
      <li>Auditoría manual: ${L.progresoAuditoria(estado.auditoria).porcentaje}% completada.</li>
      <li>Academia: ${D.MODULOS.filter((m) => estado.academia[m.id] && estado.academia[m.id].completo).length} de 6 módulos.</li></ul>`;
    },

    logros() {
      const lg = L.calcularLogros(estado);
      return `
      <h1>🏅 ${t('Mis logros')}</h1>
      <div class="tarjeta c-lila">${ficha(lg)}<p class="saldo">💰 <b>${estado.monedas || 0}</b> ${t('monedas')} · <a href="#/tienda">🛍️ ${t('Ir a la tienda')}</a></p></div>
      <h2>${t('Elige tu avatar')}</h2>
      <p class="nota">${t('Solo un personaje: no pedimos tu nombre ni tu foto.')}</p>
      <div class="avatares" role="radiogroup" aria-label="Avatar">
        ${D.AVATARES.map((a) => `<button type="button" class="avatar-opcion" role="radio" aria-checked="${a === estado.avatar}" data-avatar="${a}">${a}</button>`).join('')}
      </div>
      <h2>${t('Insignias ({a} de {b})', { a: lg.obtenidas, b: lg.insignias.length })}</h2>
      <div class="insignias">
        ${lg.insignias.map((b) => `<div class="insignia ${b.obtenida ? 'obtenida' : 'bloqueada'}"><span class="insignia-icono" aria-hidden="true">${b.obtenida ? b.icono : '🔒'}</span><strong>${esc(t(b.nombre))}</strong><small>${esc(t(b.descripcion))}</small></div>`).join('')}
      </div>
      <h2>${t('¿De dónde salen tus XP?')}</h2>
      <div class="tabla-envoltura"><table><thead><tr><th>${t('Actividad')}</th><th>XP</th></tr></thead><tbody>
        ${lg.desglose.map((d) => `<tr><td>${t(d.concepto)}</td><td>${d.xp}</td></tr>`).join('')}<tr><th>${t('Total')}</th><th>${lg.xp}</th></tr></tbody></table></div>
      <h2>${t('Niveles')}</h2>
      <ol class="niveles">${D.NIVELES.map((n) => `<li class="${n.n <= lg.nivel.n ? 'alcanzado' : ''}"><span aria-hidden="true">${n.icono}</span> <strong>${esc(nombreNivel(n))}</strong> <small>${t('desde {n} XP', { n: n.min })}</small></li>`).join('')}</ol>`;
    },

    estadisticas() {
      return `
      <h1>📊 Estadísticas escolares agregadas</h1>
      <p class="entrada">Promedios de los resultados enviados de forma anónima y voluntaria. Nunca se muestran resultados individuales.</p>
      <div class="pestanas" role="tablist">
        <button type="button" role="tab" class="pestana" data-estad="real" aria-selected="true">Datos reales</button>
        <button type="button" role="tab" class="pestana" data-estad="demo" aria-selected="false">Datos ficticios de demostración</button>
      </div>
      <div id="estad-contenido" aria-live="polite"><p>Cargando…</p></div>`;
    },

    privacidad() {
      return `
      <h1>🔒 Aviso de privacidad del prototipo</h1>
      <div class="tarjeta"><ul class="lista">
        <li><strong>Qué se guarda en tu navegador:</strong> respuestas del diagnóstico, plan, casillas de auditoría, simulador, cuestionarios, XP, insignias y avatar. Se guardan con <code>localStorage</code> y solo en este dispositivo.</li>
        <li><strong>Qué se envía al servidor:</strong> nada, salvo que marques la casilla de consentimiento en Resultados. En ese caso se envían únicamente 6 puntajes por categoría, el puntaje total y la fecha (sin hora).</li>
        <li><strong>Qué nunca se pide:</strong> nombre, correo, teléfono, contraseñas reales, fotos ni acceso a redes sociales.</li>
        <li><strong>Verificador de contraseñas:</strong> funciona solo en tu navegador y no guarda lo que escribes (solo recuerda si ya ganaste la insignia).</li>
        <li><strong>Estadísticas:</strong> solo se muestran cuando hay al menos 10 resultados, para que no se pueda deducir el resultado de una persona.</li>
      </ul></div>
      <button class="boton peligro" type="button" data-accion="borrar-datos">Borrar todos mis datos de este navegador</button>
      <p class="nota">Este aviso describe el prototipo escolar. Si la escuela usa la plataforma de forma oficial, deberá revisarlo con las autoridades escolares y la normativa de protección de datos vigente.</p>`;
    },

    noEncontrado() { return '<h1>Página no encontrada</h1><p><a href="#/inicio">Volver al inicio</a></p>'; }
  };

  function cuestionario(idForm, preguntas, respuestas, enviado, clave) {
    respuestas = respuestas || {};
    const cal = enviado ? L.calificarCuestionario(preguntas, respuestas) : null;
    return `<form class="tarjeta" id="${idForm}" data-clave="${clave}">
      ${preguntas.map((q, i) => `<fieldset class="pregunta-quiz"><legend><strong>${i + 1}. ${esc(q.p)}</strong></legend>
        ${q.o.map((o, k) => `<label class="opcion ${enviado ? (k === q.c ? 'correcta' : (Number(respuestas[i]) === k ? 'incorrecta' : '')) : ''}"><input type="radio" name="q${i}" value="${k}" ${Number(respuestas[i]) === k && respuestas[i] !== undefined ? 'checked' : ''} ${enviado ? 'disabled' : ''}> <span>${esc(o)}</span></label>`).join('')}
      </fieldset>`).join('')}
      ${enviado ? `<p class="exito" role="status">Resultado: ${cal.correctas} de ${cal.total} correctas (${cal.porcentaje}%) ${cal.porcentaje === 100 ? '🌟' : ''}</p><button type="button" class="boton secundario" data-accion="repetir-cuestionario">Repetir</button>` : '<p class="error" id="error-quiz" role="alert" hidden>Contesta todas las preguntas antes de enviar.</p><button type="submit" class="boton">Calificar ✔</button>'}
    </form>`;
  }

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin acceso */ } }

  /* ---------- Estadísticas (servidor Flask) ---------- */
  async function cargarEstadisticas(modo) {
    const caja = $('#estad-contenido');
    if (!caja) return;
    caja.innerHTML = '<p>Cargando…</p>';
    try {
      const r = await fetch('/api/estadisticas?modo=' + encodeURIComponent(modo), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const e = await r.json();
      if (!e.suficientes) {
        caja.innerHTML = `<div class="tarjeta"><p>Hay <strong>${e.participaciones}</strong> resultados enviados. Las estadísticas se muestran a partir de <strong>${e.minimo}</strong> para proteger la privacidad de cada estudiante.</p></div>`;
        return;
      }
      caja.innerHTML = `
        ${modo === 'demo' ? '<div class="alerta info">🎭 <strong>DATOS FICTICIOS</strong> generados automáticamente para la demostración. No representan a estudiantes reales.</div>' : ''}
        <div class="rejilla tres"><div class="tarjeta c-rosa"><h3>Participaciones</h3><p class="numero">${e.participaciones}</p></div>
        <div class="tarjeta c-azul"><h3>Promedio general</h3><p class="numero">${e.promedio_total}</p></div>
        <div class="tarjeta c-amarillo"><h3>Categoría a reforzar</h3><p class="numero pequeno-num">${iconoCat(e.categoria_mas_baja)} ${nombreCat(e.categoria_mas_baja)}</p></div></div>
        <div class="tarjeta"><h3>Promedio por categoría</h3>${D.CATEGORIAS.map((c) => `<div class="fila-comp"><span>${c.icono} ${c.nombre}</span>${barra(e.categorias[c.id], L.nivelDe(e.categorias[c.id]).id)}<span>${e.categorias[c.id]}</span></div>`).join('')}</div>
        <div class="tarjeta"><h3>Distribución por nivel</h3><ul class="lista"><li>Riesgo alto: ${e.niveles.alto}%</li><li>Riesgo medio: ${e.niveles.medio}%</li><li>Buenas prácticas: ${e.niveles.bajo}%</li></ul></div>`;
      aplicarAnchos(caja);
    } catch (err) {
      caja.innerHTML = '<div class="alerta">No se pudo conectar con el servidor de estadísticas. Esta sección necesita ejecutar la aplicación con Flask (ver README). El resto de la plataforma funciona sin servidor.</div>';
    }
  }

  async function compartirResultado() {
    if (!$('#consentimiento') || !$('#consentimiento').checked) { aviso('Marca la casilla de consentimiento para enviar.'); return; }
    const diag = L.calcularDiagnostico(estado.respuestas);
    const categorias = {}; diag.categorias.forEach((c) => { categorias[c.id] = c.puntaje; });
    try {
      const r = await fetch('/api/resultados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total: diag.total, categorias, demo: modoDemo }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'HTTP ' + r.status);
      estado.compartidos = (estado.compartidos || []).concat('diag-' + estado.historial.length);
      guardar(true); aviso(modoDemo ? 'Enviado como dato FICTICIO de demostración.' : 'Gracias. Tus puntajes se enviaron de forma anónima.'); render();
    } catch (err) { aviso('No se pudo enviar: ' + err.message + '. ¿Está corriendo el servidor Flask?'); }
  }

  /* ---------- Enrutador ---------- */
  const MENU = [['#/inicio', '🏠', 'Inicio'], ['#/modos', '🕹️', 'Modos'], ['#/jugar', '🎮', 'Aventura'], ['#/sala', '🎟️', 'Salas'], ['#/colegio', '🏫', 'Colegio'], ['#/tienda', '🛍️', 'Tienda'], ['#/docente', '📋', 'Docente'], ['#/instalar', '📲', 'Instalar'], ['#/panel', '🗺️', 'Mi base'], ['#/diagnostico', '🧭', 'Escaneo'], ['#/plan', '🗓️', 'Plan'], ['#/contrasenas', '🔑', 'Contraseñas'], ['#/auditoria', '✅', 'Auditoría'], ['#/simulador', '💬', 'Simulador'], ['#/academia', '🎓', 'Academia'], ['#/emergencia', '🆘', 'Emergencia'], ['#/recursos', '📚', 'Recursos'], ['#/progreso', '📈', 'Progreso'], ['#/logros', '🏅', 'Logros'], ['#/estadisticas', '📊', 'Estadísticas'], ['#/proyecto', 'ℹ️', 'Proyecto']];

  function actualizarCabecera() {
    $('#banda-demo').hidden = !modoDemo;
    const b = $('#boton-demo');
    b.textContent = modoDemo ? t('Salir de demostración') : t('Modo demostración');
    b.dataset.accion = modoDemo ? 'salir-demo' : 'demo';
    const s = $('#boton-sonido');
    if (s) { s.textContent = J.sonidoActivo() ? '🔊' : '🔇'; s.setAttribute('aria-pressed', String(!J.sonidoActivo())); }
    const lg = previo;
    $('#chip-xp').innerHTML = `<span class="avatar-mini" aria-hidden="true">${estado.avatar}</span><span><strong>${lg.xp} XP</strong><small>${t('Nivel {n}', { n: lg.nivel.n })} ${lg.nivel.icono} · 💰 ${estado.monedas || 0}</small></span>`;
    $('#chip-xp').setAttribute('aria-label', t('{xp} puntos de experiencia, nivel {n}: {nombre}. Ver mis logros', { xp: lg.xp, n: lg.nivel.n, nombre: nombreNivel(lg.nivel) }));
    const bt = $('#boton-tema'), oscuro = document.documentElement.dataset.tema === 'oscuro';
    if (bt) { bt.textContent = oscuro ? '☀️' : '🌙'; bt.setAttribute('aria-label', oscuro ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro')); }
    if (s) s.setAttribute('aria-label', J.sonidoActivo() ? t('Silenciar efectos de sonido') : t('Activar efectos de sonido'));
    const bm = $('#boton-musica');
    if (bm) { bm.classList.toggle('apagado', !J.musicaActiva()); bm.setAttribute('aria-pressed', String(J.musicaActiva())); bm.setAttribute('aria-label', J.musicaActiva() ? t('Apagar la música') : t('Encender la música')); }
  }

  /* Guarda el mejor resultado de cada mundo (estrellas y puntos). La XP se recalcula desde aquí. */
  let antesDelCofre = null;
  function resultadoAventura(r) {
    if (!r.completado) return;
    const anterior = estado.aventura[r.mundo] || { estrellas: 0, mejor: 0 };
    estado.aventura[r.mundo] = { estrellas: Math.max(anterior.estrellas, r.estrellas), mejor: Math.max(anterior.mejor, r.puntos) };
    estado.monedas = (estado.monedas || 0) + Math.max(0, r.estrellas - anterior.estrellas) * L.MONEDAS.estrellaAventura;
    estado.racha = L.actualizarRacha(estado.racha, hoy());
    antesDelCofre = previo;
    guardar(true);   // se guarda en silencio; la celebración llega al abrir el cofre
  }
  function abrirCofre(estrellas) {
    if (antesDelCofre) { celebrar(antesDelCofre, previo); antesDelCofre = null; }
    if (estrellas >= 3) confeti(60);
    if (estado.racha && estado.racha.nueva) aviso(t('🔥 Racha: {n} día(s)', { n: estado.racha.dias }), 'insignia');
  }

  /* ---------- Puente para los modos de juego (salas.js, modos.js, escape.js, escuela.js, docente.js) ---------- */
  const zonaModos = () => { estado.modos = estado.modos || {}; return estado.modos; };
  function darMonedas(n) { estado.monedas = (estado.monedas || 0) + n; }
  P.app = {
    estado: () => estado,
    guardar, aviso, confeti, render, aplicarAnchos,
    logros: () => previo,
    avatarActual: () => L.avatarActual(estado),
    recompensaSala(codigo, modo, yo, jugadores) {
      const m = zonaModos();
      m.cobradas = m.cobradas || {};
      if (m.cobradas[codigo]) return null;
      const r = L.monedasSala(yo.aciertos || 0, yo.posicion, jugadores);
      m.cobradas[codigo] = true;
      m.salas = m.salas || { partidas: 0, podios: 0 };
      m.salas.partidas++;
      if (r.podio) m.salas.podios++;
      darMonedas(r.monedas);
      estado.racha = L.actualizarRacha(estado.racha, hoy());
      guardar();
      return r;
    },
    registrarCaso(id, r) {
      const m = zonaModos();
      m.casos = m.casos || {};
      const antes = m.casos[id] || { mejor: 0, perfecto: false };
      r.monedas = Math.round(Math.max(0, r.puntos - antes.mejor) / 25);
      m.casos[id] = { mejor: Math.max(antes.mejor, r.puntos), perfecto: antes.perfecto || r.perfecto };
      darMonedas(r.monedas);
      estado.racha = L.actualizarRacha(estado.racha, hoy());
      guardar();
    },
    registrarCortafuegos(puntos) {
      const m = zonaModos();
      m.cortafuegos = m.cortafuegos || { mejor: 0 };
      const record = puntos > m.cortafuegos.mejor;
      m.cortafuegos.mejor = Math.max(m.cortafuegos.mejor, puntos);
      const monedas = L.monedasCortafuegos(puntos);
      darMonedas(monedas);
      guardar();
      return { record, mejor: m.cortafuegos.mejor, monedas };
    },
    registrarRelevo() {
      const m = zonaModos();
      m.relevos = (m.relevos || 0) + 1;
      darMonedas(L.MONEDAS.relevo);
      guardar();
      return { monedas: L.MONEDAS.relevo };
    },
    registrarEscape(id, estrellas) {
      const m = zonaModos();
      m.escape = m.escape || {};
      const antes = m.escape[id] ? m.escape[id].estrellas : 0;
      m.escape[id] = { estrellas: Math.max(antes, estrellas) };
      const monedas = Math.max(0, estrellas - antes) * L.MONEDAS.estrellaEscape;
      darMonedas(monedas);
      estado.racha = L.actualizarRacha(estado.racha, hoy());
      guardar();
      return { estrellas, monedas };
    },
    registrarNpc(id) {
      const m = zonaModos();
      m.colegio = m.colegio || { npc: {}, monedas: [] };
      const nuevo = !m.colegio.npc[id];
      m.colegio.npc[id] = true;
      if (nuevo) darMonedas(L.MONEDAS.npc);
      guardar();
      return { monedas: nuevo ? L.MONEDAS.npc : 0, todos: nuevo && Object.keys(m.colegio.npc).length >= (D.TOTAL_NPC || 8) };
    },
    registrarMonedaColegio(clave) {
      const m = zonaModos();
      m.colegio = m.colegio || { npc: {}, monedas: [] };
      if (m.colegio.monedas.includes(clave)) return;
      m.colegio.monedas.push(clave);
      darMonedas(L.MONEDAS.monedaMapa);
      guardar(true);
    }
  };

  let vistaActiva = null;   // modo de juego montado: se desmonta al salir para detener relojes y sondeos
  function render() {
    J.detener();
    if (vistaActiva) { if (vistaActiva.def.desmontar) vistaActiva.def.desmontar(vistaActiva.cont); vistaActiva = null; }
    const ruta = (location.hash || '#/inicio').replace(/^#\//, '').split('/');
    const [vista, param] = ruta;
    const modo = P.vistas[vista];
    J.musica(modo ? (modo.musica || null) : vista === 'inicio' || vista === 'jugar' ? 'aventura' : null);   // la música solo suena en el juego
    let html;
    if (modo) html = modo.html(param);
    else if (vista === 'academia' && param) html = VISTAS.modulo(param);
    else if (vista === 'jugar') html = VISTAS.jugar(param);
    else if (vista === 'evaluacion') html = VISTAS.evaluacion(param);
    else if (VISTAS[vista] && vista !== 'modulo' && vista !== 'noEncontrado') html = VISTAS[vista]();
    else html = VISTAS.noEncontrado();
    const main = $('#contenido');
    const traducidas = ['inicio', 'jugar', 'logros'];
    main.innerHTML = (I.idioma() !== 'es' && !traducidas.includes(vista) && !(modo && modo.traducida) ? `<p class="alerta info">${t('🌐 Esta sección todavía está solo en español. Los modos de juego sí están en tu idioma.')}</p>` : '') + html;
    aplicarAnchos(main);
    if (modo && modo.montar) {
      const cont = main.querySelector('#zona-modo') || main;
      vistaActiva = { def: modo, cont };
      modo.montar(cont, param);
    }
    const actual = '#/' + vista;
    $$('#menu a').forEach((a) => { if (a.getAttribute('href') === actual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#menu').classList.remove('abierto'); $('#boton-menu').setAttribute('aria-expanded', 'false');
    const mas = $('.menu-mas'); if (mas) mas.open = false;
    document.body.classList.toggle('inmersivo', vista === 'colegio' || vista === 'cortafuegos');
    document.title = t((MENU.find((m) => m[0] === actual) || [0, 0, 'PRIVACIDAD 360'])[2]) + ' · PRIVACIDAD 360';
    if (vista === 'estadisticas') cargarEstadisticas('real');
    if (vista === 'jugar' && $('#zona-juego')) {
      J.iniciar($('#zona-juego'), param, { alTerminar: resultadoAventura, alAbrirCofre: abrirCofre, leerPrevio: () => estado.aventura[param] || null });
    }
    actualizarCabecera();
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-accion], [data-escenario], [data-estad], [data-avatar]');
    if (!el) return;
    if (el.dataset.escenario) {
      estado.simulador[el.dataset.escenario] = Number(el.dataset.opcion);
      simRetro = el.dataset.escenario;
      guardar(); render();
      const t = document.getElementById('esc-' + simRetro); if (t) t.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (el.dataset.estad) {
      $$('[data-estad]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
      cargarEstadisticas(el.dataset.estad); return;
    }
    if (el.dataset.avatar) { estado.avatar = el.dataset.avatar; guardar(true); render(); return; }
    const a = el.dataset.accion;
    const form = el.closest('form');
    switch (a) {
      case 'demo': activarDemo(); break;
      case 'salir-demo': salirDemo(); break;
      case 'anterior': sessionStorageSet('p360_pregunta', Math.max(0, Number(form.dataset.indice) - 1)); render(); break;
      case 'terminar': {
        guardarRespuestaActual(form, true);
        const diag = L.calcularDiagnostico(estado.respuestas);
        if (!diag.completo) { aviso('Faltan preguntas por contestar.'); return; }
        estado.historial.push(registroHistorial(diag, modoDemo ? 'Diagnóstico de la demostración (ficticio)' : ''));
        reiniciarPlan(); guardar(); sessionStorageSet('p360_pregunta', 0);
        location.hash = '#/resultados'; break;
      }
      case 'rellenar-demo':
        estado.respuestas = Object.assign({}, D.PERFIL_DEMO.respuestas);
        guardar(true); sessionStorageSet('p360_pregunta', D.PREGUNTAS.length - 1); render(); break;
      case 'nuevo-diagnostico': estado.respuestas = {}; guardar(true); sessionStorageSet('p360_pregunta', 0); location.hash = '#/diagnostico'; break;
      case 'compartir': compartirResultado(); break;
      case 'regenerar-plan': reiniciarPlan(); guardar(true); render(); break;
      case 'siguiente-situacion': simRetro = null; render(); window.scrollTo(0, 0); break;
      case 'reiniciar-simulador': estado.simulador = {}; simRetro = null; guardar(true); render(); break;
      case 'repetir-cuestionario': {
        const clave = form.dataset.clave;
        if (form.id === 'form-modulo') delete estado.academia[clave]; else delete estado.evaluacion[clave];
        guardar(true); render(); break;
      }
      case 'ver-clave': {
        const inp = $('#clave'); const ver = inp.type === 'password';
        inp.type = ver ? 'text' : 'password'; el.textContent = ver ? 'Ocultar' : 'Mostrar'; el.setAttribute('aria-pressed', String(ver)); break;
      }
      case 'cerrar-modal': $('#modal').close(); break;
      case 'sonido': J.alternarSonido(); actualizarCabecera(); break;
      case 'musica': J.alternarMusica(); actualizarCabecera(); break;
      case 'sin-tiempo': J.alternarTiempo(); render(); break;
      case 'seguir-escaneo': sessionStorageSet('p360_zona', ''); render(); break;
      case 'tema': aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro', true); break;
      case 'borrar-datos':
        if (confirm('¿Borrar todos tus datos de PRIVACIDAD 360 en este navegador? Esta acción no se puede deshacer.')) {
          try { localStorage.removeItem(CLAVE_REAL); localStorage.removeItem(CLAVE_DEMO); localStorage.removeItem(CLAVE_MODO); } catch (e) { /* sin acceso */ }
          modoDemo = false; estado = vacio(); previo = L.calcularLogros(estado); aviso('Se borraron tus datos.'); location.hash = '#/inicio'; render();
        }
        break;
      case 'menu': {
        const abierto = $('#menu').classList.toggle('abierto');
        el.setAttribute('aria-expanded', String(abierto)); break;
      }
    }
  });

  /* Al terminar todas las preguntas de una categoría se muestra una pausa de «zona completada». */
  function marcarZona(i) {
    const actual = D.PREGUNTAS[i], siguiente = D.PREGUNTAS[i + 1];
    if (siguiente && siguiente.cat !== actual.cat) { sessionStorageSet('p360_zona', actual.cat); J.SFX.victoria(); }
  }

  function guardarRespuestaActual(form, silencioso) {
    const sel = form && form.querySelector('input[name="op"]:checked');
    if (sel) { estado.respuestas[D.PREGUNTAS[Number(form.dataset.indice)].id] = Number(sel.value); guardar(silencioso); }
    return !!sel;
  }

  document.addEventListener('submit', (ev) => {
    const form = ev.target;
    ev.preventDefault();
    if (form.id === 'form-pregunta') {
      if (!guardarRespuestaActual(form, true)) { aviso('Elige una opción para continuar.'); return; }
      sessionStorageSet('p360_pregunta', Number(form.dataset.indice) + 1); marcarZona(Number(form.dataset.indice)); render();
      const h = $('#contenido h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      return;
    }
    if (form.id === 'form-modulo' || form.id === 'form-evaluacion') {
      const clave = form.dataset.clave;
      const preguntas = form.id === 'form-modulo' ? D.MODULOS.find((m) => m.id === clave).quiz : D.EVALUACION[clave];
      const respuestas = {};
      preguntas.forEach((_, i) => { const s = form.querySelector(`input[name="q${i}"]:checked`); if (s) respuestas[i] = Number(s.value); });
      const cal = L.calificarCuestionario(preguntas, respuestas);
      if (!cal.completo) { $('#error-quiz', form).hidden = false; return; }
      const registro = Object.assign({ respuestas, fecha: hoy() }, cal);
      if (form.id === 'form-modulo') estado.academia[clave] = registro; else estado.evaluacion[clave] = registro;
      guardar(); render();
    }
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.name === 'op') {
      const form = el.closest('form');
      const i = Number(form.dataset.indice);
      estado.respuestas[D.PREGUNTAS[i].id] = Number(el.value); guardar(true);
      J.SFX.clic();
      if (i === D.PREGUNTAS.length - 1) { render(); const s = $('input[name="op"]:checked'); if (s) s.focus(); }
      else {
        // Avanza solo, con una pequeña animación, si nadie cambió de pregunta mientras tanto
        form.classList.add('escaneando');
        setTimeout(() => {
          const actual = $('#form-pregunta');
          if (actual && Number(actual.dataset.indice) === i) { sessionStorageSet('p360_pregunta', i + 1); marcarZona(i); render(); }
        }, 380);
      }
    } else if (el.dataset.dia !== undefined) { estado.plan[Number(el.dataset.dia)].hecho = el.checked; guardar(); render(); }
    else if (el.dataset.auditoria) {
      const p = el.dataset.auditoria; estado.auditoria[p] = estado.auditoria[p] || {};
      estado.auditoria[p][el.dataset.item] = el.checked; guardar(); render();
    }
  });

  /* Guías de emergencia: se cuentan como leídas al abrirlas */
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (d.dataset && d.dataset.guia && d.open && !estado.guias[d.dataset.guia]) { estado.guias[d.dataset.guia] = true; guardar(); }
  }, true);

  document.addEventListener('input', (ev) => {
    if (ev.target.id !== 'clave') return;
    const r = L.evaluarContrasena(ev.target.value);
    const nivel = ['alto', 'alto', 'medio', 'bajo', 'bajo'][r.puntaje];
    $('#resultado-clave').innerHTML = !r.largo ? '' : `
      <div class="medidor-clave">${[0, 1, 2, 3, 4].map((k) => `<span class="segmento ${k <= r.puntaje ? 'nivel-' + nivel : ''}"></span>`).join('')}</div>
      <p><strong>${r.etiqueta}</strong> · ${r.largo} caracteres · ${r.tipos} tipo(s) de caracteres</p>
      ${r.hallazgos.length ? `<h3>Lo que encontramos</h3><ul class="lista">${r.hallazgos.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      <h3>Sugerencias</h3><ul class="lista">${r.sugerencias.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
    // Solo se guarda que se logró el reto (verdadero/falso), nunca la contraseña.
    if (r.puntaje >= 3 && !(estado.retos && estado.retos.claveFuerte)) { estado.retos = Object.assign({}, estado.retos, { claveFuerte: true }); guardar(); }
  });

  window.addEventListener('hashchange', () => { simRetro = null; render(); window.scrollTo(0, 0); });

  /* Menú, textos fijos, idioma y tema */
  function construirMenu() {
    // A la vista, lo del juego; lo demás, dentro de «Más» para que la barra no le quite espacio a la partida.
    const PRINCIPALES = ['#/inicio', '#/modos', '#/jugar', '#/sala', '#/tienda', '#/logros', '#/docente', '#/instalar'];
    const enlace = (m) => `<a href="${m[0]}"><span aria-hidden="true">${m[1]}</span> ${t(m[2])}</a>`;
    $('#menu').innerHTML = MENU.filter((m) => PRINCIPALES.includes(m[0])).map(enlace).join('')
      + `<details class="menu-mas"><summary><span aria-hidden="true">➕</span> ${t('Más')}</summary><div class="menu-mas-lista">${MENU.filter((m) => !PRINCIPALES.includes(m[0])).map(enlace).join('')}${enlace(['#/privacidad', '🔒', 'Privacidad'])}</div></details>`;
    $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    $$('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
    $('#idioma').value = I.idioma();
  }
  function aplicarTema(tema, guardarPreferencia) {
    document.documentElement.dataset.tema = tema;
    if (guardarPreferencia) escribirLS('p360_tema', tema);
    const meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#1E1828' : '#F8D0E0');
    actualizarCabecera();
  }
  $('#idioma').addEventListener('change', (ev) => { I.cambiar(ev.target.value); construirMenu(); render(); });
  I.cambiar(I.idioma());
  aplicarTema(leerLS('p360_tema') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'), false);
  construirMenu();
  render();
})();
