/* PRIVACIDAD 360 — Modo docente: crear partidas con preguntas propias, organizar actividades y ver estadísticas generales.
   Necesita el servidor. Se entra con una clave generada al azar (nunca una contraseña real) y solo muestra datos agregados:
   no existe ninguna vista por estudiante, porque el servidor no guarda apodos. */
(function () {
  'use strict';
  const P = window.P360;
  const J = window.P360_JUEGO;
  const { esc, tx, t, api } = P;
  const CLAVE = 'p360_docente';
  const TEMAS = { contrasenas: 'Contraseñas', phishing: 'Phishing', redes: 'Redes sociales', imagenes: 'Imágenes', bullying: 'Bullying', ciberbullying: 'Ciberbullying', denuncia: 'Denuncia segura', exclusion: 'Exclusión', discriminacion: 'Discriminación', propia: 'Pregunta del docente' };
  const ESTADOS = { borrador: '📝 Borrador', lista: '✅ Lista', realizada: '🏁 Realizada' };

  let cont = null, pestana = 'actividades', actividades = [], edicion = null, casos = [];
  const leerClave = () => { try { return sessionStorage.getItem(CLAVE); } catch (e) { return null; } };
  const guardarClave = (c) => { try { if (c) sessionStorage.setItem(CLAVE, c); else sessionStorage.removeItem(CLAVE); } catch (e) { /* sin acceso */ } };
  const llamar = (ruta, o = {}) => api(ruta, Object.assign({}, o, { cabeceras: Object.assign({ 'X-P360-Docente': leerClave() || '' }, o.cabeceras) }));
  const nombreModo = (m) => (m === 'arena' ? `🏟️ ${t('Arena Relámpago')}` : `🕵️ ${t('Detectives del Mirador')}`);

  function error(e) {
    if (e.codigo === 401) { guardarClave(null); pantallaAcceso(e.message); return; }
    P.app.aviso(e.message);
    J.SFX.mal();
  }

  /* ---------- Acceso ---------- */
  function pantallaAcceso(mensaje, claveNueva) {
    cont.innerHTML = `
    <section class="modo-cabecera c-docente">
      <p class="etiqueta">📋 ${t('Modo docente')}</p>
      <h1>${t('Panel de actividades')}</h1>
      <p>${t('Crea partidas, organiza actividades y mira estadísticas del grupo.')}</p>
    </section>
    ${mensaje ? `<p class="alerta" role="alert">${esc(mensaje)}</p>` : ''}
    ${claveNueva ? `<div class="tarjeta c-amarillo centro-texto" id="clave-nueva">
      <h2>🔑 ${t('Tu clave de docente')}</h2>
      <p class="codigo-clave" id="valor-clave">${esc(claveNueva)}</p>
      <p><strong>${t('Guárdala ahora: no se puede volver a mostrar.')}</strong> ${t('Sin ella no podrás entrar a tus actividades.')}</p>
      <div class="acciones centro"><button class="boton secundario" type="button" data-doc="copiar">📋 ${t('Copiar')}</button><button class="boton-juego" type="button" data-doc="continuar">➡ ${t('Ya la guardé, entrar')}</button></div>
    </div>` : `
    <div class="rejilla-dos">
      <form id="doc-entrar" class="tarjeta tarjeta-juego" autocomplete="off">
        <h2>🔑 ${t('Ya tengo clave')}</h2>
        <label for="doc-clave">${t('Clave de docente')}</label>
        <input id="doc-clave" required spellcheck="false" autocapitalize="characters" placeholder="P360-XXXX-XXXX-XXXX" maxlength="30">
        <button class="boton-juego" type="submit">➡ ${t('Entrar')}</button>
      </form>
      <div class="tarjeta tarjeta-juego">
        <h2>✨ ${t('Soy nuevo')}</h2>
        <p>${t('El sistema te genera una clave al azar. Así nunca tienes que crear ni escribir una contraseña real.')}</p>
        <button class="boton-juego" type="button" data-doc="nueva-clave">🔑 ${t('Generar mi clave')}</button>
      </div>
    </div>`}`;
    if (P.conexion === false) { /* el formulario informa el error al usarse */ }
  }

  async function entrar() {
    pestana = 'actividades';
    try {
      const r = await llamar('/api/docente/actividades');
      actividades = r.actividades;
      if (!casos.length) casos = await P.datos('casos').catch(() => []);
      pintar();
    } catch (e) {
      if (e.sinConexion) { pantallaAcceso(t('No hay conexión con el servidor. El modo docente lo necesita porque ahí se guardan las actividades.')); return; }
      error(e);
    }
  }

  /* ---------- Panel ---------- */
  function pintar() {
    const tabs = [['actividades', '🗂️', t('Actividades')], ['nueva', '✏️', edicion && edicion.id ? t('Editar actividad') : t('Nueva actividad')], ['estadisticas', '📊', t('Estadísticas')]];
    cont.innerHTML = `
    <section class="modo-cabecera c-docente">
      <h1>📋 ${t('Panel de actividades')}</h1>
      <div class="pestanas" role="tablist">${tabs.map(([id, i, n]) => `<button type="button" role="tab" aria-selected="${pestana === id}" class="boton ${pestana === id ? '' : 'secundario'} pequeno" data-doc="pestana" data-id="${id}">${i} ${n}</button>`).join('')}<button type="button" class="boton secundario pequeno" data-doc="salir">🚪 ${t('Cerrar sesión')}</button></div>
    </section>
    <div id="doc-cuerpo"></div>`;
    const c = cont.querySelector('#doc-cuerpo');
    if (pestana === 'actividades') c.innerHTML = htmlActividades();
    if (pestana === 'nueva') c.innerHTML = htmlFormulario();
    if (pestana === 'estadisticas') { c.innerHTML = `<p class="cargando">${t('Cargando…')}</p>`; cargarEstadisticas(c); }
  }

  function htmlActividades() {
    if (!actividades.length) return `<div class="tarjeta centro-texto" id="sin-actividades"><p>${t('Todavía no tienes actividades.')}</p><button class="boton-juego" type="button" data-doc="pestana" data-id="nueva">✏️ ${t('Crear la primera')}</button></div>`;
    return `<ul class="lista-actividades">${actividades.map((a) => `
      <li class="tarjeta actividad estado-${a.estado}" data-actividad="${a.id}">
        <div>
          <h3>${esc(a.titulo)}</h3>
          <p class="nota">${nombreModo(a.modo)}${a.grupo ? ` · 👥 ${esc(a.grupo)}` : ''}${a.fecha ? ` · 📅 ${esc(a.fecha)}` : ''} · ${t(ESTADOS[a.estado])}</p>
          <p class="nota">${a.preguntas.length ? t('{n} preguntas propias', { n: a.preguntas.length }) : t('Usa el banco de PRIVACIDAD 360')}</p>
        </div>
        <div class="acciones">
          <button class="boton-juego" type="button" data-doc="lanzar" data-id="${a.id}">▶ ${t('Abrir sala')}</button>
          <button class="boton secundario pequeno" type="button" data-doc="editar" data-id="${a.id}">✏️ ${t('Editar')}</button>
          <button class="boton secundario pequeno" type="button" data-doc="duplicar" data-id="${a.id}">📄 ${t('Duplicar')}</button>
          <button class="boton secundario pequeno" type="button" data-doc="borrar" data-id="${a.id}">🗑️ ${t('Borrar')}</button>
        </div>
      </li>`).join('')}</ul>`;
  }

  /* ---------- Formulario ---------- */
  function preguntaVacia() { return { p: '', o: ['', '', '', ''], c: 0, e: '' }; }
  function htmlFormulario() {
    const a = edicion || { titulo: '', modo: 'arena', grupo: '', fecha: '', estado: 'lista', opciones: { segundos: 20, rondas: 8, equipos: 0, automatico: false }, preguntas: [] };
    edicion = a;
    const o = a.opciones || {};
    const arena = a.modo === 'arena';
    return `
    <form id="doc-form" class="tarjeta tarjeta-juego" autocomplete="off">
      <label for="f-titulo">${t('Título de la actividad')}</label>
      <input id="f-titulo" maxlength="80" required value="${esc(a.titulo)}" placeholder="${t('Ej.: Repaso de phishing')}">
      <div class="fila-campos">
        <label>${t('Juego')} <select id="f-modo"><option value="arena" ${arena ? 'selected' : ''}>${t('Arena Relámpago')}</option><option value="detectives" ${arena ? '' : 'selected'}>${t('Detectives del Mirador')}</option></select></label>
        <label>${t('Grupo')} <input id="f-grupo" maxlength="40" value="${esc(a.grupo)}" placeholder="2.º B"></label>
        <label>${t('Fecha')} <input id="f-fecha" type="date" value="${esc(a.fecha)}"></label>
        <label>${t('Estado')} <select id="f-estado">${Object.keys(ESTADOS).map((k) => `<option value="${k}" ${a.estado === k ? 'selected' : ''}>${t(ESTADOS[k])}</option>`).join('')}</select></label>
      </div>
      <p class="nota">🔒 ${t('Escribe el grupo, nunca nombres de estudiantes.')}</p>
      <div class="fila-campos">
        <label>${t('Segundos')} <input id="f-segundos" type="number" min="${arena ? 10 : 30}" max="${arena ? 90 : 240}" value="${o.segundos || (arena ? 20 : 90)}"></label>
        ${!a.preguntas.length || !arena ? `<label>${t('Rondas')} <input id="f-rondas" type="number" min="${arena ? 3 : 1}" max="${arena ? 20 : 6}" value="${o.rondas || (arena ? 8 : 2)}"></label>` : ''}
        ${arena ? `<label>${t('Equipos')} <select id="f-equipos">${[0, 2, 3, 4].map((n) => `<option value="${n}" ${Number(o.equipos || 0) === n ? 'selected' : ''}>${n || t('Sin equipos')}</option>`).join('')}</select></label>` : ''}
      </div>
      <label class="casilla"><input type="checkbox" id="f-auto" ${o.automatico ? 'checked' : ''}> ${t('Avanzar solo entre rondas')}</label>
      ${arena ? `
        <fieldset class="elige-temas"><legend>${t('Temas del banco (si no agregas preguntas propias)')}</legend>
          ${Object.keys(TEMAS).filter((k) => !['exclusion', 'discriminacion', 'propia'].includes(k)).map((k) => `<label class="casilla"><input type="checkbox" name="tema" value="${k}" ${(o.temas || []).includes(k) ? 'checked' : ''}> ${t(TEMAS[k])}</label>`).join('')}
        </fieldset>
        <h3>📝 ${t('Preguntas propias')} (${a.preguntas.length})</h3>
        <div id="f-preguntas">${a.preguntas.map(htmlPregunta).join('')}</div>
        <button class="boton secundario" type="button" data-doc="agregar-pregunta">➕ ${t('Agregar pregunta')}</button>`
      : `<fieldset class="elige-temas"><legend>${t('Casos (si no eliges, se sortean)')}</legend>
          ${casos.map((c) => `<label class="casilla"><input type="checkbox" name="caso" value="${c.id}" ${(o.casos || []).includes(c.id) ? 'checked' : ''}> ${esc(tx(c).titulo)}</label>`).join('')}
        </fieldset>`}
      <p class="error-sala" role="alert" hidden></p>
      <div class="acciones"><button class="boton-juego" type="submit">💾 ${t('Guardar actividad')}</button><button class="boton secundario" type="button" data-doc="cancelar">${t('Cancelar')}</button></div>
    </form>`;
  }
  function htmlPregunta(q, i) {
    return `<fieldset class="pregunta-propia" data-q="${i}">
      <legend>${t('Pregunta {n}', { n: i + 1 })}</legend>
      <label>${t('Texto de la pregunta')} <input class="q-texto" maxlength="200" required value="${esc(q.p)}"></label>
      ${[0, 1, 2, 3].map((k) => `<div class="fila-entrada"><label class="casilla" title="${t('Marca la correcta')}"><input type="radio" name="correcta-${i}" value="${k}" ${q.c === k ? 'checked' : ''} aria-label="${t('Opción {n} es la correcta', { n: k + 1 })}"></label><input class="q-op" maxlength="100" aria-label="${t('Opción {n}', { n: k + 1 })}" placeholder="${t('Opción {n}', { n: k + 1 })}${k < 2 ? '' : ' (' + t('opcional') + ')'}" value="${esc(q.o[k] || '')}" ${k < 2 ? 'required' : ''}></div>`).join('')}
      <label>${t('Explicación (opcional)')} <input class="q-exp" maxlength="200" value="${esc(q.e || '')}"></label>
      <button class="boton secundario pequeno" type="button" data-doc="quitar-pregunta" data-i="${i}">🗑️ ${t('Quitar')}</button>
    </fieldset>`;
  }
  /* Lee lo escrito para no perderlo al volver a dibujar el formulario. */
  function leerFormulario() {
    const f = cont.querySelector('#doc-form');
    if (!f) return edicion;
    const v = (s) => { const e = f.querySelector(s); return e ? e.value : undefined; };
    const modo = v('#f-modo');
    const preguntas = Array.from(f.querySelectorAll('.pregunta-propia')).map((q, i) => {
      const crudas = Array.from(q.querySelectorAll('.q-op')).map((x) => x.value);
      const marcada = q.querySelector(`input[name="correcta-${i}"]:checked`);
      return { p: q.querySelector('.q-texto').value, o: crudas, c: marcada ? Number(marcada.value) : 0, e: q.querySelector('.q-exp').value };
    });
    const opciones = { segundos: Number(v('#f-segundos')), automatico: f.querySelector('#f-auto').checked };
    if (v('#f-rondas') !== undefined) opciones.rondas = Number(v('#f-rondas'));
    if (modo === 'arena') {
      opciones.equipos = Number(v('#f-equipos') || 0);
      const temas = Array.from(f.querySelectorAll('input[name="tema"]:checked')).map((x) => x.value);
      if (temas.length) opciones.temas = temas;
    } else {
      const elegidos = Array.from(f.querySelectorAll('input[name="caso"]:checked')).map((x) => x.value);
      if (elegidos.length) opciones.casos = elegidos;
    }
    return Object.assign(edicion || {}, { titulo: v('#f-titulo'), modo, grupo: v('#f-grupo'), fecha: v('#f-fecha'), estado: v('#f-estado'), opciones, preguntas });
  }
  /* Las opciones vacías se quitan y la correcta se recalcula para que apunte a la misma respuesta. */
  function paraEnviar(a) {
    const preguntas = a.modo === 'arena' ? a.preguntas.map((q) => {
      const correcta = q.o[q.c];
      const o = q.o.map((x) => x.trim()).filter(Boolean);
      return { p: q.p, o, c: Math.max(0, o.indexOf((correcta || '').trim())), e: q.e };
    }) : [];
    const opciones = Object.assign({}, a.opciones);
    if (preguntas.length) { delete opciones.rondas; delete opciones.temas; }
    return { titulo: a.titulo, modo: a.modo, grupo: a.grupo, fecha: a.fecha, estado: a.estado, opciones, preguntas };
  }
  async function guardarActividad(f) {
    const a = leerFormulario();
    try {
      const metodo = a.id ? 'PUT' : 'POST', ruta = a.id ? `/api/docente/actividades/${a.id}` : '/api/docente/actividades';
      await llamar(ruta, { metodo, cuerpo: paraEnviar(a) });
      actividades = (await llamar('/api/docente/actividades')).actividades;
      edicion = null; pestana = 'actividades';
      J.SFX.bien();
      P.app.aviso(t('Actividad guardada.'));
      pintar();
    } catch (e) {
      if (e.codigo === 401) { error(e); return; }
      const m = f.querySelector('.error-sala');
      if (m) { m.textContent = e.message; m.hidden = false; }
      J.SFX.mal();
    }
  }

  /* ---------- Estadísticas ---------- */
  let ultimoReporte = null;
  async function cargarEstadisticas(c) {
    try {
      const e = await llamar('/api/docente/estadisticas');
      ultimoReporte = e;
      if (!c.isConnected) return;
      if (!e.partidas) { c.innerHTML = `<div class="tarjeta centro-texto" id="sin-estadisticas"><p>📭 ${t('Todavía no hay partidas terminadas. Las estadísticas aparecen cuando el grupo juega una actividad.')}</p></div>`; return; }
      const barra = (pct) => `<span class="barra-doc" role="img" aria-label="${pct}%"><span data-ancho="${pct}"></span></span>`;
      c.innerHTML = `
      <div class="rejilla-cifras" id="cifras-docente">
        <div class="tarjeta cifra"><b>${e.partidas}</b><small>${t('Partidas')}</small></div>
        <div class="tarjeta cifra"><b>${e.participaciones}</b><small>${t('Participaciones')}</small></div>
        <div class="tarjeta cifra"><b>${e.respuestas}</b><small>${t('Respuestas')}</small></div>
        <div class="tarjeta cifra"><b>${e.porcentaje}%</b><small>${t('Aciertos')}</small></div>
      </div>
      <p class="nota">🔒 ${t('Solo datos del grupo: no se guardan apodos ni resultados por persona. Un tema o pregunta se muestra con al menos {n} respuestas.', { n: e.minimo })}</p>
      <h2>${t('Temas que más cuestan')}</h2>
      ${e.porTema.length ? `<ul class="filas-doc">${e.porTema.map((x) => `<li><span>${t(TEMAS[x.tema] || x.tema)}</span>${barra(x.porcentaje)}<b>${x.porcentaje}%</b><small>${x.total}</small></li>`).join('')}</ul>` : `<p class="nota">${t('Aún no hay suficientes respuestas.')}</p>`}
      <h2>${t('Preguntas con menos aciertos')}</h2>
      ${e.porPregunta.length ? `<ul class="filas-doc">${e.porPregunta.map((x) => `<li><span>${esc(x.texto)}</span>${barra(x.porcentaje)}<b>${x.porcentaje}%</b><small>${x.total}</small></li>`).join('')}</ul>` : `<p class="nota">${t('Aún no hay suficientes respuestas.')}</p>`}
      <h2>${t('Partidas recientes')}</h2>
      <div class="tabla-envoltura"><table><thead><tr><th>${t('Fecha')}</th><th>${t('Actividad')}</th><th>${t('Juego')}</th><th>${t('Jugadores')}</th><th>${t('Aciertos')}</th></tr></thead><tbody>
        ${e.recientes.map((r) => `<tr><td>${esc(r.fecha)}</td><td>${esc(r.titulo || '—')}</td><td>${nombreModo(r.modo)}</td><td>${r.jugadores}</td><td>${r.porcentaje}%</td></tr>`).join('')}
      </tbody></table></div>
      <div class="acciones"><button class="boton secundario" type="button" data-doc="csv">⬇️ ${t('Descargar CSV')}</button></div>`;
      P.app.aplicarAnchos(c);
    } catch (e) {
      if (e.sinConexion) { c.innerHTML = `<p class="alerta">${t('No hay conexión con el servidor. El modo docente lo necesita porque ahí se guardan las actividades.')}</p>`; return; }
      error(e);
    }
  }
  function descargarCSV() {
    if (!ultimoReporte) return;
    const celda = (v) => {
      let s = String(v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;   // evita que una hoja de cálculo lo interprete como fórmula
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const filas = [['Tipo', 'Detalle', 'Respuestas o jugadores', 'Porcentaje de aciertos']];
    ultimoReporte.porTema.forEach((x) => filas.push(['Tema', t(TEMAS[x.tema] || x.tema), x.total, x.porcentaje]));
    ultimoReporte.porPregunta.forEach((x) => filas.push(['Pregunta', x.texto, x.total, x.porcentaje]));
    ultimoReporte.recientes.forEach((r) => filas.push(['Partida', `${r.fecha} ${r.titulo || r.modo}`, r.jugadores, r.porcentaje]));
    const texto = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'privacidad360_estadisticas.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Eventos ---------- */
  async function clic(ev) {
    const el = ev.target.closest('[data-doc]');
    if (!el || el.disabled) return;
    const a = el.dataset.doc, id = Number(el.dataset.id);
    const actividad = actividades.find((x) => x.id === id);
    J.SFX.clic();
    try {
      switch (a) {
        case 'nueva-clave': { const r = await api('/api/docente/clave', { metodo: 'POST' }); pantallaAcceso(null, r.clave); guardarClave(r.clave); break; }
        case 'copiar': {
          const texto = cont.querySelector('#valor-clave').textContent;
          try { await navigator.clipboard.writeText(texto); P.app.aviso(t('Clave copiada.')); }
          catch (e) { P.app.aviso(t('Selecciona la clave y cópiala a mano.')); }
          break;
        }
        case 'continuar': entrar(); break;
        case 'salir': guardarClave(null); edicion = null; pantallaAcceso(); break;
        case 'pestana': if (pestana === 'nueva') leerFormulario(); pestana = el.dataset.id; pintar(); break;
        case 'cancelar': edicion = null; pestana = 'actividades'; pintar(); break;
        case 'agregar-pregunta': leerFormulario(); edicion.preguntas.push(preguntaVacia()); pintar(); break;
        case 'quitar-pregunta': leerFormulario(); edicion.preguntas.splice(Number(el.dataset.i), 1); pintar(); break;
        case 'editar': edicion = JSON.parse(JSON.stringify(actividad)); edicion.preguntas.forEach((q) => { while (q.o.length < 4) q.o.push(''); }); pestana = 'nueva'; pintar(); window.scrollTo(0, 0); break;
        case 'duplicar': {
          const copia = JSON.parse(JSON.stringify(actividad));
          await llamar('/api/docente/actividades', { metodo: 'POST', cuerpo: { titulo: `${copia.titulo} (2)`.slice(0, 80), modo: copia.modo, grupo: copia.grupo, fecha: '', estado: 'borrador', opciones: copia.opciones, preguntas: copia.preguntas } });
          actividades = (await llamar('/api/docente/actividades')).actividades; pintar(); break;
        }
        case 'borrar':
          if (!confirm(t('¿Borrar la actividad «{a}»? Las estadísticas de partidas ya jugadas se conservan.', { a: actividad.titulo }))) return;
          await llamar(`/api/docente/actividades/${id}`, { metodo: 'DELETE' });
          actividades = actividades.filter((x) => x.id !== id); pintar(); break;
        case 'lanzar': {
          const r = await llamar(`/api/docente/actividades/${id}/lanzar`, { metodo: 'POST' });
          P.abrirSala(r.codigo, r.token);
          break;
        }
        case 'csv': descargarCSV(); break;
      }
    } catch (e) { error(e); }
  }
  function enviar(ev) {
    if (ev.target.id === 'doc-entrar') {
      ev.preventDefault();
      guardarClave(ev.target.querySelector('#doc-clave').value.trim().toUpperCase());
      entrar();
    }
    if (ev.target.id === 'doc-form') { ev.preventDefault(); guardarActividad(ev.target); }
  }
  function cambio(ev) {
    if (ev.target.id !== 'f-modo') return;
    leerFormulario();
    edicion.modo = ev.target.value;
    edicion.opciones = ev.target.value === 'arena' ? { segundos: 20, rondas: 8, equipos: 0, automatico: edicion.opciones.automatico } : { segundos: 90, rondas: 2, automatico: edicion.opciones.automatico };
    pintar();
  }

  P.registrar('docente', {
    traducida: true,
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    montar(c) {
      cont = c;
      cont.addEventListener('click', clic);
      cont.addEventListener('submit', enviar);
      cont.addEventListener('change', cambio);
      if (leerClave()) entrar(); else pantallaAcceso();
    },
    desmontar() {
      if (cont) { cont.removeEventListener('click', clic); cont.removeEventListener('submit', enviar); cont.removeEventListener('change', cambio); }
      cont = null;
    }
  });
})();
