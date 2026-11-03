/* PRIVACIDAD 360 — Selector de modos, instalación (PWA) y modos individuales que funcionan sin internet:
   Detectives en solitario, Cortafuegos, Relevo por equipos y Tienda de avatares. */
(function () {
  'use strict';
  const P = window.P360;
  const L = window.P360_LOGICA;
  const J = window.P360_JUEGO;
  const { esc, tx, t, avatar, mezclar, PERSONAJES } = P;
  const FICHAS = ['🍓', '🍋', '🍇', '🥝'];
  const SITUACIONES = { bullying: ['😣', 'Bullying'], ciberbullying: ['📱', 'Ciberbullying'], exclusion: ['🚪', 'Exclusión'], discriminacion: ['🚫', 'Discriminación'] };
  const personaje = (id) => PERSONAJES[id] || { n: id, i: '❓' };
  const errorCarga = () => `<p class="alerta">⚠️ ${t('No se pudo cargar este modo. Si es la primera vez que lo abres, conéctate una vez para que quede guardado.')}</p>`;

  /* ---------- Instalación como app (PWA) ---------- */
  let eventoInstalar = null;
  const instalada = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    eventoInstalar = ev;
    document.documentElement.dataset.instalable = 'si';
    if (P.app && location.hash.startsWith('#/instalar')) P.app.render();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    delete document.documentElement.dataset.instalable;
    if (P.app) { P.app.aviso(t('📲 ¡PRIVACIDAD 360 quedó instalada!')); P.app.render(); }
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* la app sigue funcionando en línea */ }); });
  }

  async function estadoOffline() {
    if (!('serviceWorker' in navigator)) return { soporta: false };
    if (!window.isSecureContext) return { soporta: true, seguro: false };
    const reg = await navigator.serviceWorker.getRegistration();
    let archivos = 0;
    try { const claves = await caches.keys(); for (const k of claves) archivos += (await (await caches.open(k)).keys()).length; } catch (e) { /* sin acceso a la caché */ }
    return { soporta: true, seguro: true, activo: !!(reg && reg.active), archivos };
  }

  P.registrar('instalar', {
    traducida: true,
    html() {
      const seguro = window.isSecureContext;
      let principal;
      if (instalada()) principal = `<p class="estado-instalar ok">✅ ${t('Ya estás usando PRIVACIDAD 360 como app instalada.')}</p>`;
      else if (eventoInstalar) principal = `<button class="boton-juego grande pulso" type="button" id="boton-instalar">📲 ${t('Instalar PRIVACIDAD 360')}</button><p class="nota">${t('Se abrirá la ventana de instalación de tu navegador. Podrás abrirla desde tu pantalla de inicio o escritorio, con su propio ícono.')}</p>`;
      else if (!seguro) principal = `<div class="alerta" id="aviso-no-seguro"><strong>🔒 ${t('Esta dirección no permite instalar la app.')}</strong><p>${t('Los navegadores solo permiten instalar y guardar la app sin internet desde una dirección segura (https://) o desde la misma computadora (localhost). Aquí estás en {d}.', { d: esc(location.origin) })}</p><p>${t('Sí puedes jugar en salas desde esta dirección. Para instalar en este dispositivo, la app debe publicarse con HTTPS (mira la documentación técnica).')}</p></div>`;
      else if (esIOS()) principal = `<ol class="pasos-instalar"><li>${t('Abre esta página en Safari.')}</li><li>${t('Toca el botón Compartir (el cuadro con la flecha hacia arriba).')}</li><li>${t('Elige «Agregar a pantalla de inicio» y confirma.')}</li></ol><p class="nota">${t('En iPhone y iPad, Apple no permite que una página muestre un botón de instalación: se hace desde Safari.')}</p>`;
      else principal = `<div class="tarjeta" id="sin-boton"><p>${t('Tu navegador todavía no ofrece la instalación automática. Prueba así:')}</p><ul class="lista"><li><strong>Chrome / Edge:</strong> ${t('menú ⋮ → «Instalar PRIVACIDAD 360» o «Agregar a pantalla principal».')}</li><li><strong>Safari (iPhone/iPad):</strong> ${t('Compartir → «Agregar a pantalla de inicio».')}</li><li><strong>Firefox:</strong> ${t('en Android: menú ⋮ → «Instalar». En computadora Firefox no instala apps web, pero el juego funciona igual en el navegador.')}</li></ul></div>`;
      return `
      <section class="modo-cabecera c-instalar">
        <img src="img/icono-192.png" alt="" width="96" height="96" class="icono-app">
        <h1>${t('Instala la app')}</h1>
        <p>${t('Teléfono, tableta o computadora. Se abre como una app y los modos individuales funcionan sin internet.')}</p>
      </section>
      <div class="tarjeta centro-texto">${principal}</div>
      <h2>🔌 ${t('¿Qué funciona sin internet?')}</h2>
      <div id="estado-offline" class="tarjeta"><p class="cargando">${t('Comprobando…')}</p></div>
      <div class="tabla-envoltura"><table>
        <thead><tr><th>${t('Función')}</th><th>${t('Sin internet')}</th><th>${t('Qué necesita')}</th></tr></thead>
        <tbody>
          <tr><td>${t('Aventura, Cortafuegos, Escape, Colegio, Relevo, Detectives en solitario, Tienda')}</td><td>✅</td><td>${t('Nada: se guardan en el dispositivo después de abrir la app una vez.')}</td></tr>
          <tr><td>${t('Salas en la misma red (Wi-Fi)')}</td><td>✅ ${t('sin internet, pero con red local')}</td><td>${t('Una computadora con el servidor encendido en modo red local.')}</td></tr>
          <tr><td>${t('Salas por internet, entre lugares distintos')}</td><td>❌</td><td>${t('Publicar el servidor en un servicio de hospedaje con HTTPS. No está contratado.')}</td></tr>
          <tr><td>${t('Modo docente y estadísticas')}</td><td>❌</td><td>${t('Conexión con el servidor, porque ahí se guardan.')}</td></tr>
        </tbody>
      </table></div>`;
    },
    async montar(cont) {
      const b = cont.querySelector('#boton-instalar');
      if (b) b.addEventListener('click', async () => {
        const ev = eventoInstalar;
        if (!ev) return;
        ev.prompt();
        const r = await ev.userChoice.catch(() => ({ outcome: 'dismissed' }));
        eventoInstalar = null;
        if (r.outcome !== 'accepted') P.app.aviso(t('Instalación cancelada. Puedes hacerla después desde el menú del navegador.'));
        P.app.render();
      });
      const e = await estadoOffline();
      const caja = cont.querySelector('#estado-offline');
      if (!caja) return;
      if (!e.soporta) caja.innerHTML = `<p>⚠️ ${t('Este navegador no permite guardar la app para usarla sin internet.')}</p>`;
      else if (!e.seguro) caja.innerHTML = `<p>⚠️ ${t('En esta dirección el navegador no permite guardar la app. Se necesita HTTPS o localhost.')}</p>`;
      else if (e.activo) caja.innerHTML = `<p id="offline-listo">✅ ${t('Lista para usarse sin internet: {n} archivos guardados en este dispositivo.', { n: e.archivos })}</p>`;
      else caja.innerHTML = `<p>⏳ ${t('Guardando la app en este dispositivo. Vuelve a abrir esta sección en unos segundos.')}</p>`;
    }
  });

  /* ---------- Selector de modos ---------- */
  function tarjetaModo(ruta, icono, titulo, texto, etiqueta, color) {
    return `<a class="tarjeta-modo ${color}" href="${ruta}"><span class="modo-icono" aria-hidden="true">${icono}</span><span class="modo-etiqueta">${etiqueta}</span><h3>${titulo}</h3><p>${texto}</p></a>`;
  }
  P.tarjetasModos = () => {
    const solo = `🔌 ${t('Sin internet')}`, sala = `📡 ${t('Multijugador')}`;
    return `<div class="rejilla-modos">
      ${tarjetaModo('#/jugar', '🗺️', t('Aventura 360'), t('Cinco mundos con jefes, combos y cofres.'), solo, 'm-lila')}
      ${tarjetaModo('#/colegio', '🏫', t('Colegio Mirador'), t('Explora una escuela virtual y ayuda a sus personajes.'), solo, 'm-menta')}
      ${tarjetaModo('#/detectives', '🕵️', t('Detectives del Mirador'), t('Analiza pistas, separa rumores de hechos y actúa bien.'), `${solo} · ${sala}`, 'm-ciruela')}
      ${tarjetaModo('#/sala', '🏟️', t('Arena Relámpago'), t('Crea una sala con código y compitan contra el reloj.'), sala, 'm-durazno')}
      ${tarjetaModo('#/escape', '🗝️', t('Escape Digital'), t('Salas de escape: resuelve retos y abre la cerradura.'), solo, 'm-azul')}
      ${tarjetaModo('#/cortafuegos', '🛡️', t('Cortafuegos'), t('Bloquea los mensajes peligrosos antes de que entren.'), solo, 'm-amarillo')}
      ${tarjetaModo('#/relevo', '🤝', t('Relevo por equipos'), t('Equipos por turnos en un solo dispositivo.'), solo, 'm-verde')}
      ${tarjetaModo('#/tienda', '🛍️', t('Tienda y avatar'), t('Gasta tus monedas en accesorios.'), solo, 'm-rosa')}
    </div>`;
  };
  P.registrar('modos', {
    traducida: true,
    musica: 'aventura',
    html: () => `
      <section class="modo-cabecera c-modos">
        <p class="etiqueta">PRIVACIDAD 360</p>
        <h1>🕹️ ${t('Elige tu juego')}</h1>
        <p>${t('Todos los personajes y casos son ficticios.')}</p>
      </section>
      ${P.tarjetasModos()}
      <div class="rejilla-dos">
        <a class="tarjeta tarjeta-enlace c-lila" href="#/docente"><span class="tarjeta-icono" aria-hidden="true">📋</span><h3>${t('Modo docente')}</h3><p>${t('Crea partidas, organiza actividades y mira estadísticas del grupo.')}</p></a>
        <a class="tarjeta tarjeta-enlace c-azul" href="#/instalar"><span class="tarjeta-icono" aria-hidden="true">📲</span><h3>${t('Instalar la app')}</h3><p>${t('Tenla en tu pantalla de inicio y juega sin internet.')}</p></a>
      </div>`
  });

  /* ---------- Detectives en solitario ---------- */
  let DS = null;
  function pantallaDetectives(cont) {
    const c = DS.caso, tc = tx(c);
    if (DS.fase === 'lista') {
      const resueltos = (P.app.estado().modos || {}).casos || {};
      cont.innerHTML = `
      <section class="modo-cabecera c-detectives">
        <p class="etiqueta">🎭 ${t('Caso y personajes ficticios')}</p>
        <h1>🕵️ ${t('Detectives del Mirador')}</h1>
        <p>${t('Reúne pistas, descarta rumores, descubre qué pasó y decide cómo actuar.')}</p>
      </section>
      <div class="tarjeta c-lila centro-texto"><h2>👥 ${t('¿Son 3 o más?')}</h2><p>${t('En sala, las pistas se reparten entre todos y alguien, sin que nadie sepa quién, es el Eco que difunde pistas falsas.')}</p><a class="boton-juego" href="#/sala">🏟️ ${t('Jugar en sala')}</a></div>
      <h2>🗂️ ${t('Casos para resolver solo')}</h2>
      <div class="rejilla">${DS.casos.map((k, i) => `<button type="button" class="tarjeta tarjeta-caso" data-ds="abrir" data-i="${i}"><span class="tarjeta-icono" aria-hidden="true">${resueltos[k.id] ? '✅' : '📁'}</span><h3>${esc(tx(k).titulo)}</h3><p class="nota">${resueltos[k.id] ? t('Mejor puntaje: {p}', { p: resueltos[k.id].mejor }) : t('Sin resolver')}</p></button>`).join('')}</div>`;
      return;
    }
    const cabecera = `<p class="ficticio">🎭 ${t('Caso y personajes ficticios')}</p><h1 class="titulo-caso">📁 ${esc(tc.titulo)}</h1>`;
    if (DS.fase === 'pistas') {
      cont.innerHTML = `${cabecera}<div class="tarjeta caso-intro"><p>${esc(tc.intro)}</p></div>
      <h2>📌 ${t('Tablero de pistas')}</h2>
      <p class="nota">${t('Algunas no tienen fuente: son rumores. Marca las que te parezcan dudosas.')}</p>
      <ul class="pistas">${DS.tablero.map((p, i) => `<li class="pista ${DS.dudosas.has(i) ? 'dudosa' : ''}"><span class="pista-texto">${esc(p.texto)}</span><button type="button" class="boton pequeno ${DS.dudosas.has(i) ? '' : 'secundario'}" data-ds="dudosa" data-i="${i}" aria-pressed="${DS.dudosas.has(i)}">${DS.dudosas.has(i) ? `🚩 ${t('Dudosa')}` : `🚩 ${t('Marcar')}`}</button></li>`).join('')}</ul>
      <h2>👥 ${t('Personajes del caso')}</h2>
      <ul class="sospechosos">${c.sospechosos.map((s) => `<li class="sospechoso"><span class="s-icono" aria-hidden="true">${personaje(s).i}</span><b>${esc(personaje(s).n)}</b></li>`).join('')}</ul>
      <div class="acciones centro"><button class="boton-juego" type="button" data-ds="votar">🗳️ ${t('Ya tengo una respuesta')}</button></div>`;
    } else if (DS.fase === 'votar') {
      const chip = (g, v, html) => `<button type="button" class="chip-voto ${DS[g] === v ? 'elegido' : ''}" data-ds="elegir" data-g="${g}" data-v="${v}" aria-pressed="${DS[g] === v}">${html}</button>`;
      cont.innerHTML = `${cabecera}
      <h2>1. ${t('¿Qué personaje ficticio lo hizo?')}</h2><div class="chips-voto">${c.sospechosos.map((s) => chip('sospechoso', s, `<span aria-hidden="true">${personaje(s).i}</span> ${esc(personaje(s).n)}`)).join('')}</div>
      <h2>2. ${t('¿Qué tipo de situación es?')}</h2><div class="chips-voto">${Object.keys(SITUACIONES).map((s) => chip('situacion', s, `<span aria-hidden="true">${SITUACIONES[s][0]}</span> ${t(SITUACIONES[s][1])}`)).join('')}</div>
      <div class="acciones centro"><button class="boton secundario" type="button" data-ds="volver">← ${t('Volver a las pistas')}</button><button class="boton-juego" type="button" data-ds="actuar" ${DS.sospechoso && DS.situacion ? '' : 'disabled'}>➡ ${t('Continuar')}</button></div>`;
    } else if (DS.fase === 'actuar') {
      cont.innerHTML = `${cabecera}<h2>🤝 ${t('¿Cómo hay que actuar?')}</h2><p>${t('Eres testigo de esta situación. ¿Qué es lo correcto?')}</p>
      <div class="acciones-caso">${tc.acciones.map((o, i) => `<button type="button" class="ficha-accion" data-ds="accion" data-i="${i}"><span aria-hidden="true">${FICHAS[i]}</span> ${esc(o)}</button>`).join('')}</div>`;
    } else {
      const r = DS.resultado, culpable = personaje(c.culpable);
      cont.innerHTML = `${cabecera}
      <div class="revelacion"><div class="personaje-revelado" aria-hidden="true">${culpable.i}</div>
        <h2>${t('Fue {x}', { x: esc(culpable.n) })} · <span class="tipo-caso">${SITUACIONES[c.tipo][0]} ${t(SITUACIONES[c.tipo][1])}</span></h2>
        <p>${esc(tc.explicacion)}</p>
        <p class="explicacion">💡 <strong>${t('Lo correcto:')}</strong> ${esc(tc.acciones[c.accion])}</p>
        <p class="explicacion">📚 ${esc(tc.leccion)}</p></div>
      <div class="veredicto ${r.perfecto ? 'bien' : r.puntos >= 300 ? 'bien' : 'mal'}"><b>${r.puntos} ${t('puntos')}</b> · 💰 +${r.monedas}
        <span class="desglose">${DS.sospechoso === c.culpable ? '✅' : '❌'} ${t('Quién')} · ${DS.situacion === c.tipo ? '✅' : '❌'} ${t('Tipo')} · ${DS.accionElegida === c.accion ? '✅' : '❌'} ${t('Acción')} · 🚩 ${r.falsasHalladas}/${r.falsasTotal}</span></div>
      <h2>📌 ${t('Hechos y rumores')}</h2>
      <ul class="pistas">${DS.tablero.map((p, i) => `<li class="pista ${p.falsa ? 'falsa' : 'real'}"><span class="pista-texto">${esc(p.texto)}</span><span class="sello-mascara">${p.falsa ? `❌ ${t('Rumor')}` : `✅ ${t('Hecho')}`}${DS.dudosas.has(i) ? ' 🚩' : ''}</span></li>`).join('')}</ul>
      <div class="acciones centro"><button class="boton-juego" type="button" data-ds="lista">🗂️ ${t('Otro caso')}</button><a class="boton secundario" href="#/modos">🕹️ ${t('Otros modos')}</a></div>`;
      P.app.aplicarAnchos(cont);
    }
  }
  function alClicDetectives(ev, cont) {
    const el = ev.target.closest('[data-ds]');
    if (!el || el.disabled) return;
    const a = el.dataset.ds;
    J.SFX.clic();
    if (a === 'abrir') {
      const c = DS.casos[Number(el.dataset.i)], tc = tx(c);
      const tablero = mezclar(tc.pistas.map((texto) => ({ texto, falsa: false })).concat(tc.falsas.map((texto) => ({ texto, falsa: true }))));
      Object.assign(DS, { caso: c, tablero, dudosas: new Set(), sospechoso: null, situacion: null, accionElegida: null, fase: 'pistas' });
    } else if (a === 'dudosa') {
      const i = Number(el.dataset.i);
      if (DS.dudosas.has(i)) DS.dudosas.delete(i); else DS.dudosas.add(i);
    } else if (a === 'votar' || a === 'volver') DS.fase = a === 'votar' ? 'votar' : 'pistas';
    else if (a === 'elegir') DS[el.dataset.g] = el.dataset.v;
    else if (a === 'actuar') DS.fase = 'actuar';
    else if (a === 'lista') DS.fase = 'lista';
    else if (a === 'accion') {
      DS.accionElegida = Number(el.dataset.i);
      const c = DS.caso;
      const marcadas = [...DS.dudosas];
      const r = L.puntuarCasoSolo({
        culpable: DS.sospechoso === c.culpable, tipo: DS.situacion === c.tipo, accion: DS.accionElegida === c.accion,
        falsasHalladas: marcadas.filter((i) => DS.tablero[i].falsa).length, falsasTotal: DS.tablero.filter((p) => p.falsa).length,
        marcadasMal: marcadas.filter((i) => !DS.tablero[i].falsa).length
      });
      DS.resultado = r;
      DS.fase = 'revelar';
      P.app.registrarCaso(c.id, r);
      J.SFX.redoble(0.8);
      setTimeout(() => { if (r.perfecto) { J.SFX.victoria(); P.app.confeti(70); } else if (r.puntos >= 300) J.SFX.bien(); else J.SFX.mal(); }, 800);
    }
    pantallaDetectives(cont);
    if (a !== 'dudosa' && a !== 'elegir') window.scrollTo(0, 0);
  }
  let manejador = null;
  P.registrar('detectives', {
    traducida: true,
    musica: 'misterio',
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(cont) {
      try {
        const casos = await P.datos('casos');
        DS = { casos, caso: casos[0], fase: 'lista', dudosas: new Set() };
        manejador = (ev) => alClicDetectives(ev, cont);
        cont.addEventListener('click', manejador);
        pantallaDetectives(cont);
      } catch (e) { cont.innerHTML = errorCarga(); }
    },
    desmontar(cont) { if (cont && manejador) cont.removeEventListener('click', manejador); DS = null; }
  });

  /* ---------- Cortafuegos: arcade de reflejos ---------- */
  let CF = null;
  function cfIniciar(cont, datos) {
    cfDetener();
    CF = { datos: mezclar(datos), cola: 0, escudos: 3, puntos: 0, combo: 0, activos: [], errores: [], tiempo: L.CORTAFUEGOS.duracion, ultimo: performance.now(), hastaNuevo: 0.2, fin: false, bloqueados: 0, cont };
    cont.innerHTML = `
    <div class="cf-marco">
      <div class="cf-hud"><span id="cf-escudos" aria-label="${t('Escudos')}"></span><span class="chip-sala">⭐ <b id="cf-puntos">0</b></span><span class="chip-sala" id="cf-combo">×1</span><span class="chip-sala">⏱ <b id="cf-tiempo">${CF.tiempo}</b></span></div>
      <div class="cf-campo" id="cf-campo"><div class="cf-muro" aria-hidden="true"><span>🛡️ ${t('Tu bandeja de entrada')}</span></div></div>
      <p class="nota centro-texto">${t('Toca los mensajes peligrosos para bloquearlos. Deja pasar los buenos.')}</p>
    </div>`;
    cfPintarEscudos();
    CF.raf = requestAnimationFrame(cfCuadro);
    CF.campo = cont.querySelector('#cf-campo');
    CF.campo.addEventListener('click', cfClic);
  }
  function cfPintarEscudos() { const e = document.getElementById('cf-escudos'); if (e && CF) { e.textContent = '🛡️'.repeat(CF.escudos) + '▫️'.repeat(3 - CF.escudos); } }
  function cfGenerar() {
    const it = CF.datos[CF.cola % CF.datos.length]; CF.cola++;
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'paquete';
    el.innerHTML = `<span aria-hidden="true">${it.i}</span> ${esc(tx(it.t))}`;
    el.style.left = (4 + Math.random() * 42) + '%';
    el.dataset.m = it.m;
    CF.campo.appendChild(el);
    CF.activos.push({ el, it, y: -60 });
  }
  function cfCuadro(ahora) {
    if (!CF || CF.fin) return;
    const dt = Math.min(0.1, (ahora - CF.ultimo) / 1000);
    CF.ultimo = ahora;
    CF.tiempo -= dt;
    const transcurrido = L.CORTAFUEGOS.duracion - CF.tiempo;
    const vel = L.velocidadCortafuegos(transcurrido);
    CF.hastaNuevo -= dt;
    if (CF.hastaNuevo <= 0) { cfGenerar(); CF.hastaNuevo = L.intervaloCortafuegos(transcurrido); }
    const alto = CF.campo.clientHeight - 56;
    CF.activos = CF.activos.filter((p) => {
      p.y += vel * dt;
      p.el.style.transform = `translateY(${p.y}px)`;
      if (p.y < alto) return true;
      p.el.remove();
      cfLlego(p);
      return false;
    });
    const tEl = document.getElementById('cf-tiempo');
    if (tEl) tEl.textContent = Math.ceil(Math.max(0, CF.tiempo));
    if (CF.tiempo <= 0 || CF.escudos <= 0) { cfTerminar(); return; }
    CF.raf = requestAnimationFrame(cfCuadro);
  }
  function cfPuntaje() {
    const p = document.getElementById('cf-puntos'); if (p) p.textContent = CF.puntos;
    const c = document.getElementById('cf-combo'); if (c) c.textContent = '×' + (1 + Math.min(4, Math.floor(CF.combo / 3)));
  }
  function cfLlego(p) {
    if (Number(p.it.m)) {   // un mensaje peligroso entró
      CF.escudos--; CF.combo = 0; CF.errores.push(p.it);
      J.SFX.golpe(); cfPintarEscudos();
      CF.campo.classList.remove('sacude'); void CF.campo.offsetWidth; CF.campo.classList.add('sacude');
    } else { CF.puntos += L.CORTAFUEGOS.dejarPasar; J.SFX.tic(); }
    cfPuntaje();
  }
  function cfClic(ev) {
    const el = ev.target.closest('.paquete');
    if (!el || !CF) return;
    const p = CF.activos.find((x) => x.el === el);
    if (!p) return;
    CF.activos = CF.activos.filter((x) => x !== p);
    if (Number(p.it.m)) {
      CF.combo++; CF.bloqueados++;
      CF.puntos += L.CORTAFUEGOS.bloquear * (1 + Math.min(4, Math.floor(CF.combo / 3)));
      el.classList.add('bloqueado'); J.SFX.bien();
      if (CF.combo % 3 === 0) J.SFX.combo();
    } else {
      CF.escudos--; CF.combo = 0; CF.errores.push(p.it);
      el.classList.add('error'); J.SFX.mal(); cfPintarEscudos();
    }
    cfPuntaje();
    setTimeout(() => el.remove(), 300);
  }
  function cfTerminar() {
    const c = CF;
    c.fin = true;
    c.activos.forEach((p) => p.el.remove());
    const r = P.app.registrarCortafuegos(c.puntos);
    if (c.escudos > 0) { J.SFX.victoria(); P.app.confeti(50); } else J.SFX.derrota();
    const unicos = [...new Set(c.errores)].slice(0, 6);
    c.cont.innerHTML = `
    <section class="final-sala">
      <p class="etiqueta">🛡️ ${t('Cortafuegos')}</p>
      <h1>${c.escudos > 0 ? t('¡Resististe todo el ataque!') : t('Entraron demasiados mensajes')}</h1>
      <p class="codigo-grande" id="cf-final">${c.puntos}</p>
      <p>${t('Mensajes bloqueados: {n}', { n: c.bloqueados })} · ${r.record ? `🏆 ${t('¡Nuevo récord!')}` : t('Récord: {p}', { p: r.mejor })} · 💰 +${r.monedas}</p>
      ${unicos.length ? `<h2>🧠 ${t('Para la próxima')}</h2><ul class="pistas">${unicos.map((it) => `<li class="pista"><span class="pista-texto"><b>${it.i} ${esc(tx(it.t))}</b><br>${esc(tx(it.r))}</span></li>`).join('')}</ul>` : ''}
      <div class="acciones centro"><button class="boton-juego" type="button" data-cf="otra">🔁 ${t('Jugar otra vez')}</button><a class="boton secundario" href="#/modos">🕹️ ${t('Otros modos')}</a></div>
    </section>`;
  }
  function cfDetener() { if (CF) { CF.fin = true; cancelAnimationFrame(CF.raf); } }
  function cfPortada(cont) {
    const mejor = ((P.app.estado().modos || {}).cortafuegos || {}).mejor || 0;
    cont.innerHTML = `
    <section class="modo-cabecera c-cortafuegos">
      <p class="etiqueta">🔌 ${t('Sin internet')}</p>
      <h1>🛡️ ${t('Cortafuegos')}</h1>
      <p>${t('Llueven mensajes hacia tu bandeja. Bloquea los peligrosos y deja pasar los buenos. Tienes 3 escudos y cada vez caen más rápido.')}</p>
      ${mejor ? `<p>🏆 ${t('Récord: {p}', { p: mejor })}</p>` : ''}
      <button class="boton-juego grande pulso" type="button" data-cf="otra">▶ ${t('Empezar')}</button>
    </section>`;
  }
  let cfManejador = null;
  P.registrar('cortafuegos', {
    traducida: true,
    musica: 'arcade',
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(cont) {
      let datos;
      try { datos = await P.datos('cortafuegos'); } catch (e) { cont.innerHTML = errorCarga(); return; }
      cfManejador = (ev) => { if (ev.target.closest('[data-cf="otra"]')) { J.SFX.clic(); cfIniciar(cont, datos); window.scrollTo(0, 0); } };
      cont.addEventListener('click', cfManejador);
      cfPortada(cont);
    },
    desmontar(cont) { cfDetener(); CF = null; if (cont && cfManejador) cont.removeEventListener('click', cfManejador); }
  });

  /* ---------- Relevo por equipos: varios equipos, un solo dispositivo ---------- */
  const EQUIPOS = [['🐚', 'Coral', 'eq-coral'], ['🌿', 'Menta', 'eq-menta'], ['☁️', 'Cielo', 'eq-cielo'], ['🌸', 'Lavanda', 'eq-lavanda']];
  let RV = null, rvCrono = null;
  function rvPortada(cont) {
    cont.innerHTML = `
    <section class="modo-cabecera c-relevo">
      <p class="etiqueta">🔌 ${t('Sin internet')} · ${t('Un solo dispositivo')}</p>
      <h1>🤝 ${t('Relevo por equipos')}</h1>
      <p>${t('Los equipos se turnan el dispositivo. Si un equipo falla, el siguiente puede robar la pregunta por la mitad de los puntos.')}</p>
    </section>
    <form id="rv-form" class="tarjeta tarjeta-juego">
      <div class="fila-campos">
        <label>${t('Equipos')} <select id="rv-equipos"><option>2</option><option selected>3</option><option>4</option></select></label>
        <label>${t('Preguntas por equipo')} <select id="rv-rondas"><option>2</option><option selected>3</option><option>5</option></select></label>
        <label>${t('Segundos')} <select id="rv-seg"><option>10</option><option selected>15</option><option>25</option></select></label>
      </div>
      <button class="boton-juego" type="submit">▶ ${t('Empezar relevo')}</button>
    </form>`;
  }
  function rvMarcador() {
    return `<ol class="marcador-eq">${RV.equipos.map((e, i) => `<li class="${e[2]} ${i === RV.turno ? 'turno' : ''}"><span aria-hidden="true">${e[0]}</span> ${t(e[1])} <b>${RV.puntos[i]}</b></li>`).join('')}</ol>`;
  }
  function rvPregunta(cont) {
    const q = RV.preguntas[RV.i], tq = tx(q), eq = RV.equipos[RV.turno];
    cont.innerHTML = `
    <div class="sala-marco">
      ${rvMarcador()}
      ${P.relojHtml()}
      <p class="etiqueta centro-texto ${eq[2]} turno-de">${RV.robando ? `🦝 ${t('¡Robo!')} ` : ''}${t('Turno de {e}', { e: `${eq[0]} ${t(eq[1])}` })} · ${t('Pregunta {n} de {m}', { n: RV.i + 1, m: RV.preguntas.length })}</p>
      <h1 class="pregunta-sala">${esc(tq.p)}</h1>
      <div class="fichas-respuesta n-${tq.o.length}">${tq.o.map((o, i) => `<button type="button" class="ficha-resp f${i}" data-rv="r" data-i="${i}" ${RV.descartadas.includes(i) ? 'disabled' : ''}><span aria-hidden="true">${FICHAS[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
    </div>`;
    if (rvCrono) rvCrono.detener();
    rvCrono = P.cronometro(cont, { ms: RV.seg * 1000, total: RV.seg * 1000, alSegundo: (s) => { if (s > 0 && s <= 3) J.SFX.tic(); }, alAcabar: () => rvResponder(cont, null) });
    window.scrollTo(0, 0);
  }
  function rvResponder(cont, i) {
    if (rvCrono) { var resta = rvCrono.restante(); rvCrono.detener(); }
    const q = RV.preguntas[RV.i], tq = tx(q), n = RV.equipos.length;
    const bien = i === q.c;
    if (bien) {
      const pts = L.puntosRelevo(resta, RV.seg * 1000, RV.robando);
      RV.puntos[RV.turno] += pts;
      J.SFX.bien();
      rvRetro(cont, true, t('¡Correcto! +{p} puntos para {e}.', { p: pts, e: t(RV.equipos[RV.turno][1]) }), tq);
      return;
    }
    J.SFX.mal();
    if (i !== null) RV.descartadas.push(i);
    if (!RV.robando && n > 1 && i !== null) {
      RV.robando = true;
      RV.dueno = RV.turno;
      RV.turno = (RV.turno + 1) % n;
      rvPregunta(cont);
      return;
    }
    rvRetro(cont, false, i === null ? t('Se acabó el tiempo') : t('Esta vez no'), tq);
  }
  function rvRetro(cont, bien, texto, tq) {
    const q = RV.preguntas[RV.i];
    cont.innerHTML = `
    <div class="sala-marco">
      ${rvMarcador()}
      <div class="veredicto ${bien ? 'bien' : 'mal'}">${bien ? '🎉' : '💥'} ${esc(texto)}</div>
      <p class="explicacion"><strong>${t('La respuesta era:')}</strong> ${esc(tq.o[q.c])}<br>💡 ${esc(tq.e)}</p>
      <div class="acciones centro"><button class="boton-juego" type="button" data-rv="sig">➡ ${t('Siguiente equipo')}</button></div>
    </div>`;
  }
  function rvSiguiente(cont) {
    const base = RV.robando ? RV.dueno : RV.turno;
    RV.robando = false; RV.descartadas = [];
    RV.i++;
    if (RV.i >= RV.preguntas.length) { rvFinal(cont); return; }
    RV.turno = (base + 1) % RV.equipos.length;
    rvPregunta(cont);
  }
  function rvFinal(cont) {
    const orden = RV.equipos.map((e, i) => ({ e, p: RV.puntos[i] })).sort((a, b) => b.p - a.p);
    const empate = orden.length > 1 && orden[0].p === orden[1].p;
    const r = P.app.registrarRelevo();
    J.SFX.victoria(); P.app.confeti(70);
    cont.innerHTML = `
    <section class="final-sala">
      <p class="etiqueta">🏁 ${t('Fin de la partida')}</p>
      <h1>${empate ? t('¡Empate!') : t('¡Gana el equipo {e}!', { e: `${orden[0].e[0]} ${t(orden[0].e[1])}` })}</h1>
      <ol class="ranking">${orden.map((o, i) => `<li class="${o.e[2]}"><span class="pos">${i + 1}</span><span class="nom">${o.e[0]} ${t(o.e[1])}</span><b>${o.p}</b></li>`).join('')}</ol>
      <p>💰 +${r.monedas}</p>
      <div class="acciones centro"><button class="boton-juego" type="button" data-rv="portada">🔁 ${t('Jugar otra vez')}</button><a class="boton secundario" href="#/modos">🕹️ ${t('Otros modos')}</a></div>
    </section>`;
  }
  let rvClic = null, rvEnviar = null;
  P.registrar('relevo', {
    traducida: true,
    musica: 'arena',
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(cont) {
      let banco;
      try { banco = await P.datos('arena'); } catch (e) { cont.innerHTML = errorCarga(); return; }
      rvClic = (ev) => {
        const el = ev.target.closest('[data-rv]');
        if (!el || el.disabled) return;
        if (el.dataset.rv === 'r') rvResponder(cont, Number(el.dataset.i));
        else if (el.dataset.rv === 'sig') { J.SFX.clic(); rvSiguiente(cont); }
        else if (el.dataset.rv === 'portada') { J.SFX.clic(); rvPortada(cont); }
      };
      rvEnviar = (ev) => {
        if (ev.target.id !== 'rv-form') return;
        ev.preventDefault();
        const n = Number(cont.querySelector('#rv-equipos').value), rondas = Number(cont.querySelector('#rv-rondas').value);
        RV = { equipos: EQUIPOS.slice(0, n), puntos: new Array(n).fill(0), turno: 0, i: 0, seg: Number(cont.querySelector('#rv-seg').value), preguntas: mezclar(banco).slice(0, n * rondas), robando: false, descartadas: [] };
        J.SFX.desbloqueo();
        rvPregunta(cont);
      };
      cont.addEventListener('click', rvClic);
      cont.addEventListener('submit', rvEnviar);
      rvPortada(cont);
    },
    desmontar(cont) { if (rvCrono) rvCrono.detener(); rvCrono = null; RV = null; if (cont && rvClic) { cont.removeEventListener('click', rvClic); cont.removeEventListener('submit', rvEnviar); } }
  });

  /* ---------- Tienda ---------- */
  const CATEGORIAS = [['base', '🐾', 'Personajes'], ['sombrero', '🎩', 'Sombreros'], ['gafas', '🕶️', 'Lentes'], ['mascota', '🐣', 'Compañeros'], ['fondo', '🎨', 'Fondos'], ['marco', '✨', 'Marcos y auras']];
  let tiendaClic = null;
  function pintarTienda(cont, catalogo) {
    const est = P.app.estado(), lg = P.app.logros(), actual = P.app.avatarActual();
    const muestra = (a) => {
      if (a.tipo === 'fondo') return `<span class="muestra fondo-${a.valor}" aria-hidden="true"></span>`;
      if (a.tipo === 'marco') return `<span class="av av-s marco-${a.valor} fondo-lavanda" aria-hidden="true"><span class="av-base">⭐</span></span>`;
      return `<span class="muestra-emoji" aria-hidden="true">${a.valor}</span>`;
    };
    cont.innerHTML = `
    <section class="modo-cabecera c-tienda tienda-cabecera">
      <div class="vitrina">${avatar(actual, 'l', t('Tu avatar'))}</div>
      <div>
        <h1>🛍️ ${t('Tienda y avatar')}</h1>
        <p class="saldo">💰 <b id="saldo-monedas">${est.monedas || 0}</b> ${t('monedas')} · ${t('Nivel {n}', { n: lg.nivel.n })} ${lg.nivel.icono}</p>
        <p class="nota">${t('Las monedas se ganan jugando. Nunca cuestan dinero real y tu avatar no usa tu foto.')}</p>
      </div>
    </section>
    ${CATEGORIAS.map(([tipo, icono, nombre]) => `
      <h2>${icono} ${t(nombre)}</h2>
      <div class="rejilla-tienda">${catalogo.filter((a) => a.tipo === tipo).map((a) => {
        const tiene = L.tieneArticulo(est, a), puesto = actual[a.tipo] === a.valor, bloqueado = a.nivel > lg.nivel.n;
        return `<div class="articulo ${puesto ? 'puesto' : ''} ${bloqueado ? 'bloqueado' : ''}">
          ${muestra(a)}<strong>${esc(tx(a.nombre))}</strong>
          ${tiene ? `<button type="button" class="boton pequeno ${puesto ? 'secundario' : ''}" data-tienda="equipar" data-id="${a.id}" aria-pressed="${puesto}">${puesto ? (a.tipo === 'base' ? `✅ ${t('Puesto')}` : `✕ ${t('Quitar')}`) : t('Usar')}</button>`
          : bloqueado ? `<small>🔒 ${t('Nivel {n}', { n: a.nivel })}</small>`
          : `<button type="button" class="boton pequeno" data-tienda="comprar" data-id="${a.id}" ${(est.monedas || 0) < a.precio ? 'disabled' : ''}>💰 ${a.precio}</button>`}
        </div>`;
      }).join('')}</div>`).join('')}`;
  }
  P.registrar('tienda', {
    traducida: true,
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(cont) {
      let catalogo;
      try { catalogo = await P.datos('tienda'); } catch (e) { cont.innerHTML = errorCarga(); return; }
      tiendaClic = (ev) => {
        const el = ev.target.closest('[data-tienda]');
        if (!el || el.disabled) return;
        const art = catalogo.find((a) => a.id === el.dataset.id);
        const est = P.app.estado();
        if (el.dataset.tienda === 'comprar') {
          const r = L.comprarArticulo(est, art, P.app.logros().nivel.n);
          if (!r.ok) { P.app.aviso(t(r.motivo === 'monedas' ? 'Te faltan monedas: sigue jugando.' : 'Todavía no puedes comprar esto.')); J.SFX.mal(); return; }
          L.equiparArticulo(est, art);
          J.SFX.cofre(); P.app.confeti(25);
          P.app.aviso(t('🎉 ¡Nuevo artículo: {n}!', { n: tx(art.nombre) }), 'insignia');
        } else { L.equiparArticulo(est, art); J.SFX.clic(); }
        P.app.guardar();
        pintarTienda(cont, catalogo);
      };
      cont.addEventListener('click', tiendaClic);
      pintarTienda(cont, catalogo);
    },
    desmontar(cont) { if (cont && tiendaClic) cont.removeEventListener('click', tiendaClic); }
  });
})();
