/* PRIVACIDAD 360 — Colegio Mirador: escuela virtual explorable en un mapa 2D (canvas), sin internet.
   Se camina con flechas/WASD, con la cruceta táctil o tocando el mapa. Los personajes ficticios plantean situaciones
   y las puertas de colores llevan a los demás modos de juego. */
(function () {
  'use strict';
  const P = window.P360;
  const J = window.P360_JUEGO;
  const { esc, tx, t, PERSONAJES } = P;
  const ANCHO = 36, ALTO = 23, TILE = 40, VELOCIDAD = 4.6, RADIO = 0.32, MONEDAS_MAPA = 20;
  const COLOR = { aula: ['#F8D0E0', '#F9D9E6'], biblioteca: ['#CFDAFA', '#D8E1FB'], laboratorio: ['#E8CEE4', '#EDD7EA'], pasillo: ['#FAF2DB', '#FBF5E4'], patio: ['#CBDCBB', '#D3E2C5'], gimnasio: ['#F7E7B3', '#F9ECC2'], cafeteria: ['#F9D5CF', '#FADDD8'], orientacion: ['#C8DDF0', '#D2E3F3'], tienda: ['#FDC59A', '#FDD0AE'] };
  const NOMBRE_ZONA = { aula: 'Aula', biblioteca: 'Biblioteca', laboratorio: 'Laboratorio', pasillo: 'Pasillo', patio: 'Patio', gimnasio: 'Gimnasio', cafeteria: 'Cafetería', orientacion: 'Orientación', tienda: 'Tienda' };
  const PORTALES = [
    { x: 2, y: 2, i: '🗺️', ruta: '#/jugar', n: 'Aventura 360' }, { x: 13, y: 2, i: '🕵️', ruta: '#/detectives', n: 'Detectives del Mirador' },
    { x: 25, y: 2, i: '🗝️', ruta: '#/escape', n: 'Escape Digital' }, { x: 33, y: 2, i: '🛡️', ruta: '#/cortafuegos', n: 'Cortafuegos' },
    { x: 33, y: 11, i: '🏟️', ruta: '#/sala', n: 'Arena Relámpago' }, { x: 2, y: 11, i: '🤝', ruta: '#/relevo', n: 'Relevo por equipos' },
    { x: 20, y: 20, i: '🛍️', ruta: '#/tienda', n: 'Tienda y avatar' }, { x: 33, y: 20, i: '🆘', ruta: '#/emergencia', n: 'Emergencia' }
  ];
  const DECORADO = [[4, 4, '🪑'], [8, 4, '🪑'], [4, 2, '🪑'], [8, 2, '🪑'], [15, 4, '📚'], [20, 2, '📚'], [20, 4, '📚'], [27, 4, '💻'], [31, 4, '💻'], [31, 2, '💻'], [13, 14, '🌳'], [20, 11, '🌳'], [3, 14, '🌷'], [20, 15, '⛲'], [26, 11, '🏀'], [31, 14, '🏐'], [3, 20, '🍽️'], [11, 19, '🍽️'], [14, 20, '🍽️'], [26, 20, '🛋️']];

  let G = null, canvas = null, ctx = null, raf = null, cont = null, npcs = [], teclas = {}, abierto = null, ultimoPaso = 0;

  function construirMapa() {
    const g = Array.from({ length: ALTO }, () => new Array(ANCHO).fill(null));
    const zona = (x, y, w, h, z) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = z; };
    zona(1, 1, 10, 5, 'aula'); zona(12, 1, 10, 5, 'biblioteca'); zona(23, 1, 12, 5, 'laboratorio');
    zona(1, 7, 34, 2, 'pasillo');
    zona(1, 10, 22, 7, 'patio'); zona(24, 10, 11, 7, 'gimnasio');
    zona(1, 18, 16, 4, 'cafeteria'); zona(18, 18, 5, 4, 'tienda'); zona(24, 18, 11, 4, 'orientacion');
    [[5, 6, 'pasillo'], [16, 6, 'pasillo'], [29, 6, 'pasillo'], [11, 9, 'pasillo'], [29, 9, 'pasillo'], [23, 13, 'patio'], [6, 17, 'cafeteria'], [29, 17, 'orientacion'], [17, 19, 'cafeteria'], [23, 19, 'tienda']].forEach(([x, y, z]) => { g[y][x] = z; });
    return g;
  }

  const clave = (x, y) => x + ',' + y;
  function solidos() {
    const s = new Set();
    npcs.forEach((n) => s.add(clave(n.x, n.y)));
    PORTALES.forEach((p) => s.add(clave(p.x, p.y)));
    DECORADO.forEach((d) => s.add(clave(d[0], d[1])));
    return s;
  }
  const caminable = (x, y) => y >= 0 && y < ALTO && x >= 0 && x < ANCHO && G.mapa[y][x] && !G.solidos.has(clave(x, y));

  /* Monedas repartidas de forma fija en casillas libres, para que cada persona vea las mismas y se puedan guardar. */
  function colocarMonedas() {
    const libres = [];
    for (let y = 1; y < ALTO - 1; y += 2) for (let x = 2; x < ANCHO - 1; x += 3) if (caminable(x, y) && !(x === G.px && y === G.py)) libres.push([x, y]);
    const paso = Math.max(1, Math.floor(libres.length / MONEDAS_MAPA));
    return libres.filter((_, i) => i % paso === 0).slice(0, MONEDAS_MAPA);
  }

  function ruta(ox, oy, dx, dy) {
    // Búsqueda en anchura: camino más corto por casillas libres.
    const visto = new Map([[clave(ox, oy), null]]);
    const cola = [[ox, oy]];
    while (cola.length) {
      const [x, y] = cola.shift();
      if (x === dx && y === dy) {
        const camino = [];
        let k = clave(x, y);
        while (k) { const [a, b] = k.split(',').map(Number); camino.unshift([a, b]); k = visto.get(k); }
        return camino.slice(1);
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, ay]) => {
        const nx = x + ax, ny = y + ay, c = clave(nx, ny);
        if (!visto.has(c) && caminable(nx, ny)) { visto.set(c, clave(x, y)); cola.push([nx, ny]); }
      });
    }
    return null;
  }

  function vecinoLibre(x, y, ox, oy) {
    const op = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b]) => [x + a, y + b]).filter(([a, b]) => caminable(a, b));
    op.sort((p, q) => Math.abs(p[0] - ox) + Math.abs(p[1] - oy) - Math.abs(q[0] - ox) - Math.abs(q[1] - oy));
    return op;
  }

  /* ---------- Movimiento ---------- */
  function libreEn(x, y) {
    const puntos = [[x - RADIO, y - RADIO], [x + RADIO, y - RADIO], [x - RADIO, y + RADIO], [x + RADIO, y + RADIO]];
    return puntos.every(([a, b]) => caminable(Math.floor(a), Math.floor(b)));
  }
  function mover(dt) {
    let dx = 0, dy = 0;
    if (teclas.ArrowLeft || teclas.a) dx -= 1;
    if (teclas.ArrowRight || teclas.d) dx += 1;
    if (teclas.ArrowUp || teclas.w) dy -= 1;
    if (teclas.ArrowDown || teclas.s) dy += 1;
    if (dx || dy) G.camino = null;
    else if (G.camino && G.camino.length) {
      const [cx, cy] = G.camino[0];
      const ax = cx + 0.5 - G.x, ay = cy + 0.5 - G.y, d = Math.hypot(ax, ay);
      if (d < 0.08) {
        G.camino.shift();
        if (!G.camino.length) { const o = G.objetivo; G.objetivo = null; if (o) interactuarCon(o); }
        return;
      }
      dx = ax / d; dy = ay / d;
    }
    if (!dx && !dy) { G.andando = false; return; }
    if (dx && dy && !G.camino) { dx *= 0.707; dy *= 0.707; }
    const nx = G.x + dx * VELOCIDAD * dt, ny = G.y + dy * VELOCIDAD * dt;
    if (libreEn(nx, G.y)) G.x = nx;
    if (libreEn(G.x, ny)) G.y = ny;
    G.andando = true;
    if (dx < 0) G.mira = -1; else if (dx > 0) G.mira = 1;
    const ahora = performance.now();
    if (ahora - ultimoPaso > 260) { ultimoPaso = ahora; if (G.pasos++ % 2 === 0) J.SFX.tic(); }
    recogerMoneda();
    actualizarCercania();
  }
  function recogerMoneda() {
    const tx0 = Math.floor(G.x), ty0 = Math.floor(G.y);
    G.monedas.forEach((m) => {
      const k = clave(m[0], m[1]);
      if (m[0] === tx0 && m[1] === ty0 && !G.recogidas.has(k)) {
        G.recogidas.add(k);
        P.app.registrarMonedaColegio(k);
        J.SFX.moneda();
        G.destellos.push({ x: m[0] + 0.5, y: m[1] + 0.5, t: 0 });
        pintarHud();
      }
    });
  }
  function objetoCercano() {
    const px = G.x - 0.5, py = G.y - 0.5;
    let mejor = null, dist = 1.6;
    npcs.concat(PORTALES).forEach((o) => {
      const d = Math.hypot(o.x - px, o.y - py);
      if (d < dist) { dist = d; mejor = o; }
    });
    return mejor;
  }
  function actualizarCercania() {
    const o = objetoCercano();
    if (o === G.cerca) return;
    G.cerca = o;
    const b = cont.querySelector('#boton-interactuar');
    if (!b) return;
    b.hidden = !o;
    if (o) b.textContent = o.ruta ? `🚪 ${t('Ir a {x}', { x: t(o.n) })}` : `💬 ${t('Hablar con {x}', { x: PERSONAJES[o.personaje].n })}`;
    const z = G.mapa[Math.floor(G.y)] && G.mapa[Math.floor(G.y)][Math.floor(G.x)];
    if (z) { const e = cont.querySelector('#zona-actual'); if (e) e.textContent = t(NOMBRE_ZONA[z]); }
  }
  function interactuarCon(o) {
    if (o.ruta) { J.SFX.desbloqueo(); location.hash = o.ruta; return; }
    abrirDialogo(o);
  }

  /* ---------- Conversaciones ---------- */
  function abrirDialogo(n) {
    abierto = n; teclas = {}; G.camino = null;
    const texto = tx(n), hecho = (P.app.estado().modos || {}).colegio && P.app.estado().modos.colegio.npc && P.app.estado().modos.colegio.npc[n.id];
    const p = PERSONAJES[n.personaje];
    J.SFX.caja();
    const d = cont.querySelector('#dialogo');
    d.hidden = false;
    d.innerHTML = `
      <div class="dialogo-cabeza"><span class="dialogo-cara" aria-hidden="true">${p.i}</span><div><b>${esc(p.n)}</b>${hecho ? ` <span aria-label="${t('Ya resuelto')}">✅</span>` : ''}<p>${esc(texto.texto)}</p></div></div>
      <div class="acciones-caso">${texto.o.map((o, i) => `<button type="button" class="ficha-accion" data-col="op" data-i="${i}">${esc(o)}</button>`).join('')}</div>
      <p class="explicacion" id="retro-npc" hidden></p>
      <div class="acciones centro"><button class="boton secundario" type="button" data-col="cerrar">${t('Cerrar')}</button></div>`;
    const primero = d.querySelector('[data-col="op"]');
    if (primero) primero.focus();
  }
  function cerrarDialogo() { abierto = null; const d = cont.querySelector('#dialogo'); if (d) d.hidden = true; if (canvas) canvas.focus(); }
  function elegir(i, el) {
    const n = abierto, texto = tx(n), bien = i === n.c;
    const retro = cont.querySelector('#retro-npc');
    retro.hidden = false;
    retro.textContent = (bien ? '✅ ' : '💭 ') + texto.r[i];
    el.classList.add(bien ? 'correcta' : 'error');
    if (bien) {
      const r = P.app.registrarNpc(n.id);
      J.SFX.bien();
      cont.querySelectorAll('[data-col="op"]').forEach((b) => { b.disabled = true; });
      if (r.monedas) { retro.textContent += ` 💰 +${r.monedas}`; J.SFX.moneda(); }
      if (r.todos) { J.SFX.victoria(); P.app.confeti(80); P.app.aviso(t('🏫 ¡Ayudaste a todo el Colegio Mirador!'), 'insignia'); }
      pintarHud();
    } else { J.SFX.mal(); el.disabled = true; }
  }

  /* ---------- Dibujo ---------- */
  function ajustarCanvas() {
    if (!canvas) return;
    const caja = canvas.parentElement.getBoundingClientRect();
    const alto = Math.min(window.innerHeight * 0.62, 560);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(caja.width * dpr); canvas.height = Math.round(alto * dpr);
    canvas.style.height = alto + 'px';
    G.vistaW = caja.width; G.vistaH = alto; G.dpr = dpr;
  }
  function camara() {
    const cx = Math.max(0, Math.min(ANCHO * TILE - G.vistaW, G.x * TILE - G.vistaW / 2));
    const cy = Math.max(0, Math.min(ALTO * TILE - G.vistaH, G.y * TILE - G.vistaH / 2));
    return { cx: ANCHO * TILE < G.vistaW ? (ANCHO * TILE - G.vistaW) / 2 : cx, cy: ALTO * TILE < G.vistaH ? (ALTO * TILE - G.vistaH) / 2 : cy };
  }
  function emoji(texto, x, y, tam) { ctx.fillStyle = '#000'; ctx.font = `${tam}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; ctx.fillText(texto, x, y); }
  function dibujar(tiempo) {
    const { cx, cy } = camara();
    G.camara = { cx, cy };
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.fillStyle = '#3A2E4A'; ctx.fillRect(0, 0, G.vistaW, G.vistaH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(ANCHO - 1, Math.ceil((cx + G.vistaW) / TILE));
    const y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(ALTO - 1, Math.ceil((cy + G.vistaH) / TILE));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const z = G.mapa[y][x], px = x * TILE - cx, py = y * TILE - cy;
      if (z) { ctx.fillStyle = COLOR[z][(x + y) % 2]; ctx.fillRect(px, py, TILE, TILE); }
      else {
        ctx.fillStyle = '#5E3A6E'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#7B4F8E'; ctx.fillRect(px, py, TILE, 10);
      }
    }
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#3A2E4A'; ctx.font = '700 15px Fredoka, sans-serif';
    [['aula', 6, 1], ['biblioteca', 17, 1], ['laboratorio', 29, 1], ['pasillo', 17, 7], ['patio', 12, 10], ['gimnasio', 29, 10], ['cafeteria', 9, 18], ['tienda', 20, 18], ['orientacion', 29, 18]].forEach(([z, x, y]) => {
      ctx.fillText(t(NOMBRE_ZONA[z]).toUpperCase(), (x + 0.5) * TILE - cx, (y + 0.35) * TILE - cy);
    });
    ctx.globalAlpha = 1;
    DECORADO.forEach(([x, y, e]) => emoji(e, (x + 0.5) * TILE - cx, (y + 0.55) * TILE - cy, 28));
    const rebote = (f) => (G.quieto ? 0 : Math.sin(tiempo / 260 + f) * 3);
    G.monedas.forEach((m) => { if (!G.recogidas.has(clave(m[0], m[1]))) emoji('💰', (m[0] + 0.5) * TILE - cx, (m[1] + 0.5) * TILE - cy + rebote(m[0]), 20); });
    PORTALES.forEach((p) => {
      const x = (p.x + 0.5) * TILE - cx, y = (p.y + 0.5) * TILE - cy;
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#7B4F8E'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      emoji(p.i, x, y + rebote(p.x) / 2, 22);
    });
    const resueltos = ((P.app.estado().modos || {}).colegio || {}).npc || {};
    npcs.forEach((n) => {
      const x = (n.x + 0.5) * TILE - cx, y = (n.y + 0.5) * TILE - cy;
      emoji(PERSONAJES[n.personaje].i, x, y + rebote(n.x + n.y), 32);
      emoji(resueltos[n.id] ? '✅' : '❗', x + 14, y - 20 + rebote(n.y), 16);
    });
    const avatar = P.app.avatarActual();
    const x = G.x * TILE - cx, y = G.y * TILE - cy, salto = G.andando && !G.quieto ? Math.abs(Math.sin(tiempo / 90)) * 5 : 0;
    ctx.fillStyle = 'rgba(58,46,74,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 16, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y - salto); ctx.scale(G.mira, 1);
    emoji(avatar.base || '🦊', 0, 0, 32);
    if (avatar.gafas) emoji(avatar.gafas, 0, -2, 18);
    if (avatar.sombrero) emoji(avatar.sombrero, 0, -18, 20);
    ctx.restore();
    if (avatar.mascota) emoji(avatar.mascota, x - 24 * G.mira, y + 8 + rebote(1), 18);
    G.destellos = G.destellos.filter((d) => { d.t += 0.05; if (d.t > 1) return false; ctx.globalAlpha = 1 - d.t; emoji('✨', d.x * TILE - cx, d.y * TILE - cy - d.t * 30, 22); ctx.globalAlpha = 1; return true; });
  }
  function ciclo(ahora) {
    if (!G) return;
    const dt = Math.min(0.05, (ahora - (G.ultimo || ahora)) / 1000);
    G.ultimo = ahora;
    if (!abierto) mover(dt);
    dibujar(ahora);
    raf = requestAnimationFrame(ciclo);
  }

  function pintarHud() {
    const est = P.app.estado(), npc = ((est.modos || {}).colegio || {}).npc || {};
    const h = cont.querySelector('#hud-colegio');
    if (h) h.innerHTML = `<span class="chip-sala">💬 ${Object.keys(npc).length}/${npcs.length}</span><span class="chip-sala">💰 ${G.recogidas.size}/${G.monedas.length}</span><span class="chip-sala" id="zona-actual">${t('Pasillo')}</span>`;
  }

  /* ---------- Entrada ---------- */
  const TECLAS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, a: 1, d: 1, w: 1, s: 1 };
  function teclaAbajo(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (abierto) { if (k === 'Escape') cerrarDialogo(); return; }
    if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
    if (TECLAS[k]) { teclas[k] = true; ev.preventDefault(); }
    if ((k === 'e' || k === 'Enter') && G.cerca && (ev.target === canvas || ev.target === document.body)) { ev.preventDefault(); interactuarCon(G.cerca); }
  }
  function teclaArriba(ev) { const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; delete teclas[k]; }

  function tocarMapa(ev) {
    if (abierto) return;
    canvas.focus();
    const r = canvas.getBoundingClientRect();
    const tx1 = Math.floor((ev.clientX - r.left + G.camara.cx) / TILE), ty1 = Math.floor((ev.clientY - r.top + G.camara.cy) / TILE);
    const ox = Math.floor(G.x), oy = Math.floor(G.y);
    const objeto = npcs.concat(PORTALES).find((o) => o.x === tx1 && o.y === ty1);
    if (objeto) {
      const opciones = vecinoLibre(objeto.x, objeto.y, ox, oy);
      for (const [a, b] of opciones) {
        if (a === ox && b === oy) { interactuarCon(objeto); return; }
        const c = ruta(ox, oy, a, b);
        if (c) { G.camino = c; G.objetivo = objeto; return; }
      }
      return;
    }
    if (caminable(tx1, ty1)) { const c = ruta(ox, oy, tx1, ty1); if (c) { G.camino = c; G.objetivo = null; } }
  }
  function clic(ev) {
    const el = ev.target.closest('[data-col]');
    if (!el || el.disabled) return;
    if (el.dataset.col === 'op') elegir(Number(el.dataset.i), el);
    if (el.dataset.col === 'cerrar') cerrarDialogo();
    if (el.dataset.col === 'interactuar' && G.cerca) interactuarCon(G.cerca);
  }
  function cruceta(ev, abajo) {
    const b = ev.target.closest('[data-dir]');
    if (!b) return;
    ev.preventDefault();
    if (abajo) { teclas[b.dataset.dir] = true; G.camino = null; } else delete teclas[b.dataset.dir];
  }
  const dAbajo = (e) => cruceta(e, true), dArriba = (e) => cruceta(e, false);
  const soltar = () => { teclas = {}; };

  P.registrar('colegio', {
    traducida: true,
    musica: 'colegio',
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(c) {
      cont = c;
      try { npcs = await P.datos('colegio'); } catch (e) { c.innerHTML = `<p class="alerta">⚠️ ${t('No se pudo cargar este modo. Si es la primera vez que lo abres, conéctate una vez para que quede guardado.')}</p>`; return; }
      if (cont !== c) return;
      G = { mapa: construirMapa(), x: 17.5, y: 8.5, px: 17, py: 8, mira: 1, camino: null, objetivo: null, cerca: null, pasos: 0, destellos: [], andando: false,
        quieto: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches), recogidas: new Set(((P.app.estado().modos || {}).colegio || {}).monedas || []) };
      G.solidos = solidos();
      G.monedas = colocarMonedas();
      teclas = {}; abierto = null;
      cont.innerHTML = `
      <section class="colegio">
        <div class="colegio-cabeza"><h1>🏫 ${t('Colegio Mirador')}</h1><div id="hud-colegio" class="sala-barra"></div></div>
        <p class="ficticio">🎭 ${t('Caso y personajes ficticios')}</p>
        <div class="mapa-envoltura">
          <canvas id="mapa-colegio" tabindex="0" aria-label="${t('Mapa del Colegio Mirador. Muévete con las flechas y pulsa E para interactuar.')}"></canvas>
          <button type="button" id="boton-interactuar" class="boton-juego flotar-accion" data-col="interactuar" hidden></button>
          <div class="cruceta" aria-hidden="true">
            <button type="button" class="c-arriba" data-dir="ArrowUp" tabindex="-1">▲</button><button type="button" class="c-izq" data-dir="ArrowLeft" tabindex="-1">◀</button><button type="button" class="c-der" data-dir="ArrowRight" tabindex="-1">▶</button><button type="button" class="c-abajo" data-dir="ArrowDown" tabindex="-1">▼</button>
          </div>
          <div id="dialogo" class="dialogo-npc" role="dialog" aria-live="polite" hidden></div>
        </div>
        <p class="nota centro-texto">${t('Flechas o WASD para caminar · E para hablar · También puedes tocar el mapa. Los ❗ necesitan tu ayuda y los círculos son puertas a otros juegos.')}</p>
      </section>`;
      canvas = cont.querySelector('#mapa-colegio');
      ctx = canvas.getContext('2d');
      ajustarCanvas();
      pintarHud();
      actualizarCercania();
      canvas.addEventListener('pointerdown', tocarMapa);
      cont.addEventListener('click', clic);
      const cr = cont.querySelector('.cruceta');
      cr.addEventListener('pointerdown', dAbajo);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((n) => cr.addEventListener(n, dArriba));
      window.addEventListener('keydown', teclaAbajo);
      window.addEventListener('keyup', teclaArriba);
      window.addEventListener('resize', ajustarCanvas);
      window.addEventListener('blur', soltar);
      raf = requestAnimationFrame(ciclo);
    },
    desmontar() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', teclaAbajo);
      window.removeEventListener('keyup', teclaArriba);
      window.removeEventListener('resize', ajustarCanvas);
      window.removeEventListener('blur', soltar);
      if (cont) cont.removeEventListener('click', clic);
      G = null; canvas = null; ctx = null; cont = null; abierto = null;
    }
  });

  /* Solo lectura, para las pruebas automáticas: posición en pantalla de una casilla y del jugador. */
  window.P360_ESCUELA = {
    enPantalla(x, y) { const r = canvas.getBoundingClientRect(); return { x: r.left + (x + 0.5) * TILE - G.camara.cx, y: r.top + (y + 0.5) * TILE - G.camara.cy }; },
    jugador: () => (G ? { x: G.x, y: G.y, cerca: G.cerca ? (G.cerca.id || G.cerca.ruta) : null, monedas: G.recogidas.size } : null),
    personajes: () => npcs.map((n) => ({ id: n.id, x: n.x, y: n.y, c: n.c })),
    portales: () => PORTALES.map((p) => ({ x: p.x, y: p.y, ruta: p.ruta })),
    alcanzables() {
      const ox = Math.floor(G.x), oy = Math.floor(G.y);
      return npcs.concat(PORTALES).every((o) => vecinoLibre(o.x, o.y, ox, oy).some(([a, b]) => (a === ox && b === oy) || ruta(ox, oy, a, b)));
    },
    monedasEnMapa: () => G.monedas.slice()
  };
})();
