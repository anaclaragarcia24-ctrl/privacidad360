/* Pruebas automáticas de la lógica de PRIVACIDAD 360 (Node.js 18+, sin dependencias).
   Ejecutar desde 08_Aplicacion_Web:  node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../static/js/datos.js');
const L = require('../static/js/logica.js');

const todas = (indice) => Object.fromEntries(D.PREGUNTAS.map((p) => [p.id, indice(p)]));
const mejor = (p) => p.opciones.reduce((m, o, i) => (o[1] > p.opciones[m][1] ? i : m), 0);
const peor = (p) => p.opciones.reduce((m, o, i) => (o[1] < p.opciones[m][1] ? i : m), 0);

test('el contenido cumple los mínimos del proyecto', () => {
  assert.ok(D.PREGUNTAS.length >= 20, 'diagnóstico con 20+ preguntas');
  assert.equal(D.CATEGORIAS.length, 6);
  assert.ok(D.ESCENARIOS.length >= 10, 'simulador con 10+ situaciones');
  assert.equal(D.MODULOS.length, 6, 'academia con 6 módulos');
  assert.equal(D.EVALUACION.antes.length, D.EVALUACION.despues.length);
  D.EVALUACION.antes.forEach((q, i) => assert.equal(q.tema, D.EVALUACION.despues[i].tema, 'formas equivalentes'));
  D.PREGUNTAS.forEach((p) => assert.ok(D.CATEGORIAS.some((c) => c.id === p.cat), p.id));
  D.ESCENARIOS.forEach((e) => assert.ok(e.ok >= 0 && e.ok < e.opciones.length, e.id));
});

test('diagnóstico: todas las mejores respuestas dan 100 y ninguna recomendación', () => {
  const r = L.calcularDiagnostico(todas(mejor));
  assert.equal(r.total, 100);
  assert.equal(r.nivel.id, 'bajo');
  assert.equal(r.recomendaciones.length, 0);
  assert.ok(r.completo);
  r.categorias.forEach((c) => assert.equal(c.puntaje, 100));
});

test('diagnóstico: todas las peores respuestas dan 0 y una recomendación por pregunta', () => {
  const r = L.calcularDiagnostico(todas(peor));
  assert.equal(r.total, 0);
  assert.equal(r.nivel.id, 'alto');
  assert.equal(r.recomendaciones.length, D.PREGUNTAS.length);
});

test('diagnóstico: las recomendaciones se ordenan por prioridad (peso × distancia al máximo)', () => {
  const r = L.calcularDiagnostico(todas(peor));
  for (let i = 1; i < r.recomendaciones.length; i++) assert.ok(r.recomendaciones[i - 1].prioridad >= r.recomendaciones[i].prioridad);
  assert.equal(r.recomendaciones[0].prioridad, 9);
});

test('diagnóstico incompleto se marca como incompleto', () => {
  const r = L.calcularDiagnostico({ p1: 0 });
  assert.equal(r.completo, false);
  assert.equal(r.respondidas, 1);
});

test('diagnóstico: cálculo ponderado de una categoría', () => {
  // acceso: p1 (peso 3) = 3 pts, p2 (3) = 0, p3 (3) = 3, p4 (2) = 3  → (9+0+9+6)/(9+9+9+6) = 24/33 = 72.7 → 73
  const r = L.calcularDiagnostico({ p1: 3, p2: 0, p3: 3, p4: 3 });
  assert.equal(r.categorias.find((c) => c.id === 'acceso').puntaje, 73);
});

test('niveles: límites 50 y 75', () => {
  assert.equal(L.nivelDe(49).id, 'alto');
  assert.equal(L.nivelDe(50).id, 'medio');
  assert.equal(L.nivelDe(74).id, 'medio');
  assert.equal(L.nivelDe(75).id, 'bajo');
});

test('plan de 7 días: 7 acciones, prioriza la categoría más baja y termina con repaso', () => {
  const plan = L.generarPlan(L.calcularDiagnostico(D.PERFIL_DEMO.respuestas));
  assert.equal(plan.length, 7);
  assert.equal(plan[6].cat, 'repaso');
  const diag = L.calcularDiagnostico(D.PERFIL_DEMO.respuestas);
  const masBaja = diag.categorias.slice().sort((a, b) => a.puntaje - b.puntaje)[0].id;
  assert.equal(plan[0].cat, masBaja);
});

test('contraseñas: las comunes y cortas son muy débiles', () => {
  for (const c of ['123456', 'password', 'qwerty', 'Futbol10', 'abc']) assert.equal(L.evaluarContrasena(c).puntaje, 0, c);
});

test('contraseñas: una frase larga es fuerte', () => {
  const r = L.evaluarContrasena('mi-bici-azul-sube-al-cerro-lento');
  assert.ok(r.puntaje >= 3);
  assert.equal(r.hallazgos.length, 0);
});

test('contraseñas: detecta años y secuencias', () => {
  const r = L.evaluarContrasena('Mariana2009abcd');
  assert.ok(r.hallazgos.some((h) => h.includes('año')));
  assert.ok(r.hallazgos.some((h) => h.includes('secuencia')));
});

test('contraseñas: vacía no se evalúa', () => {
  assert.equal(L.evaluarContrasena('').etiqueta, 'Sin evaluar');
});

test('cuestionarios y comparación antes/después', () => {
  const antes = L.calificarCuestionario(D.EVALUACION.antes, { 0: 0, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 2, 9: 2 });
  assert.equal(antes.correctas, 5);
  const correctas = Object.fromEntries(D.EVALUACION.despues.map((q, i) => [i, q.c]));
  const despues = L.calificarCuestionario(D.EVALUACION.despues, correctas);
  assert.equal(despues.porcentaje, 100);
  const comp = L.compararEvaluaciones(antes, despues);
  assert.equal(comp.cambio, 50);
  assert.equal(comp.mejoraron.length, 5);
});

test('comparación de diagnósticos requiere al menos dos', () => {
  assert.equal(L.compararDiagnosticos([{ total: 50, categorias: { acceso: 50 } }]), null);
  const c = L.compararDiagnosticos([{ total: 50, categorias: { acceso: 40 } }, { total: 70, categorias: { acceso: 80 } }]);
  assert.equal(c.cambio, 20);
  assert.equal(c.categorias[0].cambio, 40);
});

test('gamificación: estado vacío = 0 XP, nivel 1, sin insignias y primera misión el escaneo', () => {
  const lg = L.calcularLogros({});
  assert.equal(lg.xp, 0);
  assert.equal(lg.nivel.n, 1);
  assert.equal(lg.obtenidas, 0);
  assert.equal(lg.siguienteMision.id, 'escaneo');
});

test('gamificación: la XP se calcula a partir de lo hecho y es explicable', () => {
  const estado = {
    historial: [{ total: 40, categorias: {} }],
    plan: [{ hecho: true }, { hecho: true }, { hecho: true }, { hecho: false }],
    simulador: { s1: 2, s2: 0 },                         // 1 correcta (15) + 1 intento (5)
    auditoria: { whatsapp: { 0: true, 1: true } },        // 2 × 5
    retos: { claveFuerte: true },                         // 25
    guias: { robo: true }                                 // 10
  };
  const lg = L.calcularLogros(estado);
  assert.equal(lg.xp, 100 + 60 + 20 + 10 + 25 + 10);
  assert.equal(lg.desglose.reduce((s, d) => s + d.xp, 0), lg.xp);
  assert.equal(lg.nivel.n, 2);                            // 225 XP ≥ 150
  const ids = lg.insignias.filter((b) => b.obtenida).map((b) => b.id);
  assert.deepEqual(ids.sort(), ['candado-acero', 'primer-escaneo', 'racha-3'].sort());
});

test('gamificación: los diagnósticos repetidos no inflan la XP (máximo 3)', () => {
  const h = Array.from({ length: 6 }, () => ({ total: 50, categorias: {} }));
  assert.equal(L.calcularLogros({ historial: h }).desglose[0].xp, 300);
});

test('gamificación: insignia de aprendizaje solo si la evaluación final supera a la inicial', () => {
  const base = { evaluacion: { antes: { porcentaje: 50 }, despues: { porcentaje: 50 } } };
  assert.equal(L.calcularLogros(base).insignias.find((b) => b.id === 'aprendizaje').obtenida, false);
  base.evaluacion.despues.porcentaje = 80;
  assert.equal(L.calcularLogros(base).insignias.find((b) => b.id === 'aprendizaje').obtenida, true);
});

test('gamificación: con todo completo se alcanza el nivel máximo y todas las insignias', () => {
  const academia = Object.fromEntries(D.MODULOS.map((m) => [m.id, { completo: true, correctas: 3 }]));
  const auditoria = Object.fromEntries(D.AUDITORIA.map((p) => [p.id, Object.fromEntries(p.items.map((_, i) => [i, true]))]));
  const estado = {
    historial: [{}, {}], plan: Array.from({ length: 7 }, () => ({ hecho: true })),
    simulador: Object.fromEntries(D.ESCENARIOS.map((e) => [e.id, e.ok])), academia, auditoria,
    evaluacion: { antes: { porcentaje: 50 }, despues: { porcentaje: 90 } }, retos: { claveFuerte: true },
    guias: Object.fromEntries(D.EMERGENCIAS.map((g) => [g.id, true])),
    inventario: ['a', 'b', 'c', 'd', 'e'],
    modos: {
      casos: { c1: { mejor: 700, perfecto: true }, c2: { mejor: 300 }, c3: { mejor: 300 } }, salas: { partidas: 1, podios: 1 }, relevos: 1,
      escape: { e1: { estrellas: 1 }, e2: { estrellas: 1 }, e3: { estrellas: 1 } }, cortafuegos: { mejor: 800 },
      colegio: { npc: Object.fromEntries(Array.from({ length: 8 }, (_, i) => ['n' + i, true])) }
    }
  };
  const lg = L.calcularLogros(estado);
  assert.equal(lg.nivel.n, D.NIVELES.length);
  assert.equal(lg.obtenidas, D.INSIGNIAS.length);
  assert.equal(lg.siguienteMision, null);
  assert.equal(lg.progresoNivel, 100);
});

test('gamificación: al regenerar el plan se conservan los días ya completados (máximo 7)', () => {
  const lg = L.calcularLogros({ plan: [{ hecho: true }, { hecho: false }], diasPrevios: 3 });
  assert.equal(lg.desglose[1].xp, 4 * 20);
  assert.ok(lg.insignias.find((b) => b.id === 'racha-3').obtenida);
  assert.equal(L.calcularLogros({ plan: Array.from({ length: 7 }, () => ({ hecho: true })), diasPrevios: 7 }).desglose[1].xp, 140);
});

test('aventura: el contenido de los mundos existe y es coherente', () => {
  assert.equal(D.MUNDOS.length, 5);
  assert.ok(D.MUNDOS[D.MUNDOS.length - 1].pasos.some((p) => p.tipo === 'jefe'), 'el jefe está en el último mundo');
  const todos = D.ESCENARIOS.concat(D.ESCENARIOS_JUEGO);
  D.MUNDOS.forEach((m) => m.pasos.forEach((p) => {
    if (p.tipo === 'decision') assert.ok(todos.some((e) => e.id === p.esc), p.esc);
    if (p.tipo === 'censura') assert.ok(D.PUBLICACIONES[p.post].elementos.some((e) => e.riesgo));
    if (p.tipo === 'rapido') assert.ok((p.set === 'testigo' ? D.ACCIONES_TESTIGO : D.MENSAJES_RAPIDOS).length >= p.n);
  }));
  todos.forEach((e) => assert.ok(D.CONSECUENCIAS[e.tema], 'consecuencia para ' + e.tema));
});

test('aventura: el mundo «Patio sin Acoso» cubre bullying, ciberbullying, acoso y denuncia segura', () => {
  const m = D.MUNDOS.find((x) => x.id === 'm5');
  const temas = m.pasos.filter((p) => p.tipo === 'decision').map((p) => D.ESCENARIOS_JUEGO.find((e) => e.id === p.esc).tema);
  assert.ok(temas.includes('bullying') && temas.includes('acoso'));
  assert.ok(m.pasos.some((p) => p.tipo === 'orden'));
  assert.ok(m.pasos.some((p) => p.set === 'testigo'));
  assert.equal(D.RUTA_DENUNCIA.length, 5);
  assert.ok(D.ACCIONES_TESTIGO.some((a) => a.ayuda) && D.ACCIONES_TESTIGO.some((a) => !a.ayuda));
});

test('idiomas: el contenido del juego en inglés coincide con el español (mismo orden de opciones)', () => {
  global.window = global.window || {};
  global.localStorage = { getItem: () => null, setItem() {} };
  global.document = { documentElement: {} };
  require('../static/js/i18n.js');
  const I = global.window.P360_I18N;
  const C = I._contenidoEN;
  D.ESCENARIOS.concat(D.ESCENARIOS_JUEGO).forEach((e) => assert.equal(C.escenarios[e.id].opciones.length, e.opciones.length, e.id));
  ['antes', 'despues'].forEach((f) => D.EVALUACION[f].forEach((q, i) => assert.equal(C.evaluacion[f][i].o.length, q.o.length, f + i)));
  assert.equal(C.mensajes.length, D.MENSAJES_RAPIDOS.length);
  assert.equal(C.testigo.length, D.ACCIONES_TESTIGO.length);
  assert.equal(C.ruta.length, D.RUTA_DENUNCIA.length);
  D.MUNDOS.forEach((m) => assert.ok(C.mundos[m.id], m.id));
  assert.equal(I.t('Jugar'), 'Jugar');
  I.cambiar('en');
  assert.equal(I.t('Jugar'), 'Play');
  assert.equal(I.t('Reto {n}/{total}', { n: 2, total: 5 }), 'Challenge 2/5');
  assert.equal(I.loc('escenario', D.ESCENARIOS_JUEGO[0]).ok, D.ESCENARIOS_JUEGO[0].ok);
  assert.equal(I.t('texto sin traducir'), 'texto sin traducir');
  I.cambiar('es');
});

test('aventura: puntos con combo y bono por rapidez; el error reinicia el combo y quita escudo', () => {
  assert.deepEqual(L.puntuarRespuesta(true, 20, 20, 1), { puntos: 150, combo: 2, danio: 0 });
  assert.deepEqual(L.puntuarRespuesta(true, 0, 20, 3), { puntos: 300, combo: 4, danio: 0 });
  assert.equal(L.puntuarRespuesta(true, 10, 20, 9).puntos, 425);   // combo máximo ×4
  assert.deepEqual(L.puntuarRespuesta(false, 20, 20, 4), { puntos: 0, combo: 1, danio: 25 });
});

test('aventura: estrellas por mundo y desbloqueo en orden', () => {
  assert.equal(L.estrellasMundo(4, 4, true), 3);
  assert.equal(L.estrellasMundo(3, 4, true), 2);
  assert.equal(L.estrellasMundo(1, 4, true), 1);
  assert.equal(L.estrellasMundo(4, 4, false), 0);
  assert.ok(L.mundoDesbloqueado(0, {}));
  assert.ok(!L.mundoDesbloqueado(1, {}));
  assert.ok(L.mundoDesbloqueado(1, { m1: { estrellas: 1 } }));
  assert.ok(!L.mundoDesbloqueado(2, { m1: { estrellas: 3 } }));
});

test('aventura: cada estrella da 40 XP (solo cuenta la mejor marca)', () => {
  const lg = L.calcularLogros({ aventura: { m1: { estrellas: 3, mejor: 900 }, m2: { estrellas: 1, mejor: 200 } } });
  assert.equal(lg.desglose.find((d) => d.concepto.startsWith('Modo aventura')).xp, 160);
  assert.equal(lg.xp, 160);
});

test('racha: suma con días seguidos, no cambia el mismo día y se reinicia si se salta un día', () => {
  const r1 = L.actualizarRacha(null, '2026-11-02');
  assert.deepEqual(r1, { dias: 1, ultima: '2026-11-02', nueva: true });
  assert.equal(L.actualizarRacha(r1, '2026-11-02').nueva, false);
  assert.equal(L.actualizarRacha(r1, '2026-11-03').dias, 2);
  assert.equal(L.actualizarRacha({ dias: 5, ultima: '2026-11-02' }, '2026-11-05').dias, 1);
});

test('estrellas del simulador', () => {
  assert.equal(L.estrellasSimulador(12, 12), 3);
  assert.equal(L.estrellasSimulador(10, 12), 3);
  assert.equal(L.estrellasSimulador(7, 12), 2);
  assert.equal(L.estrellasSimulador(6, 12), 1);
});

test('simulador y auditoría', () => {
  assert.deepEqual(L.calificarSimulador({ s1: 2, s2: 0 }), { correctas: 1, respondidas: 2, total: D.ESCENARIOS.length });
  const a = L.progresoAuditoria({ whatsapp: { 0: true, 1: true } });
  assert.equal(a.hechos, 2);
});

/* ---------- Modos de juego: tienda, monedas y puntajes ---------- */
const articulo = (o = {}) => Object.assign({ id: 'sombrero-1', tipo: 'sombrero', valor: '🎩', precio: 50, nivel: 2 }, o);

test('tienda: comprar exige saldo y nivel, y descuenta una sola vez', () => {
  const e = { monedas: 60, inventario: [] };
  assert.deepEqual(L.comprarArticulo(e, articulo(), 1), { ok: false, motivo: 'nivel' });
  assert.equal(e.monedas, 60);
  assert.deepEqual(L.comprarArticulo({ monedas: 10 }, articulo(), 2), { ok: false, motivo: 'monedas' });
  assert.deepEqual(L.comprarArticulo(e, articulo(), 2), { ok: true });
  assert.equal(e.monedas, 10);
  assert.deepEqual(e.inventario, ['sombrero-1']);
  assert.deepEqual(L.comprarArticulo(e, articulo(), 2), { ok: false, motivo: 'ya' });
  assert.equal(e.monedas, 10);
});

test('tienda: lo gratis ya es tuyo; equipar pone y quita; el personaje base no se puede quitar', () => {
  const e = { avatar: '🦊', inventario: ['sombrero-1'] };
  assert.equal(L.tieneArticulo(e, articulo({ precio: 0, id: 'x' })), true);
  assert.equal(L.equiparArticulo(e, articulo({ id: 'otro', precio: 10 })), false);
  L.equiparArticulo(e, articulo());
  assert.deepEqual(L.avatarActual(e), { base: '🦊', sombrero: '🎩' });
  L.equiparArticulo(e, articulo());
  assert.deepEqual(L.avatarActual(e), { base: '🦊' });
  L.equiparArticulo(e, articulo({ tipo: 'base', valor: '🐼', precio: 0 }));
  assert.equal(L.avatarActual(e).base, '🐼');
});

test('detectives en solitario: el puntaje suma lo acertado y castiga marcar hechos como rumores', () => {
  const r = L.puntuarCasoSolo({ culpable: true, tipo: true, accion: true, falsasHalladas: 3, falsasTotal: 3, marcadasMal: 0 });
  assert.equal(r.puntos, 700);
  assert.equal(r.perfecto, true);
  assert.equal(L.puntuarCasoSolo({ culpable: false, tipo: false, accion: false, falsasHalladas: 0, falsasTotal: 3, marcadasMal: 5 }).puntos, 0);
  const parcial = L.puntuarCasoSolo({ culpable: true, tipo: false, accion: true, falsasHalladas: 1, falsasTotal: 3, marcadasMal: 2 });
  assert.equal(parcial.puntos, 400);
  assert.equal(parcial.perfecto, false);
});

test('escape: estrellas según tiempo, pistas y errores; el cifrado es reversible y conserva espacios', () => {
  assert.equal(L.estrellasEscape(200000, 360000, 0, 1), 3);
  assert.equal(L.estrellasEscape(200000, 360000, 1, 0), 2);
  assert.equal(L.estrellasEscape(60000, 360000, 0, 0), 2);
  assert.equal(L.estrellasEscape(10000, 360000, 0, 0), 1);
  const c = L.cifrarCesar('PEDIR AYUDA', 7);
  assert.notEqual(c, 'PEDIR AYUDA');
  assert.equal(L.cifrarCesar(c, -7), 'PEDIR AYUDA');
  assert.equal(c.indexOf(' '), 5);
  assert.equal(L.cifrarCesar('XYZ', 3), 'ABC');
});

test('cortafuegos, relevo y salas: dificultad creciente, robo a la mitad y tope de monedas', () => {
  assert.ok(L.velocidadCortafuegos(60) > L.velocidadCortafuegos(0));
  assert.ok(L.intervaloCortafuegos(60) < L.intervaloCortafuegos(0));
  assert.ok(L.intervaloCortafuegos(1000) >= 0.55);
  assert.equal(L.monedasCortafuegos(100000), 40);
  assert.equal(L.puntosRelevo(10000, 10000, false), 200);
  assert.equal(L.puntosRelevo(10000, 10000, true), 100);
  assert.equal(L.puntosRelevo(0, 10000, false), 100);
  assert.deepEqual(L.monedasSala(0, 1, 2), { monedas: 10, podio: false });
  assert.deepEqual(L.monedasSala(3, 1, 3), { monedas: 52, podio: true });
  assert.equal(L.monedasSala(99, 1, 30).monedas, L.MONEDAS.maxSala);
});

test('XP de modos: se calcula desde lo logrado y tiene topes', () => {
  assert.equal(L.xpModos(undefined), 0);
  assert.equal(L.xpModos({ salas: { partidas: 999 } }), 200);
  assert.equal(L.xpModos({ escape: { e1: { estrellas: 3 } } }), 90);
  assert.equal(L.xpModos({ cortafuegos: { mejor: 400 } }), 50);
  assert.equal(L.xpModos({ casos: { c1: {} }, colegio: { npc: { a: 1 } }, relevos: 9 }), 40 + 10 + 50);
});

/* ---------- Idiomas: todo texto de los modos debe existir en inglés, francés y portugués ---------- */
test('idiomas: los modos nuevos no tienen textos sin traducir', () => {
  const fs = require('fs');
  const path = require('path');
  const JS = path.join(__dirname, '..', 'static', 'js');
  const registrados = {};
  const i18n = {
    registrar(c, textos, contenido) { registrados[c] = Object.assign(registrados[c] || {}, textos); if (contenido) registrados[c + ':c'] = contenido; },
    agregarTabla(t) { Object.keys(t).forEach((es) => { assert.equal(t[es].length, 3, es); ['en', 'fr', 'pt'].forEach((c, i) => { registrados[c] = registrados[c] || {}; registrados[c][es] = t[es][i]; }); }); }
  };
  global.window = {};
  delete require.cache[path.join(JS, 'i18n.js')];
  require(path.join(JS, 'i18n.js'));
  registrados.en = Object.assign({}, global.window.P360_I18N._textosEN);
  global.window = { P360_I18N: i18n };
  for (const f of ['textos', 'fr', 'pt']) { delete require.cache[path.join(JS, 'idiomas', f + '.js')]; require(path.join(JS, 'idiomas', f + '.js')); }
  delete global.window;
  const claves = new Set();
  const re = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g;
  for (const f of ['nucleo.js', 'salas.js', 'modos.js', 'escape.js', 'escuela.js', 'docente.js']) {
    const s = fs.readFileSync(path.join(JS, f), 'utf8');
    let m;
    while ((m = re.exec(s))) claves.add(m[1]);
  }
  assert.ok(claves.size > 250);
  for (const c of ['en', 'fr', 'pt']) {
    const faltan = [...claves].filter((k) => !registrados[c][k]);
    assert.deepEqual(faltan, [], `Faltan en ${c}`);
  }
  // Los marcadores {x} de cada texto deben conservarse en la traducción.
  for (const c of ['en', 'fr', 'pt']) for (const k of claves) {
    const vars = (k.match(/\{[a-z]+\}/g) || []).sort().join();
    assert.equal((registrados[c][k].match(/\{[a-z]+\}/g) || []).sort().join(), vars, `${c}: ${k}`);
  }
  // El contenido del modo aventura tiene la misma forma en todos los idiomas.
  const en = require('../static/js/datos.js');
  for (const c of ['fr', 'pt']) {
    const k = registrados[c + ':c'];
    assert.equal(Object.keys(k.escenarios).length, en.ESCENARIOS.length + en.ESCENARIOS_JUEGO.length);
    assert.equal(k.mensajes.length, en.MENSAJES_RAPIDOS.length);
    assert.equal(k.testigo.length, en.ACCIONES_TESTIGO.length);
    en.EVALUACION.antes.forEach((q, i) => assert.equal(k.evaluacion.antes[i].o.length, q.o.length));
  }
});

test('contenido de modos: escape y colegio están completos en los 4 idiomas', () => {
  const fs = require('fs');
  const path = require('path');
  const leer = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'static', 'datos', n + '.json'), 'utf8'));
  for (const sala of leer('escape')) {
    for (const l of ['es', 'en', 'fr', 'pt']) {
      for (const o of sala.objetos) {
        const n = sala[l].objetos[o.id];
        assert.ok(n.nombre && n.enunciado && n.pista, `${sala.id}/${l}/${o.id}`);
        if (o.tipo === 'clasificar') assert.equal(n.items.length, o.items.length);
        if (o.tipo === 'cesar') assert.match(n.frase, /^[A-Z ]+$/, `${sala.id}/${l}: el cifrado solo admite A-Z sin acentos`);
        if (o.tipo === 'ordenar') assert.ok(n.pasos.length >= 3);
        if (o.tipo === 'elegir') assert.ok(o.correctas.every((c) => c < n.opciones.length));
      }
    }
  }
  const npcs = leer('colegio');
  assert.equal(npcs.length, 8);
  for (const n of npcs) for (const l of ['es', 'en', 'fr', 'pt']) { assert.equal(n[l].o.length, 3); assert.equal(n[l].r.length, 3); assert.ok(n.c < 3); }
  const paquetes = leer('cortafuegos');
  assert.ok(paquetes.filter((x) => x.m).length >= 10 && paquetes.filter((x) => !x.m).length >= 8);
  for (const x of paquetes) for (const l of ['es', 'en', 'fr', 'pt']) assert.ok(x.t[l] && x.r[l]);
});
test('emojis: ninguno de los que Windows 10 no puede dibujar (se verían como un cuadrito)', () => {
  const fs = require('fs');
  const path = require('path');
  const archivos = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(path.join(d, e.name)) : /\.(js|json|html)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const prohibidos = /\u200D|\u{1FA99}|\u{1FAA7}|\u{1FAB8}|\u{1FABB}|\u{1FAD0}/u;   // uniones con ZWJ y emojis de Unicode 13 en adelante
  for (const f of archivos(path.join(__dirname, '..', 'static'))) assert.equal(prohibidos.test(fs.readFileSync(f, 'utf8')), false, f);
});