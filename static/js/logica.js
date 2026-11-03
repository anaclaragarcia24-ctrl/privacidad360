/* PRIVACIDAD 360 — Lógica pura (sin interfaz), para poder probarla de forma automática.
   Funciona en el navegador (window.P360_LOGICA) y en Node (module.exports). */
(function (raiz) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./datos.js') : raiz.P360_DATOS;

  const PUNTAJE_MAX = 3;

  function nivelDe(porcentaje) {
    if (porcentaje < 50) return { id: 'alto', texto: 'Riesgo alto' };
    if (porcentaje < 75) return { id: 'medio', texto: 'Riesgo medio' };
    return { id: 'bajo', texto: 'Buenas prácticas' };
  }

  /* respuestas: { idPregunta: índiceDeOpción }.
     Cada categoría se calcula como promedio ponderado: suma(puntaje × peso) / suma(3 × peso) × 100.
     El puntaje total usa la misma fórmula con todas las preguntas. */
  function calcularDiagnostico(respuestas, preguntas = D.PREGUNTAS, categorias = D.CATEGORIAS) {
    respuestas = respuestas || {};
    const acumulado = {};
    categorias.forEach((c) => { acumulado[c.id] = { obtenido: 0, maximo: 0, respondidas: 0, total: 0 }; });
    let obtenido = 0, maximo = 0, respondidas = 0;
    const recomendaciones = [];

    preguntas.forEach((p) => {
      const a = acumulado[p.cat];
      a.total++;
      const idx = respuestas[p.id];
      if (idx === undefined || idx === null || !p.opciones[idx]) return;
      const puntos = p.opciones[idx][1];
      a.obtenido += puntos * p.peso; a.maximo += PUNTAJE_MAX * p.peso; a.respondidas++;
      obtenido += puntos * p.peso; maximo += PUNTAJE_MAX * p.peso; respondidas++;
      if (puntos < PUNTAJE_MAX) {
        recomendaciones.push({ pregunta: p.id, cat: p.cat, texto: p.rec, prioridad: p.peso * (PUNTAJE_MAX - puntos) });
      }
    });

    recomendaciones.sort((x, y) => y.prioridad - x.prioridad || x.pregunta.localeCompare(y.pregunta, 'es', { numeric: true }));
    const resultadoCategorias = categorias.map((c) => {
      const a = acumulado[c.id];
      const pct = a.maximo ? Math.round((a.obtenido / a.maximo) * 100) : null;
      return { id: c.id, nombre: c.nombre, icono: c.icono, puntaje: pct, nivel: pct === null ? null : nivelDe(pct), respondidas: a.respondidas, total: a.total };
    });
    const total = maximo ? Math.round((obtenido / maximo) * 100) : null;
    return {
      total, nivel: total === null ? null : nivelDe(total), categorias: resultadoCategorias,
      recomendaciones, respondidas, totalPreguntas: preguntas.length, completo: respondidas === preguntas.length
    };
  }

  function etiquetaPrioridad(prioridad) {
    if (prioridad >= 6) return 'Urgente';
    if (prioridad >= 3) return 'Importante';
    return 'Recomendable';
  }

  /* Plan de 7 días: alterna entre las categorías con menor puntaje (máximo 3) y el día 7 repite el diagnóstico. */
  function generarPlan(diagnostico, acciones = D.ACCIONES_PLAN) {
    const debiles = diagnostico.categorias
      .filter((c) => c.puntaje !== null && c.puntaje < 100)
      .sort((a, b) => a.puntaje - b.puntaje)
      .slice(0, 3);
    const base = debiles.length ? debiles : diagnostico.categorias.slice(0, 3);
    const dias = [];
    for (let d = 0; d < 6; d++) {
      const cat = base[d % base.length];
      const lista = acciones[cat.id];
      dias.push({ dia: d + 1, cat: cat.id, texto: lista[Math.floor(d / base.length) % lista.length], hecho: false });
    }
    dias.push({ dia: 7, cat: 'repaso', texto: 'Repite el diagnóstico y compara tus resultados en "Mi progreso".', hecho: false });
    return dias;
  }

  /* ---------- Verificador educativo de contraseñas (100 % local) ---------- */
  const COMUNES = ['123456', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop', 'password', 'contraseña', 'contrasena',
    'abc123', '111111', '000000', 'iloveyou', 'teamo', 'admin', 'futbol', 'america', 'chivas', 'mexico', 'princesa', 'superman',
    'batman', 'dragon', 'monkey', 'letmein', 'welcome', 'hola123', 'amor', 'familia'];
  const SECUENCIAS = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function tieneSecuencia(texto, largo = 4) {
    const t = texto.toLowerCase();
    for (const s of SECUENCIAS) {
      const inv = s.split('').reverse().join('');
      for (let i = 0; i + largo <= s.length; i++) {
        if (t.includes(s.slice(i, i + largo)) || t.includes(inv.slice(i, i + largo))) return true;
      }
    }
    return false;
  }

  function evaluarContrasena(clave) {
    clave = String(clave || '');
    const largo = Array.from(clave).length;
    const hallazgos = [], sugerencias = [];
    if (!largo) return { puntaje: 0, etiqueta: 'Sin evaluar', largo: 0, tipos: 0, hallazgos, sugerencias: ['Escribe una contraseña de ejemplo (no la real).'] };

    const tipos = [/[a-záéíóúñü]/, /[A-ZÁÉÍÓÚÑÜ]/, /[0-9]/, /[^A-Za-z0-9áéíóúñüÁÉÍÓÚÑÜ]/].filter((r) => r.test(clave)).length;
    const minus = clave.toLowerCase();
    let puntaje = largo < 8 ? 0 : largo < 12 ? 1 : largo < 15 ? 2 : largo < 20 ? 3 : 4;

    const esComun = COMUNES.some((c) => minus === c || (minus.replace(/[^a-zñ0-9]/g, '').startsWith(c) && largo < c.length + 4));
    if (esComun) { hallazgos.push('Es una contraseña muy común o casi igual a una muy común.'); puntaje = 0; }
    if (/^\d+$/.test(clave)) { hallazgos.push('Solo tiene números.'); puntaje = Math.max(0, puntaje - 1); }
    if (/(.)\1{2,}/.test(clave)) { hallazgos.push('Repite el mismo carácter varias veces seguidas.'); puntaje = Math.max(0, puntaje - 1); }
    if (tieneSecuencia(clave)) { hallazgos.push('Contiene una secuencia fácil (como "1234", "abcd" o "qwer").'); puntaje = Math.max(0, puntaje - 1); }
    if (/(19|20)\d{2}/.test(clave)) { hallazgos.push('Parece incluir un año; los años de nacimiento son fáciles de adivinar.'); puntaje = Math.max(0, puntaje - 1); }
    if (!esComun && tipos >= 3 && largo >= 12 && puntaje < 4) puntaje++;

    if (largo < 15) sugerencias.push('Hazla más larga: 15 caracteres o más. Una frase de varias palabras es fácil de recordar y difícil de adivinar.');
    if (esComun) sugerencias.push('Evita palabras y combinaciones populares; son las primeras que se prueban.');
    if (tipos < 2 && largo < 20) sugerencias.push('Combinar palabras con algún número o signo ayuda, aunque la longitud importa más.');
    sugerencias.push('Úsala solo en una cuenta y activa la verificación en dos pasos.');

    const etiquetas = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
    return { puntaje, etiqueta: etiquetas[puntaje], largo, tipos, hallazgos, sugerencias };
  }

  /* ---------- Cuestionarios y comparación ---------- */
  function calificarCuestionario(preguntas, respuestas) {
    respuestas = respuestas || {};
    let correctas = 0, contestadas = 0;
    const detalle = preguntas.map((q, i) => {
      const r = respuestas[i];
      const contestada = r !== undefined && r !== null;
      if (contestada) contestadas++;
      const bien = contestada && Number(r) === q.c;
      if (bien) correctas++;
      return { indice: i, tema: q.tema || null, correcta: bien, contestada };
    });
    return { correctas, contestadas, total: preguntas.length, porcentaje: Math.round((correctas / preguntas.length) * 100), completo: contestadas === preguntas.length, detalle };
  }

  function compararEvaluaciones(antes, despues) {
    if (!antes || !despues) return null;
    const temas = antes.detalle.map((d, i) => ({ tema: d.tema, antes: d.correcta, despues: despues.detalle[i] ? despues.detalle[i].correcta : false }));
    return {
      antes: antes.porcentaje, despues: despues.porcentaje, cambio: despues.porcentaje - antes.porcentaje,
      mejoraron: temas.filter((t) => !t.antes && t.despues).map((t) => t.tema),
      empeoraron: temas.filter((t) => t.antes && !t.despues).map((t) => t.tema),
      temas
    };
  }

  /* historial: [{ fecha, total, categorias: { idCat: % } }]. Compara el primer y el último diagnóstico. */
  function compararDiagnosticos(historial) {
    if (!historial || historial.length < 2) return null;
    const primero = historial[0], ultimo = historial[historial.length - 1];
    const categorias = Object.keys(primero.categorias).map((id) => ({
      id, antes: primero.categorias[id], despues: ultimo.categorias[id], cambio: (ultimo.categorias[id] ?? 0) - (primero.categorias[id] ?? 0)
    }));
    return { antes: primero.total, despues: ultimo.total, cambio: ultimo.total - primero.total, categorias };
  }

  function calificarSimulador(elecciones, escenarios = D.ESCENARIOS) {
    elecciones = elecciones || {};
    let correctas = 0, respondidas = 0;
    escenarios.forEach((e) => { if (elecciones[e.id] !== undefined) { respondidas++; if (elecciones[e.id] === e.ok) correctas++; } });
    return { correctas, respondidas, total: escenarios.length };
  }

  function progresoAuditoria(marcas, plataformas = D.AUDITORIA) {
    marcas = marcas || {};
    let total = 0, hechos = 0;
    const porPlataforma = plataformas.map((p) => {
      const m = marcas[p.id] || {};
      const h = p.items.filter((_, i) => m[i]).length;
      total += p.items.length; hechos += h;
      return { id: p.id, hechos: h, total: p.items.length };
    });
    return { hechos, total, porcentaje: total ? Math.round((hechos / total) * 100) : 0, porPlataforma };
  }

  /* ---------- Gamificación ----------
     La experiencia (XP) se calcula SIEMPRE a partir de lo que la persona ha hecho, para que no se pueda duplicar
     ni inflar repitiendo una acción. Devuelve el desglose para que el puntaje sea explicable. */
  const XP = { diagnostico: 100, maxDiagnosticos: 3, diaPlan: 20, simCorrecta: 15, simIntento: 5, modulo: 30, respuestaModulo: 10,
    evaluacion: 40, mejora: 50, itemAuditoria: 5, claveFuerte: 25, guia: 10 };

  function calcularLogros(estado, datos = D) {
    estado = estado || {};
    const historial = estado.historial || [];
    const plan = estado.plan || [];
    const academia = estado.academia || {};
    const evaluacion = estado.evaluacion || {};
    const guias = estado.guias || {};
    const sim = calificarSimulador(estado.simulador, datos.ESCENARIOS);
    const aud = progresoAuditoria(estado.auditoria, datos.AUDITORIA);
    // Días completados del plan actual + los de planes anteriores (al regenerar el plan no se pierde lo logrado), máximo 7.
    const diasHechos = Math.min(plan.filter((d) => d.hecho).length + (estado.diasPrevios || 0), 7);
    const modulos = datos.MODULOS.filter((m) => academia[m.id] && academia[m.id].completo);
    const correctasModulos = modulos.reduce((s, m) => s + academia[m.id].correctas, 0);
    const mejoro = !!(evaluacion.antes && evaluacion.despues && evaluacion.despues.porcentaje > evaluacion.antes.porcentaje);
    const guiasVistas = datos.EMERGENCIAS.filter((g) => guias[g.id]).length;
    const modos = estado.modos || {};

    const desglose = [
      ['Diagnósticos completados', Math.min(historial.length, XP.maxDiagnosticos) * XP.diagnostico],
      ['Días del plan', diasHechos * XP.diaPlan],
      ['Simulador', sim.correctas * XP.simCorrecta + (sim.respondidas - sim.correctas) * XP.simIntento],
      ['Academia', modulos.length * XP.modulo + correctasModulos * XP.respuestaModulo],
      ['Evaluaciones', (evaluacion.antes ? XP.evaluacion : 0) + (evaluacion.despues ? XP.evaluacion : 0) + (mejoro ? XP.mejora : 0)],
      ['Auditoría manual', aud.hechos * XP.itemAuditoria],
      ['Verificador de contraseñas', estado.retos && estado.retos.claveFuerte ? XP.claveFuerte : 0],
      ['Guías de emergencia', guiasVistas * XP.guia],
      ['Modo aventura (estrellas)', (datos.MUNDOS || []).reduce((s, m) => s + ((estado.aventura || {})[m.id] ? estado.aventura[m.id].estrellas : 0), 0) * AVENTURA.xpEstrella],
      ['Modos de juego', xpModos(estado.modos)]
    ].map(([concepto, xp]) => ({ concepto, xp }));
    const xp = desglose.reduce((s, d) => s + d.xp, 0);

    const niveles = datos.NIVELES;
    let i = 0;
    while (i + 1 < niveles.length && xp >= niveles[i + 1].min) i++;
    const nivel = niveles[i], siguiente = niveles[i + 1] || null;
    const progresoNivel = siguiente ? Math.round(((xp - nivel.min) / (siguiente.min - nivel.min)) * 100) : 100;

    const condiciones = {
      'primer-escaneo': historial.length >= 1,
      'segunda-vuelta': historial.length >= 2,
      'candado-acero': !!(estado.retos && estado.retos.claveFuerte),
      detector: sim.correctas >= 5,
      cazaphishing: sim.correctas === sim.total,
      revision: aud.porcentaje >= 50,
      'racha-3': diasHechos >= 3,
      'plan-completo': diasHechos >= 7,
      'mente-360': modulos.length === datos.MODULOS.length,
      aprendizaje: mejoro,
      emergencias: guiasVistas === datos.EMERGENCIAS.length,
      'detective-mirador': Object.keys(modos.casos || {}).length >= 3,
      'caza-rumores': Object.values(modos.casos || {}).some((c) => c.perfecto),
      'competidor': (modos.salas || {}).partidas >= 1,
      'podio': (modos.salas || {}).podios >= 1,
      escapista: Object.keys(modos.escape || {}).length >= 3,
      'muro-digital': ((modos.cortafuegos || {}).mejor || 0) >= CORTAFUEGOS.metaInsignia,
      'buen-vecino': Object.keys((modos.colegio || {}).npc || {}).length >= (datos.TOTAL_NPC || 8),
      'en-equipo': (modos.relevos || 0) >= 1,
      coleccionista: (estado.inventario || []).length >= 5
    };
    const insignias = datos.INSIGNIAS.map((b) => Object.assign({}, b, { obtenida: !!condiciones[b.id] }));

    const estadoMision = {
      escaneo: historial.length >= 1 ? 'hecha' : 'pendiente',
      'eval-antes': evaluacion.antes ? 'hecha' : 'pendiente',
      plan: diasHechos >= 7 ? 'hecha' : (plan.length || diasHechos) ? 'en-curso' : 'pendiente',
      simulador: sim.respondidas === sim.total ? 'hecha' : sim.respondidas ? 'en-curso' : 'pendiente',
      auditoria: aud.porcentaje === 100 ? 'hecha' : aud.hechos ? 'en-curso' : 'pendiente',
      academia: modulos.length === datos.MODULOS.length ? 'hecha' : modulos.length ? 'en-curso' : 'pendiente',
      'eval-despues': evaluacion.despues ? 'hecha' : 'pendiente',
      reescaneo: historial.length >= 2 ? 'hecha' : 'pendiente'
    };
    const misiones = datos.MISIONES.map((m) => Object.assign({}, m, { estado: estadoMision[m.id] }));
    const siguienteMision = misiones.find((m) => m.estado !== 'hecha') || null;

    return { xp, desglose, nivel, siguiente, progresoNivel, insignias, obtenidas: insignias.filter((b) => b.obtenida).length, misiones, siguienteMision };
  }

  /* ---------- Modo aventura ----------
     Acierto: 100 puntos × combo (máx. ×4) + bono por rapidez (hasta 50). Error o tiempo agotado: el combo se reinicia
     y el escudo pierde «danio» puntos. */
  const AVENTURA = { base: 100, bonoRapidez: 50, comboMax: 4, escudo: 100, danio: 25, xpEstrella: 40 };

  function puntuarRespuesta(correcta, tiempoRestante, tiempoTotal, combo, danio = AVENTURA.danio) {
    if (!correcta) return { puntos: 0, combo: 1, danio };
    const rapidez = tiempoTotal ? Math.max(0, Math.min(1, tiempoRestante / tiempoTotal)) : 0;
    const multiplicador = Math.min(combo, AVENTURA.comboMax);
    return { puntos: AVENTURA.base * multiplicador + Math.round(AVENTURA.bonoRapidez * rapidez), combo: Math.min(combo + 1, AVENTURA.comboMax), danio: 0 };
  }

  /* Estrellas de un mundo: 0 si el escudo cayó; 3 con 85 % o más de aciertos; 2 con 60 % o más; 1 si se completó. */
  function estrellasMundo(aciertos, intentos, completado) {
    if (!completado) return 0;
    const pct = intentos ? aciertos / intentos : 0;
    return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;
  }

  /* Racha: días seguidos completando un mundo. Mismo día = no cambia; día siguiente = suma; si se salta un día, reinicia. */
  function actualizarRacha(racha, hoy) {
    if (!racha) return { dias: 1, ultima: hoy, nueva: true };
    if (racha.ultima === hoy) return { dias: racha.dias, ultima: hoy, nueva: false };
    const diferencia = Math.round((Date.parse(hoy) - Date.parse(racha.ultima)) / 86400000);
    return { dias: diferencia === 1 ? racha.dias + 1 : 1, ultima: hoy, nueva: true };
  }

  function mundoDesbloqueado(indice, aventura, mundos = D.MUNDOS) {
    if (indice === 0) return true;
    const anterior = (aventura || {})[mundos[indice - 1].id];
    return !!(anterior && anterior.estrellas >= 1);
  }

  /* Estrellas al terminar el simulador: 3 con 10 o más aciertos, 2 con 7 o más, 1 en otro caso. */
  function estrellasSimulador(correctas, total) {
    if (correctas >= Math.ceil(total * 0.83)) return 3;
    if (correctas >= Math.ceil(total * 0.58)) return 2;
    return 1;
  }

  /* ---------- Modos de juego: monedas, tienda y puntajes ---------- */
  const CORTAFUEGOS = { duracion: 75, bloquear: 20, dejarPasar: 10, metaInsignia: 800 };
  const MONEDAS = { npc: 10, monedaMapa: 2, estrellaAventura: 10, relevo: 15, estrellaEscape: 15, maxSala: 80 };

  function xpModos(modos) {
    modos = modos || {};
    const estrellasEscape = Object.values(modos.escape || {}).reduce((s, e) => s + e.estrellas, 0);
    const mejor = (modos.cortafuegos || {}).mejor || 0;
    return estrellasEscape * 30
      + Object.keys(modos.casos || {}).length * 40
      + Math.min((modos.salas || {}).partidas || 0, 10) * 20
      + (mejor >= CORTAFUEGOS.metaInsignia ? 100 : mejor >= CORTAFUEGOS.metaInsignia / 2 ? 50 : 0)
      + Object.keys((modos.colegio || {}).npc || {}).length * 10
      + Math.min(modos.relevos || 0, 5) * 10;
  }

  function tieneArticulo(estado, articulo) {
    return articulo.precio === 0 || (estado.inventario || []).includes(articulo.id);
  }
  /* Compra con monedas del juego. No cambia nada si no se cumple el nivel o no alcanza el saldo. */
  function comprarArticulo(estado, articulo, nivel) {
    if (tieneArticulo(estado, articulo)) return { ok: false, motivo: 'ya' };
    if (articulo.nivel > nivel) return { ok: false, motivo: 'nivel' };
    if ((estado.monedas || 0) < articulo.precio) return { ok: false, motivo: 'monedas' };
    estado.monedas -= articulo.precio;
    estado.inventario = (estado.inventario || []).concat(articulo.id);
    return { ok: true };
  }
  /* Equipa un artículo propio; si ya estaba puesto, lo quita. El personaje base siempre debe existir. */
  function equiparArticulo(estado, articulo) {
    if (!tieneArticulo(estado, articulo)) return false;
    if (articulo.tipo === 'base') { estado.avatar = articulo.valor; return true; }
    estado.equipo = Object.assign({}, estado.equipo);
    if (estado.equipo[articulo.tipo] === articulo.valor) delete estado.equipo[articulo.tipo];
    else estado.equipo[articulo.tipo] = articulo.valor;
    return true;
  }
  function avatarActual(estado) {
    return Object.assign({ base: estado.avatar || '🦊' }, estado.equipo);
  }

  /* Caso resuelto en solitario: quién (200), tipo (150), acción (200), +50 por rumor hallado, −25 por marcar un hecho como rumor. */
  function puntuarCasoSolo(r) {
    const puntos = Math.max(0, 200 * r.culpable + 150 * r.tipo + 200 * r.accion + 50 * r.falsasHalladas - 25 * r.marcadasMal);
    const perfecto = !!(r.culpable && r.tipo && r.accion && r.falsasHalladas === r.falsasTotal && r.marcadasMal === 0);
    return { puntos, perfecto, monedas: Math.round(puntos / 25), falsasHalladas: r.falsasHalladas, falsasTotal: r.falsasTotal };
  }
  /* 3 estrellas: sin pistas, con máximo un error y sobrando 40 % del tiempo. 2: sobrando 15 %. 1: escapar. */
  function estrellasEscape(restanteMs, totalMs, pistas, errores) {
    const fraccion = totalMs ? restanteMs / totalMs : 0;
    if (fraccion >= 0.4 && pistas === 0 && errores <= 1) return 3;
    return fraccion >= 0.15 ? 2 : 1;
  }
  function cifrarCesar(texto, n) {
    const paso = ((n % 26) + 26) % 26;
    return String(texto).replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + paso) % 26) + 65));
  }
  const velocidadCortafuegos = (seg) => 70 + seg * 2.6;                    // píxeles por segundo: cada vez más rápido
  const intervaloCortafuegos = (seg) => Math.max(0.55, 1.35 - seg * 0.014); // segundos entre mensajes: cada vez más seguidos
  const monedasCortafuegos = (puntos) => Math.min(40, Math.floor(puntos / 40));
  /* Relevo: 100 por acertar + hasta 100 por rapidez; un robo vale la mitad. */
  function puntosRelevo(restanteMs, totalMs, robo) {
    const p = 100 + Math.round(100 * Math.max(0, Math.min(1, restanteMs / totalMs)));
    return robo ? Math.round(p / 2) : p;
  }
  /* Monedas al terminar una sala: por aciertos y por quedar en el podio, con tope. */
  function monedasSala(aciertos, posicion, jugadores) {
    const podio = jugadores >= 3 && posicion <= 3;
    return { monedas: Math.min(MONEDAS.maxSala, 10 + aciertos * 4 + (podio ? [30, 20, 10][posicion - 1] : 0)), podio };
  }

  const LOGICA = { CORTAFUEGOS, MONEDAS, xpModos, tieneArticulo, comprarArticulo, equiparArticulo, avatarActual, puntuarCasoSolo, estrellasEscape, cifrarCesar, velocidadCortafuegos, intervaloCortafuegos, monedasCortafuegos, puntosRelevo, monedasSala, XP, AVENTURA, actualizarRacha, puntuarRespuesta, estrellasMundo, mundoDesbloqueado, calcularLogros, estrellasSimulador, nivelDe, calcularDiagnostico, etiquetaPrioridad, generarPlan, evaluarContrasena, tieneSecuencia, calificarCuestionario, compararEvaluaciones, compararDiagnosticos, calificarSimulador, progresoAuditoria };
  if (typeof module !== 'undefined' && module.exports) module.exports = LOGICA;
  else raiz.P360_LOGICA = LOGICA;
})(typeof window !== 'undefined' ? window : globalThis);
