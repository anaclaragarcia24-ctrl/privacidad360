/* PRIVACIDAD 360 — Salas multijugador en vivo: Arena Relámpago y Detectives del Mirador.
   Toda la partida la dirige el servidor (salas.py): tiempos, puntos y papeles secretos. Este archivo solo la muestra.
   Requiere el servidor encendido; sin él se avisa con claridad y se ofrecen los modos individuales. */
(function () {
  'use strict';
  const P = window.P360;
  const J = window.P360_JUEGO;
  const { esc, tx, t, avatar, api, PERSONAJES, relojHtml } = P;
  const CLAVE = 'p360_sala';
  const FICHAS = ['🍓', '🍋', '🍇', '🥝'];
  const TEMAS = { contrasenas: 'Contraseñas', phishing: 'Phishing', redes: 'Redes sociales', imagenes: 'Imágenes', bullying: 'Bullying', ciberbullying: 'Ciberbullying', denuncia: 'Denuncia segura', propia: 'Pregunta del docente' };
  const SITUACIONES = { bullying: ['😣', 'Bullying'], ciberbullying: ['📱', 'Ciberbullying'], exclusion: ['🚪', 'Exclusión'], discriminacion: ['🚫', 'Discriminación'] };
  const NOMBRE_EQUIPO = { coral: ['🐚', 'Coral'], menta: ['🌿', 'Menta'], cielo: ['☁️', 'Cielo'], lavanda: ['🌸', 'Lavanda'] };
  const FRASES = { tengo_pista: '🙋 Tengo una pista', no_encaja: '🤔 Esa pista no encaja', falta_fuente: '🧾 ¿Cuál es la fuente?', verifiquemos: '🔎 Verifiquemos antes de acusar', de_acuerdo: '👍 De acuerdo', no_seguro: '🤷 No estoy seguro' };

  let S = null;   // sesión: { codigo, token, datos, version, fallos, ... }
  let raiz = null, relojPoll = null, crono = null, vivo = false, invitacion = null, consultando = false, repetir = false;

  const leerSesion = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
  const guardarSesion = (s) => { try { if (s) sessionStorage.setItem(CLAVE, JSON.stringify(s)); else sessionStorage.removeItem(CLAVE); } catch (e) { /* sin acceso */ } };

  /* ---------- Vestíbulo: unirse o crear ---------- */
  function htmlVestibulo(codigoInicial, conexion) {
    const est = P.app.estado();
    const a = P.app.logros();
    return `
    <section class="modo-cabecera c-arena">
      <p class="etiqueta">${t('Multijugador en vivo')}</p>
      <h1>🏟️ ${t('Salas de juego')}</h1>
      <p>${t('Compite con código de sala, tiempo límite, puntos y ranking. Cada quien juega desde su dispositivo.')}</p>
    </section>
    ${conexion === false ? `<p class="alerta" id="sala-sin-servidor"><strong>📡 ${t('No hay conexión con el servidor.')}</strong> ${t('Las salas necesitan que el servidor de PRIVACIDAD 360 esté encendido y que todos estén en su misma red. Sin él sí puedes jugar los modos individuales.')} <a href="#/modos">${t('Ver modos sin conexión')}</a></p>` : ''}
    <div class="rejilla-dos">
      <form id="sala-unirse" class="tarjeta tarjeta-juego" autocomplete="off">
        <h2>🎟️ ${t('Entrar con código')}</h2>
        <label for="unir-codigo">${t('Código de la sala')}</label>
        <input id="unir-codigo" class="entrada-codigo" maxlength="5" required autocapitalize="characters" spellcheck="false" value="${esc(codigoInicial || '')}" placeholder="ABCDE">
        <label for="unir-apodo">${t('Tu apodo de juego')}</label>
        <div class="fila-entrada"><input id="unir-apodo" maxlength="16" required spellcheck="false" value="${esc(P.apodoAzar())}"><button class="boton secundario pequeno" type="button" data-sala="dado" data-para="unir-apodo" aria-label="${t('Otro apodo al azar')}">🎲</button></div>
        <p class="nota">🔒 ${t('Inventa un apodo: nunca uses tu nombre real, teléfono ni correo.')}</p>
        <div class="fila-avatar">${avatar(P.app.avatarActual(), 'm')}<a href="#/tienda">${t('Personalizar avatar')}</a></div>
        <button class="boton-juego" type="submit">▶ ${t('Entrar')}</button>
        <p class="error-sala" role="alert" hidden></p>
      </form>
      <form id="sala-crear" class="tarjeta tarjeta-juego" autocomplete="off">
        <h2>✨ ${t('Crear una sala')}</h2>
        <fieldset class="elige-modo"><legend>${t('¿A qué van a jugar?')}</legend>
          <label class="opcion-modo"><input type="radio" name="modo" value="arena" checked><span><b>🏟️ ${t('Arena Relámpago')}</b><small>${t('Preguntas contra el reloj. Desde 1 jugador. Puede ser por equipos.')}</small></span></label>
          <label class="opcion-modo"><input type="radio" name="modo" value="detectives"><span><b>🕵️ ${t('Detectives del Mirador')}</b><small>${t('Reúnan pistas y descubran qué pasó. Desde 3 jugadores.')}</small></span></label>
        </fieldset>
        <div class="fila-campos">
          <label>${t('Rondas')} <input id="crear-rondas" type="number" min="1" max="20" value="8"></label>
          <label>${t('Segundos')} <input id="crear-segundos" type="number" min="10" max="240" value="20"></label>
          <label class="solo-arena">${t('Equipos')} <select id="crear-equipos"><option value="0">${t('Sin equipos')}</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
        </div>
        <label class="casilla"><input type="checkbox" id="crear-auto" checked> ${t('Avanzar solo entre rondas')}</label>
        <label class="casilla"><input type="checkbox" id="crear-jugar"> ${t('Yo también juego desde este dispositivo')}</label>
        <button class="boton-juego" type="submit">🚀 ${t('Crear sala')}</button>
        <p class="error-sala" role="alert" hidden></p>
      </form>
    </div>
    <details class="tarjeta"><summary><strong>🧭 ${t('¿Cómo se conecta cada dispositivo?')}</strong></summary>
      <ol class="lista">
        <li>${t('Una computadora enciende el servidor con la opción de red local.')}</li>
        <li>${t('Quien crea la sala ve la dirección y el código en pantalla.')}</li>
        <li>${t('Los demás, en el mismo Wi-Fi, abren esa dirección y escriben el código.')}</li>
      </ol>
    </details>`;
  }

  function mostrarError(form, texto) {
    const e = form.querySelector('.error-sala');
    if (e) { e.textContent = texto; e.hidden = false; }
    J.SFX.mal();
  }

  async function crearSala(form) {
    const modo = form.querySelector('input[name="modo"]:checked').value;
    const opciones = {
      rondas: Number(form.querySelector('#crear-rondas').value),
      segundos: Number(form.querySelector('#crear-segundos').value),
      automatico: form.querySelector('#crear-auto').checked
    };
    if (modo === 'arena') opciones.equipos = Number(form.querySelector('#crear-equipos').value);
    try {
      const r = await api('/api/salas', { metodo: 'POST', cuerpo: { modo, opciones } });
      let token = r.token;
      if (form.querySelector('#crear-jugar').checked) {
        const j = await api(`/api/salas/${r.codigo}/unirse`, { metodo: 'POST', cabeceras: { 'X-P360-Token': r.token }, cuerpo: { apodo: P.apodoAzar(), avatar: P.app.avatarActual() } });
        token = j.token;
      }
      entrar(r.codigo, token);
    } catch (e) { mostrarError(form, e.message); }
  }

  async function unirseSala(form) {
    const codigo = form.querySelector('#unir-codigo').value.trim().toUpperCase();
    const apodo = form.querySelector('#unir-apodo').value;
    try {
      const j = await api(`/api/salas/${encodeURIComponent(codigo)}/unirse`, { metodo: 'POST', cuerpo: { apodo, avatar: P.app.avatarActual() } });
      entrar(j.codigo, j.token);
    } catch (e) { mostrarError(form, e.message); }
  }

  function entrar(codigo, token) {
    S = { codigo, token, version: null, datos: null, fallos: 0, voto: {}, faseVista: null, cobrado: false };
    guardarSesion({ codigo, token });
    if (location.hash !== `#/sala/${codigo}`) { history.replaceState(null, '', `#/sala/${codigo}`); }
    J.SFX.desbloqueo();
    consultar();
  }

  function salirDeSala(avisarServidor) {
    const s = S;
    detenerSondeo();
    S = null; guardarSesion(null);
    if (avisarServidor && s && s.datos && s.datos.yo) api(`/api/salas/${s.codigo}/accion`, { metodo: 'POST', cabeceras: { 'X-P360-Token': s.token }, cuerpo: { tipo: 'salir' } }).catch(() => {});
    location.hash = '#/sala';
    if (location.hash === '#/sala') P.app.render();
  }

  /* ---------- Sondeo: una consulta por segundo; si nada cambió, el servidor responde casi vacío ---------- */
  function detenerSondeo() { clearTimeout(relojPoll); relojPoll = null; if (crono) { crono.detener(); crono = null; } }

  async function consultar() {
    if (!S || !vivo) return;
    // Una sola consulta a la vez: si llega otra petición mientras tanto, se repite al terminar.
    if (consultando) { repetir = true; return; }
    consultando = true;
    const sesion = S;
    try {
      const v = sesion.version !== null ? `?v=${sesion.version}` : '';
      const d = await api(`/api/salas/${sesion.codigo}${v}`, { cabeceras: { 'X-P360-Token': sesion.token } });
      if (S === sesion) {   // la respuesta de una sala que ya se dejó se descarta
        sesion.fallos = 0;
        quitarAvisoConexion();
        if (d.sinCambios) ajustarReloj(d.restante_ms);
        else recibir(d);
      }
    } catch (e) {
      if (S === sesion) {
        if (e.codigo === 403 || e.codigo === 404) {
          consultando = false; repetir = false;
          P.app.aviso(e.message);
          salirDeSala(false);
          return;
        }
        if (!e.sinConexion && e.codigo === undefined) console.error(e);   // error de programación, no de red
        sesion.fallos++;
        if (sesion.fallos >= 3) ponerAvisoConexion();
      }
    }
    consultando = false;
    clearTimeout(relojPoll);
    if (S && vivo) relojPoll = setTimeout(consultar, repetir ? 0 : 1000);
    repetir = false;
  }

  function ponerAvisoConexion() {
    if (!raiz || raiz.querySelector('#aviso-conexion')) return;
    const a = document.createElement('p');
    a.id = 'aviso-conexion'; a.className = 'alerta'; a.setAttribute('role', 'alert');
    a.textContent = t('📡 Se perdió la conexión con el servidor. Reintentando…');
    raiz.prepend(a);
  }
  function quitarAvisoConexion() { const a = raiz && raiz.querySelector('#aviso-conexion'); if (a) a.remove(); }

  function ajustarReloj(ms) {
    if (ms === null || ms === undefined) return;
    if (crono && Math.abs(crono.restante() - ms) > 700) crono.ajustar(ms);
  }

  function recibir(d) {
    const faseCambio = !S.datos || S.datos.fase !== d.fase || S.datos.ronda !== d.ronda;
    S.datos = d;
    if (faseCambio) { S.voto = {}; sonidoDeFase(d); }
    pintar(faseCambio);
    S.version = d.version;   // solo después de pintar: si algo falla, la siguiente consulta trae todo de nuevo
    if (crono) { crono.detener(); crono = null; }
    if (d.restante_ms !== null && d.restante_ms !== undefined) {
      crono = P.cronometro(raiz, { ms: d.restante_ms, total: (d.total_s || 1) * 1000, alSegundo: (s) => { if (s > 0 && s <= 5 && ['pregunta', 'pistas', 'votar', 'actuar'].includes(d.fase)) J.SFX.tic(); } });
    }
  }

  function sonidoDeFase(d) {
    if (d.fase === 'pregunta' || d.fase === 'pistas') J.SFX.caja();
    else if (d.fase === 'votar' || d.fase === 'actuar') J.SFX.sirena();
    else if (d.fase === 'resultado') {
      const u = d.yo && d.yo.ultimo;
      if (u) { if (u.correcta) { J.SFX.bien(); if (d.yo.racha >= 3) J.SFX.combo(); } else J.SFX.mal(); }
    } else if (d.fase === 'revelar') J.SFX.redoble(1);
    else if (d.fase === 'final') { J.SFX.victoria(); P.app.confeti(80); }
    J.musica(d.fase === 'final' ? null : d.modo === 'arena' ? 'arena' : 'misterio');
  }

  /* ---------- Pantallas ---------- */
  function pintar(faseCambio) {
    const d = S.datos;
    const scroll = window.scrollY;
    let html;
    if (d.fase === 'espera') html = htmlEspera(d);
    else if (d.fase === 'final') html = htmlFinal(d);
    else if (d.modo === 'arena') html = d.fase === 'pregunta' ? htmlPregunta(d) : htmlResultado(d);
    else html = htmlCaso(d);
    raiz.innerHTML = `<div class="sala-marco sala-${d.modo} fase-${d.fase}">${html}</div>`;
    P.app.aplicarAnchos(raiz);
    if (!faseCambio) window.scrollTo(0, scroll); else if (d.fase !== 'espera') window.scrollTo(0, 0);
    if (d.fase === 'final') cobrarRecompensa(d);
  }

  const barraSala = (d, extra = '') => `<div class="sala-barra"><span class="chip-sala">🎟️ ${esc(d.codigo)}</span><span class="chip-sala">${t('Ronda {n} de {m}', { n: d.ronda + 1, m: d.rondas })}</span>${d.yo ? `<span class="chip-sala">⭐ ${d.yo.puntos}</span>` : ''}${extra}</div>`;
  const controlAnfitrion = (d, texto) => (d.anfitrion ? `<button class="boton secundario" type="button" data-sala="siguiente">⏭ ${texto}</button>` : '');

  function htmlEspera(d) {
    const direccion = invitacion || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? null : location.origin);
    if (d.anfitrion && !invitacion) buscarInvitacion();
    return `
    <section class="sala-espera">
      <p class="etiqueta">${d.titulo ? esc(d.titulo) : d.modo === 'arena' ? `🏟️ ${t('Arena Relámpago')}` : `🕵️ ${t('Detectives del Mirador')}`}</p>
      <h1>${t('Código de sala')}</h1>
      <p class="codigo-grande" id="codigo-sala" aria-label="${esc(d.codigo.split('').join(' '))}">${esc(d.codigo)}</p>
      ${d.anfitrion ? `<div class="invitacion" id="invitacion">${htmlInvitacion(direccion, d.codigo)}</div>` : `<p class="nota">${t('Esperando a que empiece la partida…')}</p>`}
      <h2>${t('Jugadores')} (<span id="n-jugadores">${d.ranking.length}</span>)</h2>
      <ul class="burbujas">
        ${d.ranking.length ? d.ranking.map((j) => `<li class="burbuja-jugador ${j.equipo ? 'eq-' + j.equipo : ''}">${avatar(j.avatar, 's')}<span>${esc(j.apodo)}</span>${d.anfitrion && !(d.yo && d.yo.id === j.id) ? `<button type="button" class="quitar" data-sala="expulsar" data-id="${j.id}" aria-label="${esc(t('Sacar a {a} de la sala', { a: j.apodo }))}">✕</button>` : ''}</li>`).join('') : `<li class="nota">${t('Todavía no entra nadie.')}</li>`}
      </ul>
      ${d.equipos ? `<p class="nota">${d.equipos.map((e) => `${NOMBRE_EQUIPO[e.id][0]} ${t(NOMBRE_EQUIPO[e.id][1])}: ${e.n}`).join(' · ')}</p>` : ''}
      <div class="acciones centro">
        ${d.anfitrion ? `<button class="boton-juego grande ${d.ranking.length >= d.minimo ? 'pulso' : ''}" type="button" data-sala="iniciar" ${d.ranking.length >= d.minimo ? '' : 'disabled'}>▶ ${t('Empezar')}</button>` : ''}
        <button class="boton secundario" type="button" data-sala="salir">${t('Salir')}</button>
      </div>
      ${d.anfitrion && d.ranking.length < d.minimo ? `<p class="nota">${t('Se necesitan al menos {n} jugadores para empezar.', { n: d.minimo })}</p>` : ''}
      <p class="nota">🔒 ${t('Los apodos solo se usan durante la partida. No se guardan.')}</p>
    </section>`;
  }

  function htmlInvitacion(direccion, codigo) {
    if (direccion) return `<p>${t('Entren desde su dispositivo, en el mismo Wi-Fi:')}</p><p class="direccion-sala" id="direccion-sala">${esc(direccion)}</p><p class="nota">${t('Abran esa dirección, entren a Salas y escriban el código {c}.', { c: codigo })}</p>`;
    return `<p class="alerta info">⚠️ ${t('Por ahora esta sala solo se puede usar en esta computadora. Para que entren otros dispositivos, reinicia el servidor con: {c}', { c: 'python app.py --lan' })}</p>`;
  }

  async function buscarInvitacion() {
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { invitacion = location.origin; return; }
    try {
      const r = await api('/api/red');
      invitacion = r.url || null;
      const el = raiz && raiz.querySelector('#invitacion');
      if (el && S && S.datos) el.innerHTML = htmlInvitacion(invitacion, S.datos.codigo);
    } catch (e) { /* se mantiene el aviso */ }
  }

  function textosPregunta(d) { return tx(d.pregunta.textos); }

  function htmlPregunta(d) {
    const q = textosPregunta(d);
    const respondio = d.yo && d.yo.respondio !== null && d.yo.respondio !== undefined;
    return `
    ${barraSala(d, `<span class="chip-sala">🙋 ${d.respondieron}/${d.ranking.length}</span>`)}
    ${relojHtml()}
    <p class="etiqueta centro-texto">${t(TEMAS[d.pregunta.tema] || d.pregunta.tema)}</p>
    <h1 class="pregunta-sala">${esc(q.p)}</h1>
    <div class="fichas-respuesta n-${q.o.length} ${d.yo ? '' : 'solo-ver'}">
      ${q.o.map((o, i) => `<button type="button" class="ficha-resp f${i} ${respondio && d.yo.respondio === i ? 'elegida' : ''}" data-sala="responder" data-i="${i}" ${!d.yo || respondio ? 'disabled' : ''}><span aria-hidden="true">${FICHAS[i]}</span><span>${esc(o)}</span></button>`).join('')}
    </div>
    ${respondio ? `<p class="espera-resp" role="status">✅ ${t('¡Respuesta enviada! Esperando a los demás…')}</p>` : ''}
    <div class="acciones centro">${controlAnfitrion(d, t('Cerrar pregunta'))}</div>`;
  }

  function htmlRanking(d, limite = 5) {
    const lista = d.ranking.slice(0, limite);
    return `${d.equipos ? `<h2>${t('Equipos')}</h2><ol class="ranking">${d.equipos.map((e, i) => `<li class="eq-${e.id}"><span class="pos">${i + 1}</span><span class="nom">${NOMBRE_EQUIPO[e.id][0]} ${t(NOMBRE_EQUIPO[e.id][1])} <small>(${e.n})</small></span><b>${e.puntos}</b></li>`).join('')}</ol>` : ''}
    <h2>${t('Ranking')}</h2><ol class="ranking">${lista.map((j, i) => `<li class="${d.yo && d.yo.id === j.id ? 'soy-yo' : ''}"><span class="pos">${i + 1}</span>${avatar(j.avatar, 's')}<span class="nom">${esc(j.apodo)}</span><b>${j.puntos}</b></li>`).join('')}</ol>
    ${d.yo && d.yo.posicion > limite ? `<p class="nota centro-texto">${t('Vas en el lugar {n}.', { n: d.yo.posicion })}</p>` : ''}`;
  }

  function htmlResultado(d) {
    const q = textosPregunta(d);
    const r = d.resultado;
    const u = d.yo && d.yo.ultimo;
    const max = Math.max(1, ...r.dist);
    return `
    ${barraSala(d)}
    ${u ? `<div class="veredicto ${u.correcta ? 'bien' : 'mal'}">${u.correcta ? `🎉 ${t('¡Correcto!')} <b>+${u.puntos}</b>${d.yo.racha >= 2 ? ` · 🔥 ${t('Racha de {n}', { n: d.yo.racha })}` : ''}` : u.respondio ? `💥 ${t('Esta vez no')}` : `⏰ ${t('Se acabó el tiempo')}`}</div>` : ''}
    <h1 class="pregunta-sala">${esc(q.p)}</h1>
    <div class="reparto">
      ${q.o.map((o, i) => `<div class="reparto-fila ${i === r.c ? 'correcta' : ''} ${d.yo && d.yo.respondio === i ? 'mia' : ''}"><span class="reparto-texto"><span aria-hidden="true">${i === r.c ? '✅' : FICHAS[i]}</span> ${esc(o)}</span><span class="reparto-n">${r.dist[i]}</span><span class="reparto-barra"><span data-ancho="${(r.dist[i] / max) * 100}"></span></span></div>`).join('')}
    </div>
    ${tx(r.explicacion) ? `<p class="explicacion">💡 ${esc(tx(r.explicacion))}</p>` : ''}
    ${htmlRanking(d)}
    <div class="acciones centro">${controlAnfitrion(d, d.ronda + 1 >= d.rondas ? t('Ver resultados finales') : t('Siguiente pregunta'))}</div>`;
  }

  /* ---------- Detectives del Mirador ---------- */
  const personaje = (id) => PERSONAJES[id] || { n: id, i: '❓' };
  const fichaPista = (p, extra = '', sello = '') => `<li class="pista ${extra}"><span class="pista-texto">${esc(tx(p.textos))}</span>${sello}</li>`;

  function htmlCaso(d) {
    const c = d.caso;
    const tc = tx(c.textos);
    const yo = d.yo;
    const titulo = { pistas: ['🔍', 'Reúnan las pistas'], votar: ['🗳️', 'Voten: ¿qué pasó?'], actuar: ['🤝', '¿Cómo hay que actuar?'], revelar: ['📂', 'Caso resuelto'] }[d.fase];
    let cuerpo = '';
    if (d.fase === 'pistas') cuerpo = cuerpoPistas(d, c, yo);
    if (d.fase === 'votar') cuerpo = cuerpoVotar(d, c, yo);
    if (d.fase === 'actuar') cuerpo = cuerpoActuar(d, c, yo);
    if (d.fase === 'revelar') cuerpo = cuerpoRevelar(d, c, yo);
    return `
    ${barraSala(d, yo && yo.mascara ? `<span class="chip-sala">🎭 ${esc(yo.mascara)}</span>` : '')}
    ${d.fase !== 'revelar' ? relojHtml() : ''}
    <p class="ficticio">🎭 ${t('Caso y personajes ficticios')}</p>
    <h1 class="titulo-caso">${titulo[0]} ${t(titulo[1])}</h1>
    <details class="tarjeta caso-intro" ${d.fase === 'pistas' ? 'open' : ''}><summary><strong>📁 ${esc(tc.titulo)}</strong></summary><p>${esc(tc.intro)}</p></details>
    ${cuerpo}`;
  }

  function tablero(c, resultado) {
    return `<h2>📌 ${t('Tablero del grupo')} (${c.tablero.length})</h2>
    ${c.tablero.length ? `<ul class="pistas">${c.tablero.map((p) => {
      const falsa = resultado && resultado.falsas.includes(p.id);
      return fichaPista(p, resultado ? (falsa ? 'falsa' : 'real') : '', `<span class="sello-mascara" title="${t('Publicada por esta máscara')}">${esc(p.mascara)}${resultado ? (falsa ? ' ❌' : ' ✅') : ''}</span>`);
    }).join('')}</ul>` : `<p class="nota">${t('Todavía no hay pistas publicadas.')}</p>`}`;
  }

  function feedHtml(c) {
    if (!c.feed.length) return '';
    return `<ul class="feed" aria-label="${t('Mensajes del grupo')}">${c.feed.slice(-8).map((f) => {
      const objetivo = f.objetivo ? (PERSONAJES[f.objetivo] ? `${personaje(f.objetivo).i} ${personaje(f.objetivo).n}` : f.objetivo) : '';
      const texto = f.frase === 'sospecho' ? t('🔎 Sospecho de {x}', { x: objetivo }) : f.frase === 'descarto' ? t('❌ Descarto a {x}', { x: objetivo }) : t(FRASES[f.frase]);
      return `<li><span class="sello-mascara">${esc(f.mascara)}</span> ${esc(texto)}</li>`;
    }).join('')}</ul>`;
  }

  function frasesRapidas(yo) {
    if (!yo) return '';
    return `<div class="frases"><p class="nota">💬 ${t('Frases rápidas (quedan {n}). No hay chat libre: así nadie puede insultar ni dar datos.', { n: yo.frasesRestantes })}</p>${Object.keys(FRASES).map((f) => `<button class="chip-frase" type="button" data-sala="frase" data-frase="${f}" ${yo.frasesRestantes ? '' : 'disabled'}>${t(FRASES[f])}</button>`).join('')}</div>`;
  }

  function cuerpoPistas(d, c, yo) {
    return `
    ${yo ? `<div class="tarjeta papel ${yo.eco ? 'papel-eco' : 'papel-detective'}">
      <h2>${yo.eco ? `🌀 ${t('Tu papel secreto: Eco')}` : `🕵️ ${t('Tu papel secreto: Detective')}`}</h2>
      <p>${yo.eco ? t('Eres parte del juego: mezcla pistas sin verificar para confundir al grupo. Ganas puntos si no logran resolver el caso o no descubren tu máscara. Este papel lo eligió el azar.') : t('Comparte tus pistas, compara fuentes y cuidado: una máscara difunde pistas falsas.')}</p>
      <p class="nota">${t('Tu máscara en este caso es {m}. Nadie sabe que eres tú.', { m: yo.mascara })}</p>
      <h3>${t('Tus pistas')}</h3>
      <ul class="pistas">${yo.pistas.map((p) => fichaPista(p, p.publicada ? 'publicada' : '', p.publicada ? `<span class="sello-mascara">📌</span>` : `<button class="boton pequeno" type="button" data-sala="publicar" data-pista="${p.id}">📌 ${t('Publicar')}</button>`)).join('')}</ul>
    </div>` : ''}
    <h2>👥 ${t('Personajes del caso')}</h2>
    <ul class="sospechosos">${c.sospechosos.map((s) => `<li class="sospechoso"><span class="s-icono" aria-hidden="true">${personaje(s).i}</span><b>${esc(personaje(s).n)}</b>${yo ? `<span class="s-botones"><button type="button" class="mini" data-sala="frase" data-frase="sospecho" data-objetivo="${s}" aria-label="${esc(t('🔎 Sospecho de {x}', { x: personaje(s).n }))}">🔎</button><button type="button" class="mini" data-sala="frase" data-frase="descarto" data-objetivo="${s}" aria-label="${esc(t('❌ Descarto a {x}', { x: personaje(s).n }))}">❌</button></span>` : ''}</li>`).join('')}</ul>
    ${tablero(c)}
    ${frasesRapidas(yo)}
    ${feedHtml(c)}
    <div class="acciones centro">${controlAnfitrion(d, t('Pasar a votación'))}</div>`;
  }

  function cuerpoVotar(d, c, yo) {
    const v = (yo && yo.voto) || S.voto;
    const yaVoto = !!(yo && yo.voto);
    const eleccion = (grupo, valor, contenido) => `<button type="button" class="chip-voto ${v[grupo] === valor ? 'elegido' : ''}" data-sala="elegir" data-grupo="${grupo}" data-valor="${esc(valor)}" aria-pressed="${v[grupo] === valor}" ${yaVoto || !yo ? 'disabled' : ''}>${contenido}</button>`;
    return `
    ${tablero(c)}
    ${feedHtml(c)}
    <p class="etiqueta centro-texto">🗳️ ${t('Votaron {n} de {m}', { n: d.votaron, m: d.ranking.length })}</p>
    ${yo ? `
    <h2>1. ${t('¿Qué personaje ficticio lo hizo?')}</h2>
    <div class="chips-voto">${c.sospechosos.map((s) => eleccion('sospechoso', s, `<span aria-hidden="true">${personaje(s).i}</span> ${esc(personaje(s).n)}`)).join('')}</div>
    <h2>2. ${t('¿Qué tipo de situación es?')}</h2>
    <div class="chips-voto">${Object.keys(SITUACIONES).map((s) => eleccion('situacion', s, `<span aria-hidden="true">${SITUACIONES[s][0]}</span> ${t(SITUACIONES[s][1])}`)).join('')}</div>
    <h2>3. ${t('¿Qué máscara difundió pistas falsas? (opcional)')}</h2>
    <p class="nota">${t('Es una máscara del juego y cambia en cada caso: no señala a ninguna persona.')}</p>
    <div class="chips-voto">${c.mascaras.filter((m) => m !== yo.mascara).map((m) => eleccion('mascara', m, esc(m))).join('')}</div>
    <div class="acciones centro">${yaVoto ? `<p class="espera-resp" role="status">✅ ${t('¡Voto enviado! Esperando a los demás…')}</p>` : `<button class="boton-juego" type="button" data-sala="votar" ${v.sospechoso && v.situacion ? '' : 'disabled'}>🗳️ ${t('Enviar voto')}</button>`}</div>` : ''}
    <div class="acciones centro">${controlAnfitrion(d, t('Pasar a la acción'))}</div>`;
  }

  function cuerpoActuar(d, c, yo) {
    const opciones = tx(c.acciones);
    const hecho = yo && yo.accion !== null && yo.accion !== undefined;
    return `
    <p class="centro-texto">${t('Eres testigo de esta situación. ¿Qué es lo correcto?')}</p>
    <div class="acciones-caso">${opciones.map((o, i) => `<button type="button" class="ficha-accion ${hecho && yo.accion === i ? 'elegida' : ''}" data-sala="actuar" data-i="${i}" ${!yo || hecho ? 'disabled' : ''}><span aria-hidden="true">${FICHAS[i]}</span> ${esc(o)}</button>`).join('')}</div>
    <p class="etiqueta centro-texto">🤝 ${t('Respondieron {n} de {m}', { n: d.actuaron, m: d.ranking.length })}</p>
    ${hecho ? `<p class="espera-resp" role="status">✅ ${t('¡Respuesta enviada! Esperando a los demás…')}</p>` : ''}
    <div class="acciones centro">${controlAnfitrion(d, t('Revelar el caso'))}</div>`;
  }

  function barrasVotos(titulo, votos, etiqueta, correcta) {
    const claves = Object.keys(votos);
    if (!claves.length) return '';
    const max = Math.max(...claves.map((k) => votos[k]));
    return `<div class="reparto"><p class="etiqueta">${titulo}</p>${claves.map((k) => `<div class="reparto-fila ${correcta.includes(k) ? 'correcta' : ''}"><span class="reparto-texto">${etiqueta(k)}</span><span class="reparto-n">${votos[k]}</span><span class="reparto-barra"><span data-ancho="${(votos[k] / max) * 100}"></span></span></div>`).join('')}</div>`;
  }

  function cuerpoRevelar(d, c, yo) {
    const r = d.resultado;
    const u = yo && yo.ultimo;
    const culpable = personaje(r.culpable);
    return `
    <div class="revelacion">
      <div class="personaje-revelado" aria-hidden="true">${culpable.i}</div>
      <h2>${t('Fue {x}', { x: esc(culpable.n) })} · <span class="tipo-caso">${SITUACIONES[r.tipo][0]} ${t(SITUACIONES[r.tipo][1])}</span></h2>
      <p>${esc(tx(r.explicacion))}</p>
      <p class="explicacion">💡 <strong>${t('Lo correcto:')}</strong> ${esc(tx(c.acciones)[r.accion])}</p>
      <p class="explicacion">📚 ${esc(tx(r.leccion))}</p>
    </div>
    ${u ? `<div class="veredicto ${u.puntos ? 'bien' : 'mal'}">
      ${u.soyEco ? `🌀 ${t('Eras el Eco.')} ` : ''}<b>+${u.puntos}</b>
      <span class="desglose">${u.culpable ? '✅' : '❌'} ${t('Quién')} · ${u.tipo ? '✅' : '❌'} ${t('Tipo')} · ${u.accion ? '✅' : '❌'} ${t('Acción')} · ${u.eco ? '✅' : '➖'} ${t('Eco')}</span>
    </div>` : ''}
    <p class="centro-texto">🌀 ${t('Las máscaras Eco eran:')} <strong>${r.ecos.map(esc).join(' ')}</strong>. ${r.ecoDescubierto ? t('¡El grupo las descubrió!') : t('El grupo no las descubrió.')} ${t('Era un papel del juego, elegido al azar.')}</p>
    ${barrasVotos(t('Votos: ¿quién fue?'), r.votosSospechoso, (k) => `${personaje(k).i} ${esc(personaje(k).n)}`, [r.culpable])}
    ${barrasVotos(t('Votos: ¿qué tipo de situación?'), r.votosTipo, (k) => `${SITUACIONES[k][0]} ${t(SITUACIONES[k][1])}`, [r.tipo])}
    ${tablero(c, r)}
    ${htmlRanking(d)}
    <div class="acciones centro">${controlAnfitrion(d, d.ronda + 1 >= d.rondas ? t('Ver resultados finales') : t('Siguiente caso'))}</div>`;
  }

  /* ---------- Final y recompensas ---------- */
  function htmlFinal(d) {
    const podio = d.ranking.slice(0, 3);
    const orden = [podio[1], podio[0], podio[2]].filter(Boolean);
    return `
    <section class="final-sala">
      <p class="etiqueta">🏁 ${t('Fin de la partida')}</p>
      <h1>${d.equipos && d.equipos[0] ? t('¡Gana el equipo {e}!', { e: `${NOMBRE_EQUIPO[d.equipos[0].id][0]} ${t(NOMBRE_EQUIPO[d.equipos[0].id][1])}` }) : podio[0] ? t('¡{a} gana la partida!', { a: esc(podio[0].apodo) }) : t('Partida terminada')}</h1>
      <div class="podio">${orden.map((j) => { const lugar = d.ranking.indexOf(j) + 1; return `<div class="podio-col lugar-${lugar}">${avatar(j.avatar, 'm')}<b class="podio-nom">${esc(j.apodo)}</b><span class="podio-pts">${j.puntos}</span><div class="podio-base">${['🥇', '🥈', '🥉'][lugar - 1]}</div></div>`; }).join('')}</div>
      ${d.yo ? `<p class="tu-lugar">${t('Quedaste en el lugar {n} con {p} puntos.', { n: d.yo.posicion, p: d.yo.puntos })}</p>` : ''}
      <p id="premio-sala" class="premio-sala" hidden></p>
      ${htmlRanking(d, 10)}
      <div class="acciones centro"><button class="boton-juego" type="button" data-sala="salir">🏠 ${t('Salir de la sala')}</button><a class="boton secundario" href="#/modos">🕹️ ${t('Otros modos')}</a></div>
    </section>`;
  }

  function cobrarRecompensa(d) {
    if (!d.yo || S.cobrado) return;
    S.cobrado = true;
    const r = P.app.recompensaSala(d.codigo, d.modo, d.yo, d.ranking.length);
    const el = raiz.querySelector('#premio-sala');
    if (el && r) { el.hidden = false; el.textContent = t('💰 Ganaste {n} monedas', { n: r.monedas }); J.SFX.moneda(); }
  }

  /* ---------- Acciones ---------- */
  async function enviar(tipo, datos = {}) {
    try {
      await api(`/api/salas/${S.codigo}/accion`, { metodo: 'POST', cabeceras: { 'X-P360-Token': S.token }, cuerpo: Object.assign({ tipo }, datos) });
      return true;
    } catch (e) {
      P.app.aviso(e.message);
      J.SFX.mal();
      return false;
    } finally {
      if (S && vivo) { clearTimeout(relojPoll); consultar(); }
    }
  }

  function alClic(ev) {
    const el = ev.target.closest('[data-sala]');
    if (!el || el.disabled) return;
    const accion = el.dataset.sala;
    switch (accion) {
      case 'dado': { const c = raiz.querySelector('#' + el.dataset.para); if (c) c.value = P.apodoAzar(); J.SFX.clic(); break; }
      case 'iniciar': enviar('iniciar'); break;
      case 'siguiente': enviar('siguiente'); break;
      case 'salir': salirDeSala(true); break;
      case 'expulsar': enviar('expulsar', { id: Number(el.dataset.id) }); break;
      case 'responder': J.SFX.clic(); enviar('responder', { opcion: Number(el.dataset.i) }); break;
      case 'publicar': J.SFX.clic(); enviar('publicar', { pista: Number(el.dataset.pista) }); break;
      case 'frase': J.SFX.clic(); enviar('frase', Object.assign({ frase: el.dataset.frase }, el.dataset.objetivo ? { objetivo: el.dataset.objetivo } : {})); break;
      case 'elegir': J.SFX.clic(); S.voto[el.dataset.grupo] = S.voto[el.dataset.grupo] === el.dataset.valor ? undefined : el.dataset.valor; pintar(false); iniciarRelojTrasPintar(); break;
      case 'votar': J.SFX.moneda(); enviar('votar', { sospechoso: S.voto.sospechoso, situacion: S.voto.situacion, mascara: S.voto.mascara || null }); break;
      case 'actuar': J.SFX.clic(); enviar('actuar', { opcion: Number(el.dataset.i) }); break;
    }
  }
  function iniciarRelojTrasPintar() { if (crono) crono.ajustar(crono.restante()); }

  function alEnviar(ev) {
    const f = ev.target;
    if (f.id === 'sala-crear') { ev.preventDefault(); crearSala(f); }
    if (f.id === 'sala-unirse') { ev.preventDefault(); unirseSala(f); }
  }

  /* Los límites de rondas y segundos cambian según el modo elegido. */
  function alCambiar(ev) {
    if (ev.target.name !== 'modo') return;
    const detectives = ev.target.value === 'detectives';
    const f = ev.target.form;
    const rondas = f.querySelector('#crear-rondas'), seg = f.querySelector('#crear-segundos');
    rondas.max = detectives ? 6 : 20; rondas.value = detectives ? 2 : 8;
    rondas.min = detectives ? 1 : 3;
    seg.min = detectives ? 30 : 10; seg.max = detectives ? 240 : 90; seg.value = detectives ? 90 : 20;
    f.querySelector('.solo-arena').hidden = detectives;
  }

  /* Al volver a la app (teléfono desbloqueado, otra pestaña) se sincroniza de inmediato. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S && vivo) { clearTimeout(relojPoll); consultar(); }
  });

  /* ---------- Vista ---------- */
  P.registrar('sala', {
    musica: null,
    traducida: true,
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(contenedor, param) {
      raiz = contenedor; vivo = true; invitacion = null;
      raiz.addEventListener('click', alClic);
      raiz.addEventListener('submit', alEnviar);
      raiz.addEventListener('change', alCambiar);
      const guardada = leerSesion();
      if (guardada && (!param || param.toUpperCase() === guardada.codigo)) {
        S = { codigo: guardada.codigo, token: guardada.token, version: null, datos: null, fallos: 0, voto: {}, cobrado: false };
        consultar();
        return;
      }
      let conexion = true;
      try { await api('/api/salud'); } catch (e) { conexion = false; }
      if (!vivo || raiz !== contenedor) return;
      raiz.innerHTML = htmlVestibulo(param ? param.toUpperCase() : '', conexion);
      if (param) { const a = raiz.querySelector('#unir-apodo'); if (a) a.focus(); }
    },
    desmontar() {
      vivo = false;
      detenerSondeo();
      if (raiz) { raiz.removeEventListener('click', alClic); raiz.removeEventListener('submit', alEnviar); raiz.removeEventListener('change', alCambiar); }
      raiz = null; S = null;
    }
  });

  /* El modo docente abre aquí la sala de una actividad. */
  P.abrirSala = (codigo, token) => { guardarSesion({ codigo, token }); location.hash = `#/sala/${codigo}`; };
})();
