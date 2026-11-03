/* PRIVACIDAD 360 — Piezas compartidas por los modos de juego: registro de vistas, datos por idioma, API, avatar y cronómetro. */
(function () {
  'use strict';
  const I = window.P360_I18N;
  const t = (s, v) => I.t(s, v);
  const esc = (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mezclar = (lista) => lista.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

  /* Contenido escrito por idioma: { es: …, en: …, fr: …, pt: … } */
  const tx = (obj) => (obj ? (obj[I.idioma()] !== undefined ? obj[I.idioma()] : obj.es) : '');

  const cacheDatos = {};
  function datos(nombre) {
    if (!cacheDatos[nombre]) {
      cacheDatos[nombre] = fetch(`datos/${nombre}.json`).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).catch((e) => { delete cacheDatos[nombre]; throw e; });
    }
    return cacheDatos[nombre];
  }

  /* Llama a la API y traduce los errores a un mensaje útil. sinConexion = no se pudo hablar con el servidor. */
  async function api(ruta, opciones = {}) {
    const cabeceras = Object.assign({}, opciones.cabeceras);
    const peticion = { method: opciones.metodo || 'GET', headers: cabeceras };
    if (opciones.cuerpo !== undefined) { cabeceras['Content-Type'] = 'application/json'; peticion.body = JSON.stringify(opciones.cuerpo); }
    // Una petición colgada (Wi-Fi inestable) no debe dejar al jugador esperando para siempre: se cancela y se reintenta.
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), opciones.limiteMs || 8000);
    peticion.signal = control.signal;
    let r, cuerpo;
    try {
      r = await fetch(ruta, peticion);
      cuerpo = await r.json().catch(() => ({}));
    } catch (e) { const err = new Error(t('Sin conexión con el servidor.')); err.sinConexion = true; throw err; }
    finally { clearTimeout(limite); }
    if (!r.ok) {
      const err = new Error(cuerpo.error ? t(cuerpo.error) : 'HTTP ' + r.status);
      err.codigo = r.status; err.sinConexion = !!cuerpo.sinConexion;
      throw err;
    }
    return cuerpo;
  }

  /* Personajes ficticios de los casos y del Colegio Mirador. */
  const PERSONAJES = {
    zaz: { n: 'Zaz', i: '🦎' }, mika: { n: 'Mika', i: '🐙' }, tobi: { n: 'Tobi', i: '🦔' }, lumi: { n: 'Lumi', i: '🐼' }, nilo: { n: 'Nilo', i: '🦉' },
    kira: { n: 'Kira', i: '🦊' }, bruno: { n: 'Bruno', i: '🐻' }, pipa: { n: 'Pipa', i: '🐧' }, ollin: { n: 'Ollin', i: '🦜' }, rufa: { n: 'Rufa', i: '🐰' }
  };

  /* Avatar por capas: animal base + accesorios equipados. Todo sale del catálogo, nunca de una foto. */
  function avatar(a, tam = 'm', etiqueta) {
    a = a || {};
    const capa = (clase, v) => (v ? `<span class="av-capa ${clase}">${esc(v)}</span>` : '');
    const seguro = (v) => String(v || '').replace(/[^a-z]/g, '');
    return `<span class="av av-${tam} fondo-${seguro(a.fondo) || 'lavanda'} marco-${seguro(a.marco) || 'simple'}" ${etiqueta ? `role="img" aria-label="${esc(etiqueta)}"` : 'aria-hidden="true"'}><span class="av-base">${esc(a.base || '🦊')}</span>${capa('av-sombrero', a.sombrero)}${capa('av-gafas', a.gafas)}${capa('av-mascota', a.mascota)}</span>`;
  }

  /* Apodos inventados: sirven para no usar el nombre real en una sala. */
  const APODOS_A = ['Zorro', 'Búho', 'Rana', 'Panda', 'Cometa', 'Nube', 'Robot', 'Pulpo', 'Lince', 'Tigre', 'Colibrí', 'Koala', 'Rayo', 'Delfín', 'Erizo', 'Mapache'];
  const APODOS_B = ['Azul', 'Lila', 'Veloz', 'Menta', 'Solar', 'Lunar', 'Astuto', 'Rosa', 'Sabio', 'Coral', 'Audaz', 'Cielo', 'Feliz', 'Ámbar'];
  const apodoAzar = () => `${APODOS_A[Math.floor(Math.random() * APODOS_A.length)]} ${APODOS_B[Math.floor(Math.random() * APODOS_B.length)]}`;

  /* Cronómetro de cuenta regresiva que pinta una barra y un número dentro de un contenedor. */
  function cronometro(raiz, opciones) {
    let fin = Date.now() + opciones.ms, total = opciones.total || opciones.ms, ultimo = null, id = null;
    const pintar = () => {
      const resta = Math.max(0, fin - Date.now());
      const barra = raiz.querySelector('.reloj-relleno');
      const num = raiz.querySelector('[data-reloj-num]');
      if (barra) { barra.style.width = Math.min(100, (resta / total) * 100) + '%'; barra.classList.toggle('critico', resta < total * 0.25); }
      const seg = Math.ceil(resta / 1000);
      if (num) num.textContent = seg;
      if (seg !== ultimo) { ultimo = seg; if (opciones.alSegundo) opciones.alSegundo(seg); }
      if (resta <= 0) { detener(); if (opciones.alAcabar) opciones.alAcabar(); }
    };
    function detener() { if (id) { clearInterval(id); id = null; } }
    function arrancar() { detener(); id = setInterval(pintar, 150); pintar(); }
    arrancar();
    return { detener, ajustar(ms, nuevoTotal) { fin = Date.now() + ms; if (nuevoTotal) total = nuevoTotal; arrancar(); }, restante: () => Math.max(0, fin - Date.now()) };
  }

  const relojHtml = (etiqueta = '') => `<div class="reloj-fila"><span class="reloj-num" aria-hidden="true">⏱ <b data-reloj-num></b></span><div class="reloj" role="img" aria-label="${esc(etiqueta || t('Tiempo restante'))}"><span class="reloj-relleno"></span></div></div>`;

  window.P360 = { vistas: {}, registrar(nombre, def) { this.vistas[nombre] = def; }, esc, tx, t, mezclar, datos, api, PERSONAJES, avatar, apodoAzar, cronometro, relojHtml, app: null };
})();
