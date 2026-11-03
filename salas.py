"""PRIVACIDAD 360 — Motor de salas multijugador (sin Flask, para poder probarlo con un reloj controlado).

Dos modos:
  · arena       Competencia de preguntas con código de sala, tiempo límite, puntos, racha, equipos y ranking.
  · detectives  Deducción social: las pistas están repartidas entre los jugadores; hay que reunirlas, descubrir qué
                personaje FICTICIO lo hizo, qué tipo de situación es y cómo actuar. Uno o más jugadores reciben en
                secreto el papel de «Eco» y mezclan pistas falsas.

Reglas de privacidad del diseño:
  · Nadie vota contra una persona real. Se vota por personajes ficticios y, para el Eco, por MÁSCARAS que cambian en
    cada caso; la pantalla nunca relaciona una máscara con un apodo.
  · No hay chat libre: solo frases predefinidas.
  · Las salas viven en memoria. Los apodos nunca se escriben en la base de datos; al terminar solo se guardan totales.
"""
import json
import os
import random
import re
import secrets
import threading
import time
import unicodedata

ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"   # sin 0/O ni 1/I/L para dictar el código sin errores
LARGO_CODIGO = 5
MAX_SALAS = 60
MAX_JUGADORES = 40
MAX_DETECTIVES = 24
MIN_DETECTIVES = 3
VIDA_SALA = 3 * 3600          # una sala se borra tras 3 horas…
SALA_INACTIVA = 45 * 60       # …o tras 45 minutos sin que nadie la consulte
CONECTADO_SEG = 8             # sin consultas en este tiempo, el jugador se muestra desconectado
PAUSA_RESULTADO = 9           # segundos del ranking entre preguntas (avance automático)
PAUSA_REVELAR = 35            # segundos para leer la solución de un caso (avance automático)
SEG_VOTAR = 45
SEG_ACTUAR = 25
MAX_FRASES_POR_CASO = 12

EQUIPOS = ["coral", "menta", "cielo", "lavanda"]
TIPOS_SITUACION = ["bullying", "ciberbullying", "exclusion", "discriminacion"]
FRASES = ["tengo_pista", "sospecho", "descarto", "no_encaja", "falta_fuente", "verifiquemos", "de_acuerdo", "no_seguro"]
MASCARAS = ["🌙", "⭐", "⚡", "🍀", "🔥", "❄️", "🌈", "🍄", "🌊", "🌵", "🎈", "🧩", "🎲", "🔔", "🎯", "🧲", "🪐", "🌻", "🍉", "🥑", "🧊", "🎸", "🚀", "🪁"]
IDIOMAS = ("es", "en", "fr", "pt")
PALABRAS_VETADAS = {
    "puto", "puta", "pendejo", "pendeja", "idiota", "imbecil", "estupido", "estupida", "cabron", "culero", "verga", "mierda", "zorra", "joto", "maricon", "naco",
    "fuck", "shit", "bitch", "asshole", "nigger", "fag", "slut", "whore", "retard",
    "merde", "connard", "salope", "pute", "encule",
    "porra", "caralho", "viado", "buceta", "merda", "otario",
}


class ErrorSala(Exception):
    def __init__(self, mensaje, codigo=400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


def cargar_contenido(carpeta):
    contenido = {}
    for nombre in ("arena", "casos", "tienda"):
        with open(os.path.join(carpeta, nombre + ".json"), encoding="utf-8") as f:
            contenido[nombre] = json.load(f)
    return contenido


def sin_acentos(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def validar_apodo(apodo):
    """Un apodo de juego, no un dato personal: sin correos, enlaces, teléfonos ni insultos."""
    if not isinstance(apodo, str):
        raise ErrorSala("Escribe un apodo.")
    apodo = " ".join(apodo.split())
    if not 2 <= len(apodo) <= 16:
        raise ErrorSala("El apodo debe tener entre 2 y 16 caracteres.")
    if not re.fullmatch(r"[\w áéíóúüñçãõâêôàèÁÉÍÓÚÜÑÇÃÕÂÊÔÀÈ._-]+", apodo) or "@" in apodo:
        raise ErrorSala("El apodo solo puede llevar letras, números, espacios, punto y guiones.")
    if sum(c.isdigit() for c in apodo) > 3:
        raise ErrorSala("Por tu privacidad, el apodo no puede llevar más de 3 números.")
    plano = sin_acentos(apodo).lower()
    partes = set(re.split(r"[\s._-]+", plano))
    if partes & PALABRAS_VETADAS or re.sub(r"[\s._-]+", "", plano) in PALABRAS_VETADAS:
        raise ErrorSala("Elige un apodo respetuoso.")
    return apodo


def puntos_arena(restante, total, racha):
    """Acertar da 500 puntos, hasta 500 más por rapidez y 40 por cada acierto previo seguido (máx. 200)."""
    fraccion = max(0.0, min(1.0, restante / total)) if total else 0
    return 500 + round(500 * fraccion) + min(racha, 5) * 40


class Jugador:
    def __init__(self, ident, token, apodo, avatar, equipo, anfitrion, ahora):
        self.id = ident
        self.token = token
        self.apodo = apodo
        self.avatar = avatar
        self.equipo = equipo
        self.anfitrion = anfitrion
        self.visto = ahora
        self.puntos = 0
        self.racha = 0
        self.aciertos = 0
        self.ultimo = None       # resultado propio de la última pregunta o caso
        self.mascara = None
        self.eco = False
        self.pistas = []
        self.frases = 0


class Sala:
    def __init__(self, codigo, token, modo, ops, ahora):
        self.codigo = codigo
        self.token = token
        self.modo = modo
        self.ops = ops
        self.creada = ahora
        self.visto = ahora
        self.jugadores = {}
        self.vetados = set()
        self.expulsados = set()
        self.siguiente_id = 1
        self.fase = "espera"
        self.ronda = 0
        self.fin = None
        self.total_fase = 0
        self.version = 1
        self.registrada = False
        self.material = []       # preguntas o casos elegidos
        self.respuestas = {}     # arena: id de jugador -> índice; detectives: votos
        self.acciones = {}
        self.resultado = None
        self.pistas = []
        self.tablero = []
        self.feed = []
        self.mascaras_en_juego = []
        self.stats = {"respuestas": 0, "aciertos": 0, "temas": {}, "preguntas": {}}

    def tocar(self):
        self.version += 1


class GestorSalas:
    def __init__(self, contenido, reloj=time.time, azar=None, al_terminar=None):
        self.contenido = contenido
        self.reloj = reloj
        self.azar = azar or random.SystemRandom()
        self.al_terminar = al_terminar
        self.salas = {}
        self.cerrojo = threading.RLock()
        self.permitidos = self._valores_tienda(contenido.get("tienda", []))

    @staticmethod
    def _valores_tienda(tienda):
        permitidos = {}
        for art in tienda:
            permitidos.setdefault(art["tipo"], set()).add(art["valor"])
        return permitidos

    def limpiar_avatar(self, avatar):
        """Solo se aceptan artículos del catálogo: el servidor nunca reenvía texto libre como avatar."""
        limpio = {}
        if isinstance(avatar, dict):
            for tipo, valor in avatar.items():
                if isinstance(valor, str) and valor in self.permitidos.get(tipo, ()):
                    limpio[tipo] = valor
        limpio.setdefault("base", "🦊")
        return limpio

    # ---------- Crear y unirse ----------
    def crear(self, modo, opciones=None, docente_id=None, actividad=None):
        if modo not in ("arena", "detectives"):
            raise ErrorSala("Modo de sala no válido.")
        opciones = opciones if isinstance(opciones, dict) else {}
        with self.cerrojo:
            ahora = self.reloj()
            self._limpiar(ahora)
            if len(self.salas) >= MAX_SALAS:
                raise ErrorSala("El servidor tiene demasiadas salas abiertas. Intenta más tarde.", 503)
            ops = self._opciones(modo, opciones, actividad)
            ops.update(docente_id=docente_id, actividad_id=actividad["id"] if actividad else None, titulo=(actividad or {}).get("titulo"))
            codigo = self._codigo_libre()
            token = secrets.token_urlsafe(18)
            sala = Sala(codigo, token, modo, ops, ahora)
            self.salas[codigo] = sala
            return {"codigo": codigo, "token": token}

    def _codigo_libre(self):
        while True:
            codigo = "".join(self.azar.choice(ALFABETO) for _ in range(LARGO_CODIGO))
            if codigo not in self.salas:
                return codigo

    def _opciones(self, modo, o, actividad):
        def entero(clave, minimo, maximo, defecto):
            v = o.get(clave, defecto)
            if isinstance(v, bool) or not isinstance(v, int) or not minimo <= v <= maximo:
                raise ErrorSala(f"El valor de «{clave}» debe estar entre {minimo} y {maximo}.")
            return v
        automatico = o.get("automatico", True)
        if not isinstance(automatico, bool):
            raise ErrorSala("El valor de «automatico» debe ser verdadero o falso.")
        ops = {"automatico": automatico}
        if modo == "arena":
            equipos = entero("equipos", 0, 4, 0)
            if equipos == 1:
                raise ErrorSala("Elige 0 (sin equipos) o de 2 a 4 equipos.")
            ops.update(segundos=entero("segundos", 10, 90, 20), equipos=equipos)
            propias = (actividad or {}).get("preguntas") or []
            if propias:
                ops["material"] = [self._pregunta_propia(i, p) for i, p in enumerate(propias)]
                ops["rondas"] = len(ops["material"])
            else:
                banco = self.contenido["arena"]
                temas = o.get("temas") or []
                if temas:
                    if not isinstance(temas, list) or not all(isinstance(x, str) for x in temas):
                        raise ErrorSala("Temas no válidos.")
                    banco = [q for q in banco if q["tema"] in temas]
                if not banco:
                    raise ErrorSala("No hay preguntas con esos temas.")
                ops["rondas"] = min(entero("rondas", 3, 20, 8), len(banco))
                ops["material"] = self.azar.sample(banco, ops["rondas"])
        else:
            casos = self.contenido["casos"]
            elegidos = o.get("casos") or []
            if elegidos:
                if not isinstance(elegidos, list):
                    raise ErrorSala("Casos no válidos.")
                casos = [c for c in casos if c["id"] in elegidos]
            if not casos:
                raise ErrorSala("No hay casos disponibles con esa selección.")
            ops["rondas"] = min(entero("rondas", 1, 6, 2), len(casos))
            ops.update(segundos=entero("segundos", 30, 240, 90), equipos=0)
            ops["material"] = self.azar.sample(casos, ops["rondas"])
        return ops

    @staticmethod
    def _pregunta_propia(i, p):
        return {"id": f"propia-{i}", "tema": "propia", "c": p["c"], "es": {"p": p["p"], "o": p["o"], "e": p.get("e") or ""}}

    def _sala(self, codigo):
        codigo = (codigo or "").strip().upper()
        sala = self.salas.get(codigo)
        if not sala:
            raise ErrorSala("No existe una sala con ese código. Revisa que esté bien escrito.", 404)
        return sala

    def unirse(self, codigo, apodo, avatar=None, token_anfitrion=None):
        with self.cerrojo:
            sala = self._sala(codigo)
            self._avanzar_si_toca(sala)
            apodo = validar_apodo(apodo)
            if sala.modo == "detectives" and sala.fase != "espera":
                raise ErrorSala("Este caso ya empezó. Pide a quien creó la sala que abra otra.", 409)
            if sala.fase == "final":
                raise ErrorSala("Esta partida ya terminó.", 409)
            limite = MAX_DETECTIVES if sala.modo == "detectives" else MAX_JUGADORES
            if len(sala.jugadores) >= limite:
                raise ErrorSala("La sala está llena.", 409)
            clave = sin_acentos(apodo).lower()
            if clave in sala.vetados:
                raise ErrorSala("Ese apodo no puede entrar a esta sala.", 403)
            if any(sin_acentos(j.apodo).lower() == clave for j in sala.jugadores.values()):
                raise ErrorSala("Ese apodo ya está en uso en la sala. Prueba otro.", 409)
            anfitrion = bool(token_anfitrion) and secrets.compare_digest(token_anfitrion, sala.token)
            token = secrets.token_urlsafe(18)
            ahora = self.reloj()
            j = Jugador(sala.siguiente_id, token, apodo, self.limpiar_avatar(avatar), self._equipo_libre(sala), anfitrion, ahora)
            sala.siguiente_id += 1
            sala.jugadores[token] = j
            sala.tocar()
            return {"codigo": sala.codigo, "token": token, "id": j.id, "equipo": j.equipo}

    @staticmethod
    def _equipo_libre(sala):
        n = sala.ops.get("equipos") or 0
        if not n:
            return None
        cuenta = {e: 0 for e in EQUIPOS[:n]}
        for j in sala.jugadores.values():
            cuenta[j.equipo] += 1
        return min(cuenta, key=lambda e: (cuenta[e], EQUIPOS.index(e)))

    # ---------- Tiempo ----------
    def _limpiar(self, ahora):
        for codigo, sala in list(self.salas.items()):
            if ahora - sala.creada > VIDA_SALA or ahora - sala.visto > SALA_INACTIVA:
                del self.salas[codigo]

    def _avanzar_si_toca(self, sala):
        ahora = self.reloj()
        guardia = 0
        while sala.fin is not None and ahora >= sala.fin and guardia < 8:
            guardia += 1
            self._fin_de_fase(sala)

    def _poner_fase(self, sala, fase, segundos=None):
        sala.fase = fase
        sala.total_fase = segundos or 0
        sala.fin = self.reloj() + segundos if segundos else None
        sala.tocar()

    def _fin_de_fase(self, sala):
        if sala.fase == "pregunta":
            self._cerrar_pregunta(sala)
        elif sala.fase == "resultado":
            self._siguiente_ronda(sala)
        elif sala.fase == "pistas":
            self._poner_fase(sala, "votar", SEG_VOTAR)
        elif sala.fase == "votar":
            self._poner_fase(sala, "actuar", SEG_ACTUAR)
        elif sala.fase == "actuar":
            self._revelar(sala)
        elif sala.fase == "revelar":
            self._siguiente_ronda(sala)
        else:
            sala.fin = None

    def _siguiente_ronda(self, sala):
        sala.ronda += 1
        if sala.ronda >= len(sala.ops["material"]):
            self._terminar(sala)
        elif sala.modo == "arena":
            self._empezar_pregunta(sala)
        else:
            self._empezar_caso(sala)

    def _terminar(self, sala):
        self._poner_fase(sala, "final")
        if sala.registrada:
            return
        sala.registrada = True
        if self.al_terminar:
            self.al_terminar({
                "modo": sala.modo,
                "docente_id": sala.ops.get("docente_id"),
                "actividad_id": sala.ops.get("actividad_id"),
                "titulo": sala.ops.get("titulo"),
                "jugadores": len(sala.jugadores),
                "rondas": len(sala.ops["material"]),
                "respuestas": sala.stats["respuestas"],
                "aciertos": sala.stats["aciertos"],
                "temas": sala.stats["temas"],
                "preguntas": sala.stats["preguntas"],
            })

    def _contar(self, sala, tema, ident, texto, acierto):
        sala.stats["respuestas"] += 1
        sala.stats["aciertos"] += 1 if acierto else 0
        t = sala.stats["temas"].setdefault(tema, [0, 0])
        t[0] += 1 if acierto else 0
        t[1] += 1
        p = sala.stats["preguntas"].setdefault(ident, {"texto": texto, "tema": tema, "aciertos": 0, "total": 0})
        p["aciertos"] += 1 if acierto else 0
        p["total"] += 1

    # ---------- Arena ----------
    def _empezar_pregunta(self, sala):
        sala.respuestas = {}
        sala.resultado = None
        for j in sala.jugadores.values():
            j.ultimo = None
        self._poner_fase(sala, "pregunta", sala.ops["segundos"])

    def _cerrar_pregunta(self, sala):
        q = sala.ops["material"][sala.ronda]
        opciones = len(q["es"]["o"])
        dist = [0] * opciones
        for j in sala.jugadores.values():
            r = sala.respuestas.get(j.id)
            if r is None:
                j.racha = 0
                j.ultimo = {"respondio": False, "correcta": False, "puntos": 0}
            else:
                dist[r["i"]] += 1
                j.ultimo = {"respondio": True, "correcta": r["ok"], "puntos": r["puntos"]}
            self._contar(sala, q["tema"], q["id"], q["es"]["p"], bool(r and r["ok"]))
        sala.resultado = {"c": q["c"], "dist": dist}
        self._poner_fase(sala, "resultado", PAUSA_RESULTADO if sala.ops["automatico"] else None)

    def _responder(self, sala, j, datos):
        if sala.fase != "pregunta":
            raise ErrorSala("Ahora no se puede responder.", 409)
        if j.id in sala.respuestas:
            raise ErrorSala("Ya respondiste esta pregunta.", 409)
        q = sala.ops["material"][sala.ronda]
        i = datos.get("opcion")
        if isinstance(i, bool) or not isinstance(i, int) or not 0 <= i < len(q["es"]["o"]):
            raise ErrorSala("Opción no válida.")
        ok = i == q["c"]
        puntos = 0
        if ok:
            # El servidor mide el tiempo: el cliente no puede declarar que respondió más rápido.
            puntos = puntos_arena(sala.fin - self.reloj(), sala.total_fase, j.racha)
            j.racha += 1
            j.aciertos += 1
            j.puntos += puntos
        else:
            j.racha = 0
        sala.respuestas[j.id] = {"i": i, "ok": ok, "puntos": puntos}
        sala.tocar()
        if len(sala.respuestas) >= len(sala.jugadores):
            self._cerrar_pregunta(sala)
        return {"registrada": True}

    # ---------- Detectives ----------
    def _empezar_caso(self, sala):
        caso = sala.ops["material"][sala.ronda]
        jugadores = list(sala.jugadores.values())
        self.azar.shuffle(jugadores)
        mascaras = self.azar.sample(MASCARAS, len(jugadores))
        n_ecos = max(1, len(jugadores) // 6)
        sala.mascaras_en_juego = sorted(mascaras, key=MASCARAS.index)
        reales = [{"falsa": False, "textos": {l: caso[l]["pistas"][i] for l in IDIOMAS if l in caso}} for i in range(len(caso["es"]["pistas"]))]
        falsas = [{"falsa": True, "textos": {l: caso[l]["falsas"][i] for l in IDIOMAS if l in caso}} for i in range(len(caso["es"]["falsas"]))]
        # Los identificadores se barajan para que el número de una pista no revele si es falsa.
        todas = reales + falsas
        ids = self.azar.sample(range(100, 999), len(todas))
        for p, ident in zip(todas, ids):
            p["id"] = ident
        sala.pistas = todas
        sala.tablero = []
        sala.feed = []
        sala.respuestas = {}
        sala.acciones = {}
        sala.resultado = None
        cola = reales[:]
        self.azar.shuffle(cola)
        pos = 0
        for k, j in enumerate(jugadores):
            j.mascara = mascaras[k]
            j.eco = k < n_ecos
            j.frases = 0
            j.ultimo = None
            if j.eco:
                j.pistas = [falsas[(k + d) % len(falsas)]["id"] for d in range(2)] + [cola[pos % len(cola)]["id"]]
                pos += 1
            else:
                j.pistas = [cola[(pos + d) % len(cola)]["id"] for d in range(2)]
                pos += 2
        self._poner_fase(sala, "pistas", sala.ops["segundos"])

    def _pista(self, sala, ident):
        return next((p for p in sala.pistas if p["id"] == ident), None)

    def _publicar(self, sala, j, datos):
        if sala.fase != "pistas":
            raise ErrorSala("Las pistas se publican antes de votar.", 409)
        ident = datos.get("pista")
        if ident not in j.pistas:
            raise ErrorSala("Esa pista no es tuya.", 403)
        if any(t["pista"] == ident for t in sala.tablero):
            raise ErrorSala("Esa pista ya está en el tablero.", 409)
        sala.tablero.append({"pista": ident, "mascara": j.mascara})
        sala.tocar()
        return {"publicada": True}

    def _frase(self, sala, j, datos):
        if sala.fase not in ("pistas", "votar"):
            raise ErrorSala("Ahora no se pueden enviar frases.", 409)
        frase = datos.get("frase")
        if frase not in FRASES:
            raise ErrorSala("Solo se pueden usar las frases predefinidas.")
        objetivo = datos.get("objetivo")
        caso = sala.ops["material"][sala.ronda]
        if objetivo is not None and objetivo not in caso["sospechosos"] and objetivo not in sala.mascaras_en_juego:
            raise ErrorSala("Solo se puede mencionar a personajes ficticios o máscaras.")
        if j.frases >= MAX_FRASES_POR_CASO:
            raise ErrorSala("Ya usaste todas tus frases de este caso.", 429)
        j.frases += 1
        sala.feed = (sala.feed + [{"mascara": j.mascara, "frase": frase, "objetivo": objetivo}])[-30:]
        sala.tocar()
        return {"enviada": True}

    def _votar(self, sala, j, datos):
        if sala.fase != "votar":
            raise ErrorSala("Ahora no es momento de votar.", 409)
        caso = sala.ops["material"][sala.ronda]
        sospechoso, tipo, mascara = datos.get("sospechoso"), datos.get("situacion"), datos.get("mascara")
        if sospechoso not in caso["sospechosos"]:
            raise ErrorSala("Elige a uno de los personajes del caso.")
        if tipo not in TIPOS_SITUACION:
            raise ErrorSala("Elige el tipo de situación.")
        if mascara is not None and (mascara not in sala.mascaras_en_juego or mascara == j.mascara):
            raise ErrorSala("Esa máscara no es válida.")
        sala.respuestas[j.id] = {"sospechoso": sospechoso, "tipo": tipo, "mascara": mascara}
        sala.tocar()
        if len(sala.respuestas) >= len(sala.jugadores):
            self._poner_fase(sala, "actuar", SEG_ACTUAR)
        return {"registrado": True}

    def _actuar(self, sala, j, datos):
        if sala.fase != "actuar":
            raise ErrorSala("Ahora no es momento de elegir la acción.", 409)
        caso = sala.ops["material"][sala.ronda]
        i = datos.get("opcion")
        if isinstance(i, bool) or not isinstance(i, int) or not 0 <= i < len(caso["es"]["acciones"]):
            raise ErrorSala("Opción no válida.")
        sala.acciones[j.id] = i
        sala.tocar()
        if len(sala.acciones) >= len(sala.jugadores):
            self._revelar(sala)
        return {"registrado": True}

    def _revelar(self, sala):
        caso = sala.ops["material"][sala.ronda]
        ecos = [j for j in sala.jugadores.values() if j.eco]
        mascaras_eco = {j.mascara for j in ecos}
        votos_s, votos_t, votos_m = {}, {}, {}
        for v in sala.respuestas.values():
            votos_s[v["sospechoso"]] = votos_s.get(v["sospechoso"], 0) + 1
            votos_t[v["tipo"]] = votos_t.get(v["tipo"], 0) + 1
            if v["mascara"]:
                votos_m[v["mascara"]] = votos_m.get(v["mascara"], 0) + 1
        n = len(sala.jugadores)
        grupo_acerto = votos_s.get(caso["culpable"], 0) * 2 > n
        desc = sum(votos_m.get(m, 0) for m in mascaras_eco)
        eco_descubierto = desc * 2 >= n
        for j in sala.jugadores.values():
            v = sala.respuestas.get(j.id) or {}
            a = {
                "culpable": v.get("sospechoso") == caso["culpable"],
                "tipo": v.get("tipo") == caso["tipo"],
                "accion": sala.acciones.get(j.id) == caso["accion"],
                "eco": bool(v.get("mascara")) and v.get("mascara") in mascaras_eco,
            }
            puntos = 200 * a["culpable"] + 150 * a["tipo"] + 200 * a["accion"] + 100 * a["eco"]
            if j.eco:
                puntos += 200 if not grupo_acerto else 0
                puntos += 150 if not eco_descubierto else 0
            j.puntos += puntos
            j.aciertos += a["culpable"] + a["tipo"] + a["accion"]
            j.ultimo = dict(a, puntos=puntos, soyEco=j.eco)
            self._contar(sala, caso["tipo"], caso["id"] + "-culpable", caso["es"]["titulo"] + " · ¿quién?", a["culpable"])
            self._contar(sala, caso["tipo"], caso["id"] + "-tipo", caso["es"]["titulo"] + " · ¿qué tipo?", a["tipo"])
            self._contar(sala, caso["tipo"], caso["id"] + "-accion", caso["es"]["titulo"] + " · ¿cómo actuar?", a["accion"])
        sala.resultado = {
            "culpable": caso["culpable"],
            "tipo": caso["tipo"],
            "accion": caso["accion"],
            "falsas": [p["id"] for p in sala.pistas if p["falsa"]],
            "ecos": sorted(mascaras_eco, key=MASCARAS.index),
            "ecoDescubierto": eco_descubierto,
            "votosSospechoso": votos_s,
            "votosTipo": votos_t,
            "votosMascara": votos_m,
            "leccion": {l: caso[l]["leccion"] for l in IDIOMAS if l in caso},
            "explicacion": {l: caso[l]["explicacion"] for l in IDIOMAS if l in caso},
        }
        self._poner_fase(sala, "revelar", PAUSA_REVELAR if sala.ops["automatico"] else None)

    # ---------- Consultas y acciones ----------
    def estado(self, codigo, token, version=None):
        with self.cerrojo:
            ahora = self.reloj()
            self._limpiar(ahora)
            sala = self._sala(codigo)
            sala.visto = ahora
            jugador = sala.jugadores.get(token)
            es_anfitrion = bool(token) and (secrets.compare_digest(token, sala.token) or bool(jugador and jugador.anfitrion))
            if not jugador and not es_anfitrion:
                if token in sala.expulsados:
                    raise ErrorSala("Quien creó la sala te sacó de la partida.", 403)
                raise ErrorSala("No formas parte de esta sala.", 403)
            if jugador:
                jugador.visto = ahora
            self._avanzar_si_toca(sala)
            restante = max(0, round((sala.fin - ahora) * 1000)) if sala.fin else None
            if version is not None and version == sala.version:
                return {"sinCambios": True, "version": sala.version, "restante_ms": restante}
            return self._vista(sala, jugador, es_anfitrion, restante, ahora)

    def accion(self, codigo, token, tipo, datos=None):
        datos = datos if isinstance(datos, dict) else {}
        with self.cerrojo:
            sala = self._sala(codigo)
            self._avanzar_si_toca(sala)
            jugador = sala.jugadores.get(token)
            es_anfitrion = bool(token) and (secrets.compare_digest(token, sala.token) or bool(jugador and jugador.anfitrion))
            if tipo in ("iniciar", "siguiente", "expulsar", "cerrar"):
                if not es_anfitrion:
                    raise ErrorSala("Solo quien creó la sala puede hacer esto.", 403)
                return getattr(self, "_a_" + tipo)(sala, datos)
            if not jugador:
                raise ErrorSala("No formas parte de esta sala.", 403)
            if tipo == "salir":
                del sala.jugadores[token]
                sala.tocar()
                return {"salio": True}
            acciones = {"responder": self._responder} if sala.modo == "arena" else {"publicar": self._publicar, "frase": self._frase, "votar": self._votar, "actuar": self._actuar}
            if tipo not in acciones:
                raise ErrorSala("Acción no válida en este modo.")
            return acciones[tipo](sala, jugador, datos)

    def _a_iniciar(self, sala, _datos):
        if sala.fase != "espera":
            raise ErrorSala("La partida ya empezó.", 409)
        minimo = MIN_DETECTIVES if sala.modo == "detectives" else 1
        if len(sala.jugadores) < minimo:
            raise ErrorSala(f"Se necesitan al menos {minimo} jugadores para empezar.", 409)
        sala.ronda = 0
        if sala.modo == "arena":
            self._empezar_pregunta(sala)
        else:
            self._empezar_caso(sala)
        return {"iniciada": True}

    def _a_siguiente(self, sala, _datos):
        if sala.fase in ("espera", "final"):
            raise ErrorSala("No hay nada que adelantar ahora.", 409)
        self._fin_de_fase(sala)
        return {"fase": sala.fase}

    def _a_expulsar(self, sala, datos):
        objetivo = next((j for j in sala.jugadores.values() if j.id == datos.get("id")), None)
        if not objetivo:
            raise ErrorSala("Ese jugador ya no está en la sala.", 404)
        sala.vetados.add(sin_acentos(objetivo.apodo).lower())
        sala.expulsados.add(objetivo.token)
        del sala.jugadores[objetivo.token]
        sala.respuestas.pop(objetivo.id, None)
        sala.tocar()
        return {"expulsado": True}

    def _a_cerrar(self, sala, _datos):
        if sala.fase not in ("espera", "final"):
            self._terminar(sala)
        del self.salas[sala.codigo]
        return {"cerrada": True}

    # ---------- Lo que ve cada quien ----------
    def _ranking(self, sala, ahora):
        lista = [{"id": j.id, "apodo": j.apodo, "avatar": j.avatar, "equipo": j.equipo, "puntos": j.puntos, "aciertos": j.aciertos,
                  "conectado": ahora - j.visto <= CONECTADO_SEG} for j in sala.jugadores.values()]
        return sorted(lista, key=lambda x: (-x["puntos"], x["id"]))

    def _equipos(self, sala):
        """El puntaje de un equipo es el PROMEDIO de sus integrantes: así un equipo más grande no gana solo por serlo."""
        n = sala.ops.get("equipos") or 0
        if not n:
            return None
        salida = []
        for e in EQUIPOS[:n]:
            miembros = [j for j in sala.jugadores.values() if j.equipo == e]
            salida.append({"id": e, "n": len(miembros), "puntos": round(sum(j.puntos for j in miembros) / len(miembros)) if miembros else 0})
        return sorted(salida, key=lambda x: -x["puntos"])

    def _vista(self, sala, j, es_anfitrion, restante, ahora):
        ranking = self._ranking(sala, ahora)
        v = {
            "codigo": sala.codigo, "modo": sala.modo, "fase": sala.fase, "ronda": sala.ronda, "rondas": len(sala.ops["material"]),
            "version": sala.version, "restante_ms": restante, "total_s": sala.total_fase, "anfitrion": es_anfitrion, "titulo": sala.ops.get("titulo"),
            "automatico": sala.ops["automatico"], "ranking": ranking, "equipos": self._equipos(sala), "minimo": MIN_DETECTIVES if sala.modo == "detectives" else 1,
        }
        if j:
            pos = next((i for i, r in enumerate(ranking) if r["id"] == j.id), 0)
            v["yo"] = {"id": j.id, "apodo": j.apodo, "avatar": j.avatar, "equipo": j.equipo, "puntos": j.puntos, "aciertos": j.aciertos, "racha": j.racha, "posicion": pos + 1, "ultimo": j.ultimo}
        if sala.fase in ("espera", "final"):
            return v
        if sala.modo == "arena":
            self._vista_arena(sala, j, v)
        else:
            self._vista_detectives(sala, j, v)
        return v

    def _vista_arena(self, sala, j, v):
        q = sala.ops["material"][sala.ronda]
        v["pregunta"] = {"id": q["id"], "tema": q["tema"], "textos": {l: {"p": q[l]["p"], "o": q[l]["o"]} for l in IDIOMAS if l in q}}
        v["respondieron"] = len(sala.respuestas)
        if j:
            r = sala.respuestas.get(j.id)
            v["yo"]["respondio"] = r["i"] if r else None
        if sala.fase == "resultado":
            v["resultado"] = dict(sala.resultado, explicacion={l: q[l].get("e", "") for l in IDIOMAS if l in q})

    def _vista_detectives(self, sala, j, v):
        caso = sala.ops["material"][sala.ronda]
        def pista(ident):
            p = self._pista(sala, ident)
            return {"id": ident, "textos": p["textos"]}
        c = {
            "id": caso["id"], "sospechosos": caso["sospechosos"],
            "textos": {l: {"titulo": caso[l]["titulo"], "intro": caso[l]["intro"]} for l in IDIOMAS if l in caso},
            "tablero": [dict(pista(t["pista"]), mascara=t["mascara"]) for t in sala.tablero],
            "feed": sala.feed, "mascaras": sala.mascaras_en_juego,
        }
        if sala.fase in ("actuar", "revelar"):
            c["acciones"] = {l: caso[l]["acciones"] for l in IDIOMAS if l in caso}
        v["caso"] = c
        v["votaron"] = len(sala.respuestas)
        v["actuaron"] = len(sala.acciones)
        if j:
            publicadas = {t["pista"] for t in sala.tablero}
            v["yo"].update(
                mascara=j.mascara, eco=j.eco,
                pistas=[dict(pista(i), publicada=i in publicadas) for i in j.pistas],
                voto=sala.respuestas.get(j.id), accion=sala.acciones.get(j.id), frasesRestantes=MAX_FRASES_POR_CASO - j.frases,
            )
        if sala.fase == "revelar":
            v["resultado"] = sala.resultado
