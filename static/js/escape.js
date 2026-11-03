/* PRIVACIDAD 360 — Escape Digital: salas de escape individuales, sin internet.
   Cada objeto de la habitación esconde un reto; al resolverlo da un dígito. Los 4 dígitos abren la cerradura antes de que acabe el tiempo. */
(function () {
  'use strict';
  const P = window.P360;
  const L = window.P360_LOGICA;
  const J = window.P360_JUEGO;
  const { esc, tx, t, mezclar } = P;
  const CASTIGO_ERROR = 10, CASTIGO_PISTA = 30;

  let E = null, salas = null, cont = null, crono = null;

  function pantallaLista() {
    const res = (P.app.estado().modos || {}).escape || {};
    cont.innerHTML = `
    <section class="modo-cabecera c-escape">
      <p class="etiqueta">🔌 ${t('Sin internet')}</p>
      <h1>🗝️ ${t('Escape Digital')}</h1>
      <p>${t('Examina cada objeto, resuelve su reto y reúne los 4 dígitos para abrir la cerradura antes de que se acabe el tiempo.')}</p>
    </section>
    <div class="rejilla">${salas.map((s, i) => `<button type="button" class="tarjeta tarjeta-caso" data-e="abrir" data-i="${i}"><span class="tarjeta-icono" aria-hidden="true">${s.icono}</span><h3>${esc(tx(s).titulo)}</h3><p class="estrellas-sala" aria-label="${t('{n} de 3 estrellas', { n: res[s.id] ? res[s.id].estrellas : 0 })}">${'⭐'.repeat(res[s.id] ? res[s.id].estrellas : 0)}${'☆'.repeat(3 - (res[s.id] ? res[s.id].estrellas : 0))}</p><p class="nota">⏱ ${t('{n} minutos', { n: s.min })}</p></button>`).join('')}</div>`;
  }

  function abrir(i) {
    const sala = salas[i];
    const digitos = {};
    sala.objetos.forEach((o) => { digitos[o.id] = 1 + Math.floor(Math.random() * 9); });
    E = { sala, digitos, hechos: {}, abierto: null, errores: 0, pistas: 0, total: sala.min * 60 * 1000, candado: ['', '', '', ''] };
    J.SFX.desbloqueo();
    pintarCuarto(true);
    arrancarReloj(E.total);
  }

  function arrancarReloj(ms) {
    if (crono) crono.detener();
    crono = P.cronometro(cont, { ms, total: E.total, alSegundo: (s) => { if (s > 0 && s <= 10) J.SFX.tic(); if (s > 0 && s <= 30 && s % 5 === 0) J.SFX.latido(); }, alAcabar: perder });
  }
  function castigar(segundos) {
    if (!crono) return;
    crono.ajustar(Math.max(0, crono.restante() - segundos * 1000));
    const f = document.createElement('div');
    f.className = 'flotante mal'; f.textContent = `−${segundos} s`;
    (cont.querySelector('.escape-marco') || cont).appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }

  function cerradura() {
    return `<div class="candado-digitos">${E.sala.objetos.map((o, i) => `<span class="ranura ${E.hechos[o.id] ? 'hecha' : ''}"><span class="ranura-icono" aria-hidden="true">${o.icono}</span><b>${E.hechos[o.id] ? E.digitos[o.id] : '?'}</b></span>`).join('')}</div>`;
  }

  function pintarCuarto(inicio) {
    const ts = tx(E.sala);
    const completos = E.sala.objetos.every((o) => E.hechos[o.id]);
    cont.innerHTML = `
    <div class="escape-marco">
      ${P.relojHtml()}
      <h1 class="titulo-caso">${E.sala.icono} ${esc(ts.titulo)}</h1>
      <p class="ficticio">🎭 ${t('Caso y personajes ficticios')}</p>
      ${inicio ? `<div class="tarjeta caso-intro"><p>${esc(ts.intro)}</p></div>` : ''}
      <div class="cuarto">
        ${E.sala.objetos.map((o) => { const n = ts.objetos[o.id]; return `<button type="button" class="objeto ${E.hechos[o.id] ? 'resuelto' : ''}" data-e="objeto" data-id="${o.id}"><span class="objeto-icono" aria-hidden="true">${o.icono}</span><span>${esc(n.nombre)}</span>${E.hechos[o.id] ? `<small>✅ ${t('Dígito')}: ${E.digitos[o.id]}</small>` : ''}</button>`; }).join('')}
        <button type="button" class="objeto puerta ${completos ? 'lista pulso' : ''}" data-e="puerta"><span class="objeto-icono" aria-hidden="true">${completos ? '🔓' : '🔒'}</span><span>${t('La cerradura')}</span></button>
      </div>
      ${cerradura()}
      <div class="acciones centro"><button class="boton secundario" type="button" data-e="abandonar">${t('Salir de la sala')}</button></div>
    </div>`;
  }

  /* ---------- Retos ---------- */
  function pintarReto(obj) {
    const ts = tx(E.sala), n = ts.objetos[obj.id];
    E.abierto = obj;
    let cuerpo = '';
    if (obj.tipo === 'elegir') {
      if (!E.orden) E.orden = mezclar(n.opciones.map((_, i) => i));
      cuerpo = `<div class="acciones-caso">${E.orden.map((i) => `<button type="button" class="ficha-accion" data-e="elegir" data-i="${i}">${esc(n.opciones[i])}</button>`).join('')}</div>`;
    } else if (obj.tipo === 'clasificar') {
      if (!E.clas) E.clas = { orden: mezclar(n.items.map((_, i) => i)), marcas: {} };
      cuerpo = `<ul class="clasificar">${E.clas.orden.map((i) => `<li><span>${esc(n.items[i])}</span><span class="clas-botones">${n.categorias.map((c, k) => `<button type="button" class="chip-voto ${E.clas.marcas[i] === k ? 'elegido' : ''}" data-e="marcar" data-i="${i}" data-k="${k}" aria-pressed="${E.clas.marcas[i] === k}">${esc(c)}</button>`).join('')}</span></li>`).join('')}</ul>
      <div class="acciones centro"><button class="boton-juego" type="button" data-e="comprobar-clas" ${Object.keys(E.clas.marcas).length === n.items.length ? '' : 'disabled'}>✔ ${t('Comprobar')}</button></div>`;
    } else if (obj.tipo === 'ordenar') {
      if (!E.ord) E.ord = { pendientes: mezclar(n.pasos.map((_, i) => i)), hechos: [] };
      cuerpo = `<ol class="orden-hecho">${E.ord.hechos.map((i) => `<li>✅ ${esc(n.pasos[i])}</li>`).join('')}</ol>
      <div class="acciones-caso">${E.ord.pendientes.map((i) => `<button type="button" class="ficha-accion" data-e="paso" data-i="${i}">${esc(n.pasos[i])}</button>`).join('')}</div>`;
    } else if (obj.tipo === 'cesar') {
      if (E.rueda === undefined) E.rueda = 0;
      const cifrado = L.cifrarCesar(n.frase, E.digitos[obj.id]);
      cuerpo = `<p class="texto-cifrado" id="texto-cifrado" aria-live="polite">${esc(L.cifrarCesar(cifrado, -E.rueda))}</p>
      <div class="rueda"><button type="button" class="boton secundario" data-e="rueda" data-d="-1" aria-label="${t('Girar a la izquierda')}">◀</button><span class="rueda-num" id="rueda-num">${E.rueda}</span><button type="button" class="boton secundario" data-e="rueda" data-d="1" aria-label="${t('Girar a la derecha')}">▶</button></div>
      <div class="acciones centro"><button class="boton-juego" type="button" data-e="comprobar-cesar">✔ ${t('¡Ya se lee!')}</button></div>`;
    }
    cont.innerHTML = `
    <div class="escape-marco">
      ${P.relojHtml()}
      <h1 class="titulo-caso"><span aria-hidden="true">${obj.icono}</span> ${esc(n.nombre)}</h1>
      <p class="enunciado">${esc(n.enunciado)}</p>
      ${cuerpo}
      ${E.pistaVista === obj.id ? `<p class="explicacion" id="pista-reto">💡 ${esc(n.pista)}</p>` : ''}
      <div class="acciones centro">
        <button class="boton secundario" type="button" data-e="cuarto">← ${t('Volver a la habitación')}</button>
        ${E.pistaVista === obj.id ? '' : `<button class="boton secundario" type="button" data-e="pista">💡 ${t('Pista (−{n} s)', { n: CASTIGO_PISTA })}</button>`}
      </div>
    </div>`;
    if (crono) crono.ajustar(crono.restante());
  }

  function fallo(obj) {
    E.errores++;
    J.SFX.mal();
    castigar(CASTIGO_ERROR);
    const m = cont.querySelector('.escape-marco');
    if (m) { m.classList.remove('sacude'); void m.offsetWidth; m.classList.add('sacude'); }
    if (obj.tipo === 'ordenar' && E.ord) { E.ord = null; pintarReto(obj); P.app.aviso(t('Ese no era el paso. La secuencia vuelve a empezar.')); }
  }
  function resolver(obj) {
    E.hechos[obj.id] = true;
    E.orden = null; E.clas = null; E.ord = null; E.rueda = undefined;
    J.SFX.cofre();
    P.app.aviso(t('🔢 ¡Dígito encontrado: {d}!', { d: E.digitos[obj.id] }), 'insignia');
    pintarCuarto(false);
    if (crono) crono.ajustar(crono.restante());
  }

  function pintarPuerta() {
    const completos = E.sala.objetos.every((o) => E.hechos[o.id]);
    cont.innerHTML = `
    <div class="escape-marco">
      ${P.relojHtml()}
      <h1 class="titulo-caso">🔒 ${t('La cerradura')}</h1>
      ${cerradura()}
      ${completos ? `<p class="enunciado">${t('Escribe los 4 dígitos en el orden de los objetos.')}</p>` : `<p class="alerta info">${t('Todavía te faltan dígitos: revisa los objetos de la habitación.')}</p>`}
      <form id="form-candado" class="candado" autocomplete="off">
        ${[0, 1, 2, 3].map((i) => `<input type="text" inputmode="numeric" maxlength="1" pattern="[0-9]" aria-label="${t('Dígito {n}', { n: i + 1 })}" data-candado="${i}" value="${esc(E.candado[i])}" required>`).join('')}
        <button class="boton-juego" type="submit">🗝️ ${t('Abrir')}</button>
      </form>
      <div class="acciones centro"><button class="boton secundario" type="button" data-e="cuarto">← ${t('Volver a la habitación')}</button></div>
    </div>`;
    if (crono) crono.ajustar(crono.restante());
    const primero = cont.querySelector('[data-candado]');
    if (primero) primero.focus();
  }

  function intentarAbrir() {
    const correcto = E.sala.objetos.map((o) => String(E.digitos[o.id])).join('');
    if (E.candado.join('') === correcto) { ganar(); return; }
    J.SFX.golpe();
    castigar(CASTIGO_ERROR);
    E.errores++;
    P.app.aviso(t('El código no abre. Revisa el orden de los dígitos.'));
  }

  function ganar() {
    const resta = crono.restante();
    crono.detener(); crono = null;
    const ts = tx(E.sala);
    const r = P.app.registrarEscape(E.sala.id, L.estrellasEscape(resta, E.total, E.pistas, E.errores));
    J.SFX.desbloqueo();
    setTimeout(() => { J.SFX.victoria(); P.app.confeti(90); }, 300);
    const seg = Math.round(resta / 1000);
    cont.innerHTML = `
    <section class="final-sala" id="escape-ganado">
      <p class="puerta-abierta" aria-hidden="true">🚪✨</p>
      <h1>${esc(ts.exito)}</h1>
      <p class="estrellas-grandes" aria-label="${t('{n} de 3 estrellas', { n: r.estrellas })}">${'⭐'.repeat(r.estrellas)}${'☆'.repeat(3 - r.estrellas)}</p>
      <p>${t('Te sobraron {m}:{s}', { m: Math.floor(seg / 60), s: String(seg % 60).padStart(2, '0') })} · ${t('Pistas: {n}', { n: E.pistas })} · ${t('Errores: {n}', { n: E.errores })} · 💰 +${r.monedas}</p>
      <p class="explicacion">📚 ${esc(ts.leccion)}</p>
      <div class="acciones centro"><button class="boton-juego" type="button" data-e="lista">🗝️ ${t('Otras salas')}</button><a class="boton secundario" href="#/modos">🕹️ ${t('Otros modos')}</a></div>
    </section>`;
    E = null;
  }
  function perder() {
    crono = null;
    J.SFX.derrota();
    const ts = tx(E.sala), id = salas.indexOf(E.sala);
    E = null;
    cont.innerHTML = `
    <section class="final-sala" id="escape-perdido">
      <p class="puerta-abierta" aria-hidden="true">⏰🔒</p>
      <h1>${t('¡Se acabó el tiempo!')}</h1>
      <p class="explicacion">📚 ${esc(ts.leccion)}</p>
      <div class="acciones centro"><button class="boton-juego" type="button" data-e="abrir" data-i="${id}">🔁 ${t('Intentar otra vez')}</button><button class="boton secundario" type="button" data-e="lista">🗝️ ${t('Otras salas')}</button></div>
    </section>`;
  }

  /* ---------- Eventos ---------- */
  function clic(ev) {
    const el = ev.target.closest('[data-e]');
    if (!el || el.disabled) return;
    const a = el.dataset.e;
    const obj = E && E.abierto;
    if (a === 'abrir') { abrir(Number(el.dataset.i)); window.scrollTo(0, 0); return; }
    if (a === 'lista') { E = null; if (crono) { crono.detener(); crono = null; } pantallaLista(); return; }
    if (!E) return;
    switch (a) {
      case 'abandonar': if (crono) { crono.detener(); crono = null; } E = null; J.SFX.clic(); pantallaLista(); break;
      case 'objeto': {
        J.SFX.clic();
        const o = E.sala.objetos.find((x) => x.id === el.dataset.id);
        if (E.hechos[o.id]) { P.app.aviso(t('Este reto ya está resuelto. Su dígito es {d}.', { d: E.digitos[o.id] })); return; }
        E.orden = null; E.clas = null; E.ord = null; E.rueda = undefined;
        pintarReto(o);
        break;
      }
      case 'puerta': J.SFX.clic(); pintarPuerta(); break;
      case 'cuarto': E.abierto = null; J.SFX.clic(); pintarCuarto(false); if (crono) crono.ajustar(crono.restante()); break;
      case 'pista':
        E.pistas++; E.pistaVista = obj.id; J.SFX.caja();
        castigar(CASTIGO_PISTA); pintarReto(obj);
        break;
      case 'elegir':
        if (obj.correctas.includes(Number(el.dataset.i))) resolver(obj);
        else { el.disabled = true; el.classList.add('error'); fallo(obj); }
        break;
      case 'marcar': E.clas.marcas[el.dataset.i] = Number(el.dataset.k); J.SFX.clic(); pintarReto(obj); break;
      case 'comprobar-clas': {
        const malas = obj.items.map((v, i) => (E.clas.marcas[i] === v ? null : i)).filter((x) => x !== null);
        if (!malas.length) resolver(obj);
        else { fallo(obj); P.app.aviso(t('Tienes {n} sin acomodar bien.', { n: malas.length })); }
        break;
      }
      case 'paso': {
        const i = Number(el.dataset.i);
        if (i === E.ord.hechos.length) {
          E.ord.hechos.push(i);
          E.ord.pendientes = E.ord.pendientes.filter((x) => x !== i);
          J.SFX.bien();
          if (!E.ord.pendientes.length) resolver(obj); else pintarReto(obj);
        } else fallo(obj);
        break;
      }
      case 'rueda': {
        E.rueda = (E.rueda + Number(el.dataset.d) + 26) % 26;
        J.SFX.tic();
        const n = tx(E.sala).objetos[obj.id];
        const txt = cont.querySelector('#texto-cifrado'), num = cont.querySelector('#rueda-num');
        txt.textContent = L.cifrarCesar(L.cifrarCesar(n.frase, E.digitos[obj.id]), -E.rueda);
        num.textContent = E.rueda;
        break;
      }
      case 'comprobar-cesar':
        if (E.rueda === E.digitos[obj.id]) resolver(obj);
        else { fallo(obj); P.app.aviso(t('Todavía no se lee. Sigue girando.')); }
        break;
    }
  }
  function entrada(ev) {
    const c = ev.target;
    if (c.dataset.candado === undefined || !E) return;
    c.value = c.value.replace(/\D/g, '').slice(0, 1);
    E.candado[Number(c.dataset.candado)] = c.value;
    if (c.value) { const sig = cont.querySelector(`[data-candado="${Number(c.dataset.candado) + 1}"]`); if (sig) sig.focus(); J.SFX.tic(); }
  }
  function envio(ev) { if (ev.target.id === 'form-candado') { ev.preventDefault(); intentarAbrir(); } }

  P.registrar('escape', {
    traducida: true,
    musica: 'misterio',
    html: () => `<div id="zona-modo"><p class="cargando">${t('Cargando…')}</p></div>`,
    async montar(c) {
      cont = c;
      try { salas = await P.datos('escape'); } catch (e) { cont.innerHTML = `<p class="alerta">⚠️ ${t('No se pudo cargar este modo. Si es la primera vez que lo abres, conéctate una vez para que quede guardado.')}</p>`; return; }
      if (cont !== c) return;
      cont.addEventListener('click', clic);
      cont.addEventListener('input', entrada);
      cont.addEventListener('submit', envio);
      pantallaLista();
    },
    desmontar() {
      if (crono) { crono.detener(); crono = null; }
      if (cont) { cont.removeEventListener('click', clic); cont.removeEventListener('input', entrada); cont.removeEventListener('submit', envio); }
      E = null; cont = null;
    }
  });
})();
