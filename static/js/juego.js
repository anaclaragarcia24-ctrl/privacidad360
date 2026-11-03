/* PRIVACIDAD 360 — Modo aventura: mundos con escudo (vida), cronómetro, combos, consecuencias, minijuegos, jefe final y cofres.
   Todo el contenido es ficticio y nada de lo que se escribe o elige sale del navegador. Textos traducibles con P360_I18N. */
(function () {
  'use strict';
  const D = window.P360_DATOS;
  const L = window.P360_LOGICA;
  const I = window.P360_I18N;
  const t = (s, v) => I.t(s, v);
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escribirLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin acceso */ } };
  const mezclar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const conIndice = (lista) => lista.map((x, i) => Object.assign({ _i: i }, x));
  const TIEMPOS = { decision: 20, rapido: 7, censura: 25, forja: 30, jefe: 15, orden: 35 };

  /* ---------- Sonido (sintetizado, sin archivos) ---------- */
  let audio = null;
  const sonidoActivo = () => leerLS('p360_sonido') !== '0';
  function tono(freq, dur = 0.12, tipo = 'sine', vol = 0.07, retraso = 0) {
    if (!sonidoActivo()) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime + retraso;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = tipo; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + dur);
    } catch (e) { /* audio no disponible */ }
  }
  const SFX = {
    clic: () => tono(520, 0.05, 'triangle', 0.05),
    bien: () => { tono(660, 0.1, 'triangle'); tono(990, 0.16, 'triangle', 0.07, 0.09); },
    mal: () => { tono(190, 0.25, 'sawtooth', 0.06); tono(140, 0.3, 'sawtooth', 0.05, 0.12); },
    combo: () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.1, 'square', 0.04, i * 0.06)),
    tic: () => tono(1300, 0.03, 'square', 0.03),
    golpe: () => { tono(110, 0.18, 'square', 0.08); tono(70, 0.25, 'sawtooth', 0.06, 0.05); },
    victoria: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.18, 'triangle', 0.06, i * 0.11)),
    cofre: () => [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.14, 'sine', 0.07, i * 0.07)),
    derrota: () => [392, 330, 262, 196].forEach((f, i) => tono(f, 0.22, 'sawtooth', 0.05, i * 0.16)),
    moneda: () => { tono(988, 0.07, 'square', 0.04); tono(1319, 0.18, 'square', 0.04, 0.07); },
    redoble: (seg = 1) => { for (let i = 0, n = Math.round(seg * 14); i < n; i++) tono(150 + i * 12, 0.05, 'square', 0.02 + i * 0.0025, i * seg / n); },
    sirena: () => [620, 880, 620, 880, 620, 880].forEach((f, i) => tono(f, 0.26, 'sawtooth', 0.04, i * 0.27)),
    estrella: (n) => tono(784 + n * 196, 0.3, 'triangle', 0.08),
    latido: () => { tono(62, 0.14, 'sine', 0.16); tono(52, 0.16, 'sine', 0.12, 0.2); },
    nivel: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.16, 'square', 0.045, i * 0.09)),
    insignia: () => [1047, 1319, 1568, 2093].forEach((f, i) => tono(f, 0.12, 'sine', 0.06, i * 0.06)),
    desbloqueo: () => [392, 523, 659, 784, 1047].forEach((f, i) => tono(f, 0.2, 'triangle', 0.07, i * 0.08)),
    caja: () => [1175, 1397, 1760, 1397, 1175].forEach((f, i) => tono(f, 0.1, 'sine', 0.05, i * 0.07))
  };

  /* ---------- Música de fondo (compuesta en el momento con WebAudio, sin archivos) ---------- */
  const PISTAS = {
    aventura: { bpm: 112, tipo: 'triangle', vol: 0.02, acordes: [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]],
      melodia: [659, 0, 784, 0, 880, 784, 659, 0, 523, 0, 659, 0, 784, 659, 523, 0, 698, 0, 880, 0, 1047, 880, 698, 0, 587, 0, 784, 0, 988, 784, 587, 0] },
    jefe: { bpm: 156, tipo: 'square', vol: 0.013, acordes: [[220, 261.6, 329.6], [220, 261.6, 329.6], [174.6, 220, 261.6], [164.8, 196, 246.9]], melodia: null },
    misterio: { bpm: 84, tipo: 'sine', vol: 0.024, acordes: [[220, 261.6, 329.6], [207.7, 246.9, 311.1], [174.6, 220, 261.6], [164.8, 207.7, 246.9]],
      melodia: [440, 0, 0, 523, 0, 0, 494, 0, 415, 0, 0, 0, 330, 0, 0, 0, 349, 0, 0, 440, 0, 0, 415, 0, 330, 0, 0, 0, 247, 0, 0, 0] },
    arena: { bpm: 138, tipo: 'square', vol: 0.012, acordes: [[293.7, 370, 440], [246.9, 293.7, 370], [196, 246.9, 293.7], [220, 277.2, 329.6]],
      melodia: [740, 0, 880, 740, 587, 0, 740, 0, 659, 0, 740, 659, 494, 0, 587, 0, 587, 0, 659, 740, 880, 0, 740, 0, 659, 0, 554, 659, 880, 0, 0, 0] },
    colegio: { bpm: 96, tipo: 'triangle', vol: 0.02, acordes: [[349.2, 440, 523.3], [293.7, 349.2, 440], [233.1, 293.7, 349.2], [261.6, 329.6, 392]],
      melodia: [698, 0, 0, 880, 0, 784, 698, 0, 587, 0, 0, 698, 0, 659, 587, 0, 466, 0, 0, 587, 0, 698, 784, 0, 659, 0, 523, 0, 587, 0, 659, 0] },
    arcade: { bpm: 168, tipo: 'square', vol: 0.011, acordes: [[329.6, 392, 493.9], [261.6, 329.6, 392], [293.7, 370, 440], [246.9, 293.7, 370]], melodia: [988, 0, 784, 0, 659, 784, 988, 0, 1047, 0, 784, 0, 659, 784, 1047, 0] }
  };
  const ARPEGIO = [0, 1, 2, 1, 0, 2, 1, 2];
  const musicaActiva = () => leerLS('p360_musica') !== '0';
  let modoMusica = null, relojMusica = null, salidaMusica = null, pasoMusica = 0, proximaNota = 0, notasTocadas = 0;
  function contextoAudio() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function notaMusica(freq, inicio, dur, tipo, vol) {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, inicio);
    g.gain.setValueAtTime(vol, inicio); g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    o.connect(g); g.connect(salidaMusica); o.start(inicio); o.stop(inicio + dur);
    notasTocadas++;
  }
  function programarMusica() {
    const pista = PISTAS[modoMusica];
    if (!pista || !audio) return;
    const paso8 = 60 / pista.bpm / 2;
    if (proximaNota < audio.currentTime) proximaNota = audio.currentTime + 0.05;
    while (proximaNota < audio.currentTime + 0.35) {
      const acorde = pista.acordes[Math.floor(pasoMusica / 8) % pista.acordes.length];
      notaMusica(acorde[ARPEGIO[pasoMusica % 8]], proximaNota, paso8 * 0.9, pista.tipo, pista.vol);
      if (pasoMusica % 4 === 0) notaMusica(acorde[0] / 2, proximaNota, paso8 * 2.2, 'sine', pista.vol * 2.4);
      if (pista.melodia && pista.melodia[pasoMusica % pista.melodia.length]) notaMusica(pista.melodia[pasoMusica % pista.melodia.length], proximaNota, paso8 * 1.4, 'sine', pista.vol * 1.1);
      pasoMusica++; proximaNota += paso8;
    }
  }
  function actualizarMusica() {
    clearInterval(relojMusica); relojMusica = null;
    if (salidaMusica) { salidaMusica.disconnect(); salidaMusica = null; }
    if (!modoMusica || !musicaActiva() || !audio) return;
    salidaMusica = audio.createGain(); salidaMusica.connect(audio.destination);
    pasoMusica = 0; proximaNota = 0;
    programarMusica();
    relojMusica = setInterval(programarMusica, 120);
  }
  function musica(modo) { if (modo === modoMusica && (relojMusica || !audio)) return; modoMusica = modo; actualizarMusica(); }
  // Los navegadores solo permiten sonido después de que la persona toca algo.
  function primerGesto() {
    try { const nuevo = !audio; contextoAudio(); if (nuevo || !relojMusica) actualizarMusica(); } catch (e) { /* audio no disponible */ }
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, primerGesto));

  /* ---------- Estado de la partida ---------- */
  let P = null;          // partida actual
  let raiz = null;       // contenedor
  let reloj = null;      // intervalo del cronómetro

  function nuevaPartida(mundo, opciones) {
    const preguntas = conIndice(D.EVALUACION.antes).map((q) => Object.assign(q, { _forma: 'antes' }))
      .concat(conIndice(D.EVALUACION.despues).map((q) => Object.assign(q, { _forma: 'despues' })));
    return {
      mundo, pasos: mundo.pasos.map((p) => Object.assign({}, p)), indice: -1, escudo: L.AVENTURA.escudo, puntos: 0, combo: 1, aciertos: 0, intentos: 0,
      fase: 'intro', retro: null, golpes: [], sub: 0, opciones,
      mensajes: mezclar(conIndice(D.MENSAJES_RAPIDOS)), testigo: mezclar(conIndice(D.ACCIONES_TESTIGO)),
      jefeVida: D.JEFE.vida, jefePreguntas: mezclar(preguntas), forja: [], censura: {}, orden: [], ordenMezcla: [], erroresOrden: 0,
      guardado: false, cofreAbierto: false, cofreAbriendo: false,
      // Sorpresa: una caja misteriosa aparece una vez por mundo, en un momento al azar
      cajaEn: Math.floor(Math.random() * Math.max(1, mundo.pasos.length - 1)), caja: null, puntosVistos: 0, faseFinal: false, alerta: false, congelado: null
    };
  }
  const sinMovimiento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pausa = (ms) => (sinMovimiento() ? Math.min(ms, 250) : ms);
  const paso = () => P.pasos[P.indice];
  const sinTiempo = () => leerLS('p360_sin_tiempo') === '1';
  const nombreMundo = (m) => I.loc('mundo', m).nombre;

  /* ---------- Cronómetro ---------- */
  function iniciarReloj(segundos, alAgotarse) {
    detenerReloj();
    P.tiempoTotal = segundos; P.tiempoFin = Date.now() + segundos * 1000; P.congelado = null;
    if (sinTiempo()) return;
    let ultimoTic = segundos, ultimoLatido = 0;
    reloj = setInterval(() => {
      const resta = Math.max(0, (P.tiempoFin - Date.now()) / 1000);
      const barra = raiz && raiz.querySelector('.reloj-relleno');
      if (barra) { barra.style.width = (resta / segundos * 100) + '%'; barra.classList.toggle('urgente', resta < 4); }
      const n = Math.ceil(resta);
      if (n <= 3 && n < ultimoTic && n > 0) { ultimoTic = n; SFX.tic(); }
      if (P.escudo <= 30 && Date.now() - ultimoLatido > 1100) { ultimoLatido = Date.now(); SFX.latido(); }   // tensión con el escudo bajo
      if (resta <= 0) { detenerReloj(); alAgotarse(); }
    }, 100);
  }
  function detenerReloj() { if (reloj) { clearInterval(reloj); reloj = null; } }
  const tiempoRestante = () => {
    if (P.congelado !== null) return P.congelado;
    return (sinTiempo() || !P.tiempoFin) ? P.tiempoTotal || 0 : Math.max(0, (P.tiempoFin - Date.now()) / 1000);
  };
  /* Suspenso: congela el tiempo, resalta lo elegido y hace esperar antes de revelar el resultado. */
  function conSuspenso(boton, ms, resolver) {
    P.congelado = tiempoRestante();
    detenerReloj();
    P.fase = 'suspenso';
    const partida = P;
    const juego = raiz.querySelector('.juego');
    if (juego) { juego.dataset.fase = 'suspenso'; juego.classList.add('en-suspenso'); }
    if (boton) boton.classList.add('elegida');
    SFX.redoble(ms / 1000);
    setTimeout(() => { if (P === partida && P.fase === 'suspenso') resolver(); }, pausa(ms));
  }

  /* ---------- Efectos visuales ---------- */
  function flotar(texto, clase) {
    if (!raiz) return;
    const f = document.createElement('div');
    f.className = 'flotante-pts ' + clase; f.textContent = texto;
    f.style.left = (35 + Math.random() * 30) + '%';
    raiz.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
  function sacudir(el) { if (!el) return; el.classList.remove('sacude'); void el.offsetWidth; el.classList.add('sacude'); }
  function destello(tipo) {
    const d = document.createElement('div');
    d.className = 'destello ' + tipo; document.body.appendChild(d); setTimeout(() => d.remove(), 450);
  }

  /* ---------- Resolver respuestas ---------- */
  function acertar(texto, danioJefe) {
    const r = L.puntuarRespuesta(true, tiempoRestante(), P.tiempoTotal, P.combo);
    P.puntos += r.puntos; P.aciertos++; P.intentos++;
    const subioCombo = r.combo > P.combo; P.combo = r.combo;
    P.escudo = Math.min(L.AVENTURA.escudo, P.escudo + 5);
    if (danioJefe) P.jefeVida = Math.max(0, P.jefeVida - danioJefe);
    SFX.bien(); setTimeout(SFX.moneda, 120); destello('bien');
    if (subioCombo && P.combo >= 2) setTimeout(SFX.combo, 150);
    return { bien: true, puntos: r.puntos, texto, combo: P.combo };
  }
  function fallar(texto, consecuencia, danio = L.AVENTURA.danio) {
    P.escudo = Math.max(0, P.escudo - danio); P.combo = 1; P.intentos++;
    if (consecuencia) P.golpes.push(consecuencia);
    SFX.mal(); destello('mal');
    return { bien: false, danio, texto, consecuencia };
  }
  function mostrarRetro(r, auto) {
    detenerReloj();
    P.retro = r; P.fase = 'retro';
    pintar();
    if (r.bien) flotar('+' + r.puntos, 'pts'); else flotar('-' + r.danio + ' 🛡️', 'danio');
    if (!r.bien) sacudir(raiz.querySelector('.hud'));
    if (r.bien && r.combo >= 2) flotar('COMBO ×' + r.combo, 'combo');
    if (auto) setTimeout(() => { if (P && P.retro === r) continuar(); }, auto);
  }
  const consecuencia = (tema) => I.loc('consecuencia', { tema, texto: D.CONSECUENCIAS[tema] }).texto;

  /* ---------- Flujo ---------- */
  function siguientePaso() {
    if (P.escudo <= 0) return finalizar(false);
    if (P.indice === P.cajaEn && P.indice >= 0 && !P.caja) return abrirSorpresa();
    P.indice++; P.sub = 0; P.retro = null; P.forja = []; P.censura = {}; P.orden = []; P.erroresOrden = 0;
    if (P.indice >= P.pasos.length) return finalizar(true);
    if (paso().tipo === 'orden') P.ordenMezcla = mezclar(D.RUTA_DENUNCIA.map((_, i) => i));
    P.fase = 'reto';
    arrancarPaso();
  }
  /* Caja misteriosa: tres cajas, una recompensa o trampa en cada una. */
  function abrirSorpresa() {
    const premios = [{ id: 'puntos', icono: '💎', texto: t('+250 puntos') }, { id: 'escudo', icono: '🛡️', texto: t('+20 de escudo') },
      { id: 'combo', icono: '🔥', texto: t('¡Combo +1!') }, { id: 'virus', icono: '🦠', texto: t('¡Virus! -10 de escudo') }];
    P.caja = { premios: mezclar(premios).slice(0, 3), elegida: null };
    P.fase = 'caja'; SFX.caja();
    pintar();
  }
  function elegirCaja(i, boton) {
    if (P.caja.elegida !== null || P.fase !== 'caja') return;
    conSuspenso(boton, 800, () => {
      P.caja.elegida = i; P.fase = 'caja';
      const premio = P.caja.premios[i].id;
      if (premio === 'puntos') { P.puntos += 250; SFX.moneda(); destello('bien'); }
      else if (premio === 'escudo') { P.escudo = Math.min(L.AVENTURA.escudo, P.escudo + 20); SFX.bien(); destello('bien'); }
      else if (premio === 'combo') { P.combo = Math.min(L.AVENTURA.comboMax, P.combo + 1); SFX.combo(); destello('bien'); }
      else { P.escudo = Math.max(5, P.escudo - 10); SFX.mal(); destello('mal'); }   // la trampa asusta, pero nunca te elimina
      pintar();
    });
  }
  /* Entrada del jefe: alarma, música de batalla y unos segundos de tensión. */
  function alertaJefe() {
    P.alerta = true; P.fase = 'alerta';
    musica('jefe'); SFX.sirena();
    pintar();
    const partida = P;
    setTimeout(() => { if (P === partida && P.fase === 'alerta') { P.fase = 'reto'; arrancarPaso(); } }, pausa(1800));
  }
  function arrancarPaso() {
    const p = paso();
    if (p.tipo === 'jefe' && !P.alerta) return alertaJefe();
    pintar();
    if (p.tipo === 'decision') iniciarReloj(TIEMPOS.decision, () => mostrarRetro(fallar(t('⏰ ¡Se acabó el tiempo!'), consecuencia(escenario().tema))));
    else if (p.tipo === 'rapido') iniciarReloj(TIEMPOS.rapido, () => mostrarRetro(fallar(t('⏰ ¡Muy lento!'), null, 15), 1300));
    else if (p.tipo === 'censura') iniciarReloj(TIEMPOS.censura, () => publicar());
    else if (p.tipo === 'forja') iniciarReloj(TIEMPOS.forja, () => forjar());
    else if (p.tipo === 'orden') iniciarReloj(TIEMPOS.orden, () => terminarOrden(true));
    else if (p.tipo === 'jefe') iniciarReloj(P.faseFinal ? 10 : TIEMPOS.jefe, () => mostrarRetro(fallar(t('⏰ ¡El Hacker te atacó mientras dudabas!'), null), 1500));
  }
  function continuar() {
    const p = paso();
    P.retro = null;
    if (P.escudo <= 0) return finalizar(false);
    if (p.tipo === 'rapido' && ++P.sub < p.n) { P.fase = 'reto'; return arrancarPaso(); }
    if (p.tipo === 'jefe' && P.jefeVida > 0) {
      P.sub++; P.fase = 'reto';
      // Sorpresa: con poca vida el jefe se enfurece y da menos tiempo
      if (P.jefeVida <= 40 && !P.faseFinal) { P.faseFinal = true; SFX.sirena(); destello('mal'); arrancarPaso(); flotar(t('¡FASE FINAL!'), 'combo'); return; }
      return arrancarPaso();
    }
    siguientePaso();
  }
  function finalizar(completado) {
    detenerReloj();
    P.fase = completado ? 'fin' : 'gameover';
    P.estrellas = L.estrellasMundo(P.aciertos, P.intentos, completado);
    musica('aventura');
    if (completado) { SFX.victoria(); for (let n = 1; n <= P.estrellas; n++) setTimeout(() => SFX.estrella(n), 500 + (n - 1) * 350); } else SFX.derrota();
    guardarResultado();   // se guarda de inmediato; el cofre solo muestra la recompensa
    pintar();
  }
  function abrirCofre(boton) {
    if (P.cofreAbriendo || P.cofreAbierto) return;
    P.cofreAbriendo = true;
    boton.classList.add('abriendo');
    SFX.redoble(0.9);
    const partida = P;
    setTimeout(() => {
      if (P !== partida) return;
      P.cofreAbierto = true; SFX.cofre();
      if (P.opciones.alAbrirCofre) P.opciones.alAbrirCofre(P.estrellas);
      if (!(P.opciones.previo || {}).estrellas && D.MUNDOS[D.MUNDOS.findIndex((m) => m.id === P.mundo.id) + 1]) setTimeout(SFX.desbloqueo, 450);
      pintar();
    }, pausa(900));
  }
  function guardarResultado() {
    if (P.guardado) return;
    P.guardado = true;
    P.opciones.alTerminar({ mundo: P.mundo.id, estrellas: P.estrellas, puntos: P.puntos, completado: P.fase === 'fin' });
  }

  /* ---------- Acciones por tipo de reto ---------- */
  function escenario() {
    const id = paso().esc;
    return I.loc('escenario', D.ESCENARIOS.find((e) => e.id === id) || D.ESCENARIOS_JUEGO.find((e) => e.id === id));
  }
  const tarjetaRapida = () => {
    const p = paso();
    return p.set === 'testigo' ? I.loc('testigo', P.testigo[P.sub % P.testigo.length]) : I.loc('mensaje', P.mensajes[P.sub % P.mensajes.length]);
  };
  function elegirDecision(k, boton) {
    const e = escenario();
    conSuspenso(boton, 1100, () => mostrarRetro(k === e.ok ? acertar(e.explicacion) : fallar(e.explicacion, consecuencia(e.tema))));
  }
  function elegirRapido(primerBoton) {
    const c = tarjetaRapida();
    const correcto = paso().set === 'testigo' ? (primerBoton === c.ayuda) : (primerBoton === c.engano);
    const golpe = paso().set === 'testigo' ? (c.ayuda ? null : consecuencia('bullying')) : (c.engano ? t('🎣 Caíste en un engaño') : null);
    mostrarRetro(correcto ? acertar(c.pista) : fallar(c.pista, golpe, 15), 1300);
  }
  function publicar() {
    const post = I.loc('publicacion', Object.assign({ _i: paso().post }, D.PUBLICACIONES[paso().post]));
    let faltan = 0, sobran = 0;
    post.elementos.forEach((el, i) => { if (el.riesgo && !P.censura[i]) faltan++; if (!el.riesgo && P.censura[i]) sobran++; });
    const r = (faltan === 0 && sobran === 0)
      ? acertar(t('¡Publicación segura! Tapaste todos los datos riesgosos y dejaste lo demás.'))
      : fallar(((faltan ? t('Se te escaparon {n} dato(s) riesgoso(s).', { n: faltan }) + ' ' : '') + (sobran ? t('Tapaste {n} cosa(s) que no tenían riesgo.', { n: sobran }) : '')).trim(),
        faltan ? t('🦈 Un desconocido juntó tus datos') : null, faltan ? 15 * faltan : 5 * sobran);
    mostrarRetro(r);
  }
  function forjar() {
    const clave = P.forja.join('');
    const ev = L.evaluarContrasena(clave);
    const r = ev.puntaje >= 3
      ? acertar(t('Contraseña «{etiqueta}» de {n} caracteres. ¡Los lobos no pudieron adivinarla! (Es solo un ejemplo: no se guarda.)', { etiqueta: t(ev.etiqueta), n: ev.largo }))
      : fallar(t('Contraseña «{etiqueta}». Usa varias palabras, sin nombres ni años, y que sea larga.', { etiqueta: t(ev.etiqueta) }), t('🔓 Una computadora la adivinó en segundos'));
    mostrarRetro(r);
  }
  function tocarPasoOrden(i, boton) {
    if (P.orden.includes(i)) return;
    if (i === P.orden.length) { P.orden.push(i); SFX.bien(); pintarSinReloj(); if (P.orden.length === D.RUTA_DENUNCIA.length) terminarOrden(false); }
    else { P.erroresOrden++; SFX.mal(); sacudir(boton); flotar(t('¡Ese no va aquí!'), 'danio'); }
  }
  function terminarOrden(agotado) {
    const ruta = I.loc('ruta', { pasos: D.RUTA_DENUNCIA }).pasos;
    const resumen = t('Orden correcto: {pasos}', { pasos: ruta.map((p, i) => `${i + 1}) ${p.replace(/^\S+\s/, '')}`).join(' · ') });
    if (!agotado && P.erroresOrden === 0) return mostrarRetro(acertar(resumen));
    const danio = agotado ? 30 : Math.min(30, 10 * P.erroresOrden);
    mostrarRetro(fallar((agotado ? t('⏰ ¡Se acabó el tiempo!') + ' ' : '') + resumen, consecuencia('acoso'), danio));
  }
  function elegirJefe(k, boton) {
    const q = I.loc('evaluacion', P.jefePreguntas[P.sub % P.jefePreguntas.length]);
    conSuspenso(boton, 650, () => {
      const r = k === q.c ? acertar(t('¡Golpe crítico! La respuesta correcta era: «{r}».', { r: q.o[q.c] }), D.JEFE.golpe)
        : fallar(t('El Hacker contraatacó. La respuesta correcta era: «{r}».', { r: q.o[q.c] }), t('👾 El Hacker te robó datos'));
      if (r.bien) SFX.golpe();
      mostrarRetro(r, P.jefeVida <= 0 ? 0 : 1700);
    });
  }

  /* ---------- Pintar ---------- */
  function hud() {
    const nivelEscudo = P.escudo > 60 ? 'bien' : P.escudo > 30 ? 'medio' : 'mal';
    return `<div class="hud">
      <span class="hud-mundo">${P.mundo.icono} <strong>${esc(nombreMundo(P.mundo))}</strong></span>
      <span class="hud-paso">${t('Reto {n}/{total}', { n: Math.min(P.indice + 1, P.pasos.length), total: P.pasos.length })}</span>
      <span class="hud-escudo" aria-label="${t('Escudo {n} de 100', { n: P.escudo })}">🛡️ <span class="escudo-barra"><span class="escudo-relleno ${nivelEscudo}" data-ancho="${P.escudo}"></span></span> ${P.escudo}</span>
      <span class="hud-puntos">⭐ <strong>${P.puntos}</strong></span>
      <span class="hud-combo ${P.combo >= 2 ? 'activo' : ''}">🔥 ×${P.combo}</span>
    </div>
    <div class="reloj" aria-hidden="true"><span class="reloj-relleno"></span></div>
    ${sinTiempo() ? `<p class="nota sin-limite">${t('⏱ Modo sin límite de tiempo')}</p>` : ''}`;
  }

  function vistaReto() {
    const p = paso();
    if (p.tipo === 'decision') {
      const e = escenario();
      return `<article class="reto reto-decision"><p class="chip-cat">${esc(e.canal)}</p>
        <div class="enemigo" aria-hidden="true">${P.mundo.enemigo}</div><h2>${esc(e.titulo)}</h2>
        <div class="burbuja"><small>${esc(e.remitente)}</small><p>${esc(e.mensaje)}</p></div>
        <p class="pregunta-sim">${t('¿Qué haces?')}</p>
        <div class="opciones-escenario">${e.opciones.map((o, k) => `<button type="button" class="opcion-boton" data-j="decision" data-k="${k}"><span class="letra">${'ABC'[k]}</span> ${esc(o)}</button>`).join('')}</div></article>`;
    }
    if (p.tipo === 'rapido') {
      const c = tarjetaRapida();
      if (p.set === 'testigo') {
        return `<article class="reto reto-rapido"><p class="chip-cat">${t('⚡ ¿Ayuda o empeora? · acción {n} de {total}', { n: P.sub + 1, total: p.n })}</p>
          <div class="testigo"><span class="testigo-icono" aria-hidden="true">👀</span><p>${esc(c.texto)}</p></div>
          <div class="dos-botones"><button type="button" class="boton-juego seguro" data-j="rapido" data-v="1">${t('🤝 ¡Ayuda!')}</button>
          <button type="button" class="boton-juego peligro" data-j="rapido" data-v="0">${t('💥 Empeora')}</button></div></article>`;
      }
      return `<article class="reto reto-rapido"><p class="chip-cat">${t('⚡ ¿Engaño o seguro? · mensaje {n} de {total}', { n: P.sub + 1, total: p.n })}</p>
        <div class="telefono"><div class="noti"><strong>${esc(c.de)}</strong><p>${esc(c.texto)}</p></div></div>
        <div class="dos-botones"><button type="button" class="boton-juego peligro" data-j="rapido" data-v="1">${t('🚩 ¡Engaño!')}</button>
        <button type="button" class="boton-juego seguro" data-j="rapido" data-v="0">${t('✅ Seguro')}</button></div></article>`;
    }
    if (p.tipo === 'censura') {
      const post = I.loc('publicacion', Object.assign({ _i: p.post }, D.PUBLICACIONES[p.post]));
      return `<article class="reto reto-censura"><p class="chip-cat">${t('🖍️ Toca los datos riesgosos para taparlos antes de publicar')}</p>
        <div class="post"><div class="post-imagen" aria-hidden="true">${post.imagen}</div>
        ${post.elementos.map((el, i) => `<button type="button" class="post-dato ${P.censura[i] ? 'tapado' : ''}" data-j="censurar" data-i="${i}" data-tapado="${t('█████ TAPADO 🖍️')}" aria-pressed="${!!P.censura[i]}"><span>${esc(el.t)}</span></button>`).join('')}</div>
        <button type="button" class="boton-juego" data-j="publicar">${t('📤 Publicar')}</button></article>`;
    }
    if (p.tipo === 'forja') {
      const clave = P.forja.join('');
      const ev = L.evaluarContrasena(clave);
      const nivel = ['alto', 'alto', 'medio', 'bajo', 'bajo'][ev.puntaje];
      return `<article class="reto reto-forja"><p class="chip-cat">${t('🔨 Forja una contraseña de ejemplo «Fuerte» tocando fichas')}</p>
        <div class="yunque" aria-live="polite">${clave ? esc(clave) : `<span class="nota">${t('toca las fichas…')}</span>`}</div>
        <div class="medidor-clave">${[0, 1, 2, 3, 4].map((k) => `<span class="segmento ${clave && k <= ev.puntaje ? 'nivel-' + nivel : ''}"></span>`).join('')}</div>
        <p><strong>${clave ? t(ev.etiqueta) : t('Sin evaluar')}</strong> · ${t('{n} caracteres', { n: ev.largo })}</p>
        <div class="fichas">${I.loc('fichas', { fichas: D.FICHAS_CLAVE }).fichas.map((f) => `<button type="button" class="ficha" data-j="ficha" data-f="${esc(f)}">${esc(f)}</button>`).join('')}</div>
        <div class="acciones"><button type="button" class="boton secundario" data-j="borrar-ficha">${t('⌫ Borrar')}</button><button type="button" class="boton-juego" data-j="forjar">${t('🔨 ¡Forjar!')}</button></div></article>`;
    }
    if (p.tipo === 'orden') {
      const ruta = I.loc('ruta', { pasos: D.RUTA_DENUNCIA }).pasos;
      return `<article class="reto reto-orden"><p class="chip-cat">${t('🧭 Ruta de denuncia segura: toca los pasos en el orden correcto')}</p>
        <ol class="ruta-armada">${ruta.map((r, i) => `<li class="${i < P.orden.length ? 'puesto' : ''}">${i < P.orden.length ? esc(ruta[P.orden[i]]) : `<span class="hueco">${i + 1}</span>`}</li>`).join('')}</ol>
        <div class="piezas">${P.ordenMezcla.map((i) => `<button type="button" class="pieza-orden ${P.orden.includes(i) ? 'usada' : ''}" data-j="orden" data-i="${i}" ${P.orden.includes(i) ? 'disabled' : ''}>${esc(ruta[i])}</button>`).join('')}</div></article>`;
    }
    const q = I.loc('evaluacion', P.jefePreguntas[P.sub % P.jefePreguntas.length]);
    return `<article class="reto reto-jefe">${arenaJefe('')}
      <h2>${esc(q.p)}</h2>
      <div class="opciones-escenario">${q.o.map((o, k) => `<button type="button" class="opcion-boton" data-j="jefe" data-k="${k}"><span class="letra">${'ABCD'[k]}</span> ${esc(o)}</button>`).join('')}</div></article>`;
  }

  function vistaAlerta() {
    return `<div class="pantalla-alerta" role="alert"><p class="alerta-texto">${t('⚠️ ¡PELIGRO! ⚠️')}</p>
      <div class="jefe-sombra" aria-hidden="true">${D.JEFE.icono}</div>
      <p class="titulo-fin">${esc(t('{nombre} se acerca…', { nombre: I.loc('jefe', { nombre: D.JEFE.nombre }).nombre }))}</p></div>`;
  }

  function vistaCaja() {
    const c = P.caja;
    const abierta = c.elegida !== null;
    return `<div class="pantalla-fin caja-misteriosa"><p class="titulo-fin">${t('🎁 ¡Caja misteriosa!')}</p>
      <p class="entrada">${abierta ? esc(c.premios[c.elegida].texto) : t('Elige una')}</p>
      <div class="cajas">${c.premios.map((p, i) => `<button type="button" class="caja ${abierta ? (i === c.elegida ? 'ganada' : 'otra') : ''}" data-j="caja" data-i="${i}" ${abierta ? 'disabled' : ''} aria-label="${t('Caja {n}', { n: i + 1 })}">${abierta ? p.icono : '❓'}</button>`).join('')}</div>
      ${abierta ? `<button type="button" class="boton-juego" data-j="seguir-caja">${t('Continuar ▶')}</button>` : ''}</div>`;
  }

  function arenaJefe(estadoGolpe) {
    const nombre = I.loc('jefe', { nombre: D.JEFE.nombre }).nombre;
    return `<div class="arena ${estadoGolpe} ${P.faseFinal ? 'furioso' : ''}"><div class="jefe-sprite" aria-hidden="true">${P.jefeVida <= 0 ? '💨' : D.JEFE.icono}</div>
      <p class="jefe-nombre">${esc(nombre)} · ${P.jefeVida} ${t('PV')}</p>
      <div class="jefe-vida" role="img" aria-label="${t('Vida del jefe {n} de {total}', { n: P.jefeVida, total: D.JEFE.vida })}"><span class="jefe-relleno" data-ancho="${P.jefeVida}"></span></div></div>`;
  }

  function vistaRetro() {
    const r = P.retro;
    const arena = paso() && paso().tipo === 'jefe' ? arenaJefe(r.bien ? 'golpeado' : 'ataca') : '';
    return `${arena}<div class="retro-juego ${r.bien ? 'bien' : 'mal'}" role="status">
      <p class="retro-icono" aria-hidden="true">${r.bien ? '✨' : (r.consecuencia ? r.consecuencia.split(' ')[0] : '💥')}</p>
      <h2>${r.bien ? (r.combo >= 3 ? t('¡IMPARABLE!') : t('¡Bien hecho!')) : (r.consecuencia ? esc(r.consecuencia.replace(/^\S+\s/, '')) : t('¡Ouch!'))}</h2>
      <p class="retro-marcador">${r.bien ? t('+{n} puntos', { n: r.puntos }) + (r.combo >= 2 ? ` · combo ×${r.combo}` : '') : t('-{n} de escudo · combo reiniciado', { n: r.danio })}</p>
      <p>${esc(r.texto)}</p>
      <button type="button" class="boton-juego" data-j="continuar">${t('Continuar ▶')}</button></div>`;
  }

  function vistaFin() {
    const previas = (P.opciones.previo || {}).estrellas || 0;
    const ganadas = Math.max(0, P.estrellas - previas) * L.AVENTURA.xpEstrella;
    const idx = D.MUNDOS.findIndex((m) => m.id === P.mundo.id);
    const sig = D.MUNDOS[idx + 1];
    return `<div class="pantalla-fin victoria">
      <p class="titulo-fin">${P.mundo.pasos.some((p) => p.tipo === 'jefe') ? t('🏆 ¡DERROTASTE AL HACKER!') : t('🎉 ¡MUNDO COMPLETADO!')}</p>
      <p class="estrellas-fin">${[1, 2, 3].map((n) => `<span class="estrella e${n} ${n <= P.estrellas ? 'llena' : ''}">★</span>`).join('')}</p>
      <div class="resumen-fin"><span>⭐ ${t('{n} puntos', { n: P.puntos })}</span><span>🎯 ${t('{a}/{b} aciertos', { a: P.aciertos, b: P.intentos })}</span><span>🛡️ ${t('{n} de escudo', { n: P.escudo })}</span></div>
      ${P.cofreAbierto ? `<p class="recompensa">${ganadas ? `🎁 +${ganadas} XP` : t('🎁 Ya tenías estas estrellas: ¡supera tu récord para ganar más XP!')}</p>${sig && !previas ? `<p class="desbloqueo">🔓 ${esc(t('¡Desbloqueaste {nombre}!', { nombre: nombreMundo(sig) }))}</p>` : ''}`
        : `<button type="button" class="cofre" data-j="cofre" aria-label="${t('Abrir cofre de recompensa')}">🎁<span>${t('¡Toca para abrir el cofre!')}</span></button>`}
      <div class="acciones centro">${sig ? `<a class="boton-juego" href="#/jugar/${sig.id}" data-j="salir">${sig.icono} ${t('Siguiente mundo')}</a>` : ''}
        <button type="button" class="boton secundario" data-j="reintentar">${t('🔄 Jugar otra vez')}</button><a class="boton secundario" href="#/jugar" data-j="salir">${t('🗺️ Mapa')}</a></div></div>`;
  }

  function vistaGameOver() {
    return `<div class="pantalla-fin derrota">
      <p class="titulo-fin">${t('💥 ¡TU ESCUDO CAYÓ!')}</p>
      <p>${t('Esto fue lo que pasó por tus decisiones:')}</p>
      <ul class="golpes">${(P.golpes.length ? P.golpes : [t('Recibiste demasiados golpes')]).map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
      <p class="nota">${t('En la vida real cada una de estas decisiones tendría consecuencias. ¡Aquí puedes intentarlo otra vez!')}</p>
      <div class="acciones centro"><button type="button" class="boton-juego" data-j="reintentar">${t('🔄 Reintentar')}</button><a class="boton secundario" href="#/jugar" data-j="salir">${t('🗺️ Mapa')}</a></div></div>`;
  }

  function vistaIntro() {
    const m = I.loc('mundo', P.mundo);
    return `<div class="pantalla-fin intro-mundo">
      <p class="intro-icono" aria-hidden="true">${P.mundo.icono}</p><p class="titulo-fin">${esc(m.nombre)}</p>
      <p class="entrada">${esc(m.intro)}</p>
      <ul class="reglas"><li>${t('🛡️ Tu escudo empieza en 100: cada error lo baja; si llega a 0, pierdes.')}</li>
        <li>${t('🔥 Aciertos seguidos = combo hasta ×4. Responder rápido da bonus.')}</li><li>${t('⏱ Cada reto tiene tiempo límite.')}</li></ul>
      <button type="button" class="boton-juego grande" data-j="empezar">${t('▶ ¡A jugar!')}</button></div>`;
  }

  function pintar() {
    if (!raiz) return;
    let cuerpo;
    if (P.fase === 'intro') cuerpo = vistaIntro();
    else if (P.fase === 'fin') cuerpo = hud() + vistaFin();
    else if (P.fase === 'gameover') cuerpo = hud() + vistaGameOver();
    else if (P.fase === 'alerta') cuerpo = vistaAlerta();
    else if (P.fase === 'caja') cuerpo = hud() + vistaCaja();
    else cuerpo = hud() + (P.fase === 'retro' ? vistaRetro() : vistaReto());
    raiz.innerHTML = `<div class="juego mundo-${P.mundo.color} ${P.escudo <= 30 ? 'peligro' : ''}" data-fase="${P.fase}">${cuerpo}</div>`;
    raiz.querySelectorAll('[data-ancho]').forEach((el) => { el.style.width = el.dataset.ancho + '%'; });
    const resta = tiempoRestante(), barra = raiz.querySelector('.reloj-relleno');
    if (barra) barra.style.width = (P.fase === 'reto' && P.tiempoTotal ? resta / P.tiempoTotal * 100 : 0) + '%';
    contarPuntos();
    const foco = raiz.querySelector('[data-j="continuar"], [data-j="empezar"], [data-j="seguir-caja"]');
    if (foco) foco.focus({ preventScroll: true });
  }
  // Los puntos suben contando, como en un videojuego
  function contarPuntos() {
    const el = raiz.querySelector('.hud-puntos strong');
    if (!el || P.puntosVistos === P.puntos || sinMovimiento()) { P.puntosVistos = P.puntos; return; }
    const partida = P, desde = P.puntosVistos, hasta = P.puntos, inicio = Date.now();
    P.puntosVistos = hasta;
    el.textContent = desde;
    const id = setInterval(() => {
      const f = Math.min(1, (Date.now() - inicio) / 500);
      if (P !== partida || !el.isConnected || f >= 1) { el.textContent = hasta; clearInterval(id); return; }
      el.textContent = Math.round(desde + (hasta - desde) * f);
    }, 40);
  }
  // Re-pinta sin reiniciar el cronómetro (forja y ruta de denuncia)
  function pintarSinReloj() { pintar(); }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-j]');
    if (!b || !P || !raiz || !raiz.contains(b)) return;
    const a = b.dataset.j;
    if (a !== 'salir' && a !== 'orden') SFX.clic();
    const enReto = P.fase === 'reto';
    if (a === 'empezar') siguientePaso();
    else if (a === 'decision' && enReto) elegirDecision(Number(b.dataset.k), b);
    else if (a === 'caja') elegirCaja(Number(b.dataset.i), b);
    else if (a === 'seguir-caja') siguientePaso();
    else if (a === 'rapido' && enReto) elegirRapido(b.dataset.v === '1');
    else if (a === 'censurar' && enReto) { P.censura[b.dataset.i] = !P.censura[b.dataset.i]; b.classList.toggle('tapado'); b.setAttribute('aria-pressed', String(!!P.censura[b.dataset.i])); }
    else if (a === 'publicar' && enReto) publicar();
    else if (a === 'ficha' && enReto) { if (P.forja.length < 12) P.forja.push(b.dataset.f); pintarSinReloj(); }
    else if (a === 'borrar-ficha' && enReto) { P.forja.pop(); pintarSinReloj(); }
    else if (a === 'forjar' && enReto) forjar();
    else if (a === 'orden' && enReto) tocarPasoOrden(Number(b.dataset.i), b);
    else if (a === 'jefe' && enReto) elegirJefe(Number(b.dataset.k), b);
    else if (a === 'continuar') continuar();
    else if (a === 'cofre') abrirCofre(b);
    else if (a === 'reintentar') { const op = P.opciones; P = nuevaPartida(P.mundo, op); op.previo = op.leerPrevio(); siguientePaso(); }
  });

  /* ---------- API pública ---------- */
  function mapa(estado, modoDemo) {
    const aventura = estado.aventura || {};
    return `<ol class="mapa-mundos">${D.MUNDOS.map((m, i) => {
      const abierto = modoDemo || L.mundoDesbloqueado(i, aventura);
      const r = aventura[m.id];
      const est = r ? r.estrellas : 0;
      return `<li class="mundo-nodo mundo-${m.color} ${abierto ? 'abierto' : 'bloqueado'} ${est ? 'superado' : ''}">
        ${abierto ? `<a href="#/jugar/${m.id}">` : '<div>'}
        <span class="mundo-icono" aria-hidden="true">${abierto ? m.icono : '🔒'}</span>
        <span class="mundo-texto"><strong>${i + 1}. ${esc(nombreMundo(m))}</strong>
        <span class="mini-estrellas" aria-label="${t('{n} de 3 estrellas', { n: est })}">${'★'.repeat(est)}${'☆'.repeat(3 - est)}</span>
        <small>${abierto ? (r ? t('Récord: {n} puntos', { n: r.mejor }) : t('{n} retos', { n: m.pasos.length }) + ' · ' + m.enemigo) : t('Gana 1 estrella en el mundo anterior')}</small></span>
        ${abierto ? '</a>' : '</div>'}</li>`;
    }).join('')}</ol>`;
  }
  function siguienteMundo(estado, modoDemo) {
    const aventura = estado.aventura || {};
    const disponibles = D.MUNDOS.filter((m, i) => modoDemo || L.mundoDesbloqueado(i, aventura));
    return (disponibles.find((m) => !aventura[m.id] || aventura[m.id].estrellas < 3) || disponibles[disponibles.length - 1]).id;
  }
  function iniciar(contenedor, mundoId, opciones) {
    detener();
    const mundo = D.MUNDOS.find((m) => m.id === mundoId);
    if (!mundo) return false;
    raiz = contenedor;
    P = nuevaPartida(mundo, opciones);
    P.opciones.previo = opciones.leerPrevio();
    pintar();
    return true;
  }
  function detener() {
    detenerReloj();
    P = null; raiz = null;
  }
  function alternarSonido() { const activo = !sonidoActivo(); escribirLS('p360_sonido', activo ? '1' : '0'); if (activo) SFX.clic(); return activo; }
  function alternarMusica() { const activa = !musicaActiva(); escribirLS('p360_musica', activa ? '1' : '0'); if (activa) { try { contextoAudio(); } catch (e) { /* sin audio */ } } actualizarMusica(); return activa; }
  function alternarTiempo() { const sin = !sinTiempo(); escribirLS('p360_sin_tiempo', sin ? '1' : '0'); return sin; }
  const estadoAudio = () => ({ modo: modoMusica, sonando: !!relojMusica, notas: notasTocadas });

  window.P360_JUEGO = { mapa, siguienteMundo, iniciar, detener, alternarSonido, sonidoActivo, alternarMusica, musicaActiva, musica, estadoAudio, alternarTiempo, sinTiempo, SFX, nombreMundo };
})();
