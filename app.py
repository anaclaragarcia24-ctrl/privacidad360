"""PRIVACIDAD 360 — Servidor Flask.

Sirve la plataforma (carpeta static/) y una API mínima para estadísticas ANÓNIMAS y AGREGADAS.
Principio de diseño: minimización de datos. El servidor solo recibe puntajes numéricos por
categoría (0-100) cuando la persona da su consentimiento; nunca recibe nombres, respuestas
individuales, contraseñas, fotos ni direcciones IP (no se registran).

También aloja las salas multijugador (salas.py) y el modo docente. Los apodos de una sala viven solo en memoria;
de cada partida terminada se guardan únicamente totales, sin apodos ni datos por persona.

Uso:  python app.py                 solo en esta computadora (http://127.0.0.1:5360)
      python app.py --lan           también para otros dispositivos de la misma red local
      python app.py --lan --cert cert.pem --clave clave.pem    igual, con HTTPS (necesario para instalar la app en otros dispositivos)
"""
import argparse
import hashlib
import json
import mimetypes
import os
import random
import secrets
import socket
import sqlite3
import time
from collections import defaultdict, deque
from datetime import date

from flask import Flask, abort, g, jsonify, request, send_from_directory

from salas import ALFABETO, ErrorSala, GestorSalas, cargar_contenido

BASE = os.path.dirname(os.path.abspath(__file__))
mimetypes.add_type("application/manifest+json", ".webmanifest")
CATEGORIAS = ("acceso", "configuracion", "compartir", "mensajes", "imagenes", "respuesta")
MINIMO_PARA_MOSTRAR = 10      # no se muestran estadísticas con menos resultados (evita deducir casos individuales)
LIMITE_ENVIOS = 20            # envíos máximos por cliente…
VENTANA_SEGUNDOS = 3600       # …por hora (en memoria, no se guarda la IP)
LIMITE_CUERPO = 2 * 1024      # las peticiones de juego pesan menos de 300 bytes…
LIMITE_CUERPO_DOCENTE = 64 * 1024   # …solo una actividad con preguntas propias necesita más
MINIMO_DETALLE = 3            # el docente no ve aciertos de una pregunta o tema con menos respuestas que esto
MAX_ACTIVIDADES = 200
MAX_PREGUNTAS_ACTIVIDAD = 30
ESTADOS_ACTIVIDAD = ("borrador", "lista", "realizada")


def crear_app(config=None):
    app = Flask(__name__, static_folder=os.path.join(BASE, "static"), static_url_path="")
    app.config.update(
        BASE_DATOS=os.environ.get("P360_DB", os.path.join(BASE, "instance", "privacidad360.db")),
        MAX_CONTENT_LENGTH=LIMITE_CUERPO_DOCENTE,
        P360_LAN=False,
    )
    app.json.ensure_ascii = False
    if config:
        app.config.update(config)
    os.makedirs(os.path.dirname(app.config["BASE_DATOS"]), exist_ok=True)
    envios_recientes = defaultdict(deque)
    contadores = defaultdict(deque)

    def conexion():
        if "db" not in g:
            g.db = sqlite3.connect(app.config["BASE_DATOS"])
            g.db.row_factory = sqlite3.Row
        return g.db

    @app.teardown_appcontext
    def cerrar(_exc):
        db = g.pop("db", None)
        if db is not None:
            db.close()

    def iniciar_bd():
        db = sqlite3.connect(app.config["BASE_DATOS"])
        columnas = ", ".join(f"{c} INTEGER NOT NULL CHECK({c} BETWEEN 0 AND 100)" for c in CATEGORIAS)
        db.execute(f"""CREATE TABLE IF NOT EXISTS resultados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            total INTEGER NOT NULL CHECK(total BETWEEN 0 AND 100),
            {columnas},
            demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0, 1))
        )""")
        # Datos FICTICIOS para el modo demostración (marcados con demo = 1). Se generan una sola vez
        # con semilla fija para que la demostración sea reproducible.
        hay_demo = db.execute("SELECT COUNT(*) FROM resultados WHERE demo = 1").fetchone()[0]
        if not hay_demo:
            azar = random.Random(360)
            medias = {"acceso": 48, "configuracion": 58, "compartir": 55, "mensajes": 63, "imagenes": 70, "respuesta": 45}
            filas = []
            for _ in range(42):
                cats = {c: max(0, min(100, round(azar.gauss(m, 16)))) for c, m in medias.items()}
                total = round(sum(cats.values()) / len(cats))
                filas.append(("2026-10-01", total, *[cats[c] for c in CATEGORIAS], 1))
            marcas = ", ".join("?" * (len(CATEGORIAS) + 3))
            db.executemany(f"INSERT INTO resultados (fecha, total, {', '.join(CATEGORIAS)}, demo) VALUES ({marcas})", filas)
        db.execute("""CREATE TABLE IF NOT EXISTS docentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT, clave_hash TEXT NOT NULL UNIQUE, creado TEXT NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS actividades (
            id INTEGER PRIMARY KEY AUTOINCREMENT, docente_id INTEGER NOT NULL REFERENCES docentes(id),
            titulo TEXT NOT NULL, modo TEXT NOT NULL CHECK(modo IN ('arena', 'detectives')), grupo TEXT NOT NULL DEFAULT '',
            fecha TEXT NOT NULL DEFAULT '', estado TEXT NOT NULL DEFAULT 'lista', config TEXT NOT NULL, actualizada TEXT NOT NULL)""")
        # Una fila por partida terminada: solo totales. No hay columna para apodos ni datos por jugador.
        db.execute("""CREATE TABLE IF NOT EXISTS partidas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, modo TEXT NOT NULL, docente_id INTEGER, actividad_id INTEGER,
            titulo TEXT, jugadores INTEGER NOT NULL, rondas INTEGER NOT NULL, respuestas INTEGER NOT NULL, aciertos INTEGER NOT NULL, detalle TEXT NOT NULL)""")
        db.commit()
        db.close()

    iniciar_bd()

    def registrar_partida(r):
        db = sqlite3.connect(app.config["BASE_DATOS"])
        db.execute(
            "INSERT INTO partidas (fecha, modo, docente_id, actividad_id, titulo, jugadores, rondas, respuestas, aciertos, detalle) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (date.today().isoformat(), r["modo"], r["docente_id"], r["actividad_id"], r["titulo"], r["jugadores"], r["rondas"], r["respuestas"], r["aciertos"],
             json.dumps({"temas": r["temas"], "preguntas": r["preguntas"]}, ensure_ascii=False)),
        )
        if r["actividad_id"]:
            db.execute("UPDATE actividades SET estado = 'realizada' WHERE id = ?", (r["actividad_id"],))
        db.commit()
        db.close()

    gestor = GestorSalas(cargar_contenido(os.path.join(BASE, "static", "datos")), reloj=app.config.get("RELOJ", time.time), al_terminar=registrar_partida)
    app.extensions["p360_salas"] = gestor

    @app.errorhandler(ErrorSala)
    def error_sala(e):
        return jsonify({"error": e.mensaje}), e.codigo

    @app.before_request
    def limitar_cuerpo():
        if request.content_length and request.content_length > LIMITE_CUERPO and not request.path.startswith("/api/docente"):
            abort(413)

    @app.after_request
    def cabeceras_seguridad(resp):
        resp.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
            "connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        )
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        elif request.path in ("/sw.js", "/manifest.webmanifest"):
            resp.headers["Cache-Control"] = "no-cache"   # el navegador debe poder detectar versiones nuevas de la app
        return resp

    def error(mensaje, codigo=400):
        return jsonify({"error": mensaje}), codigo

    def excede(cubo, maximo, ventana=VENTANA_SEGUNDOS):
        # Igual que abajo: la IP solo se usa en memoria para frenar abusos.
        clave = (cubo, request.remote_addr or "desconocido")
        ahora = time.time()
        cola = contadores[clave]
        while cola and ahora - cola[0] > ventana:
            cola.popleft()
        if len(cola) >= maximo:
            return True
        cola.append(ahora)
        return False

    def limite_superado():
        # La IP se usa solo en memoria para limitar abusos y se descarta; no se escribe en la base de datos.
        clave = request.remote_addr or "desconocido"
        ahora = time.time()
        cola = envios_recientes[clave]
        while cola and ahora - cola[0] > VENTANA_SEGUNDOS:
            cola.popleft()
        if len(cola) >= LIMITE_ENVIOS:
            return True
        cola.append(ahora)
        return False

    @app.get("/")
    def inicio():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/api/salud")
    def salud():
        return jsonify({"estado": "ok"})

    @app.post("/api/resultados")
    def recibir_resultado():
        datos = request.get_json(silent=True)
        if not isinstance(datos, dict):
            return error("Se esperaba un objeto JSON.")
        permitidas = {"total", "categorias", "demo"}
        if set(datos) - permitidas:
            return error("La petición contiene campos no permitidos.")
        cats = datos.get("categorias")
        if not isinstance(cats, dict) or set(cats) != set(CATEGORIAS):
            return error("Faltan categorías o hay categorías desconocidas.")
        valores = [datos.get("total")] + [cats[c] for c in CATEGORIAS]
        if not all(isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 100 for v in valores):
            return error("Los puntajes deben ser números enteros entre 0 y 100.")
        demo = datos.get("demo", False)
        if not isinstance(demo, bool):
            return error("El campo demo debe ser verdadero o falso.")
        if limite_superado():
            return error("Demasiados envíos. Intenta más tarde.", 429)
        marcas = ", ".join("?" * (len(CATEGORIAS) + 3))
        db = conexion()
        db.execute(
            f"INSERT INTO resultados (fecha, total, {', '.join(CATEGORIAS)}, demo) VALUES ({marcas})",
            (date.today().isoformat(), valores[0], *valores[1:], int(demo)),
        )
        db.commit()
        return jsonify({"guardado": True}), 201

    @app.get("/api/estadisticas")
    def estadisticas():
        modo = request.args.get("modo", "real")
        if modo not in ("real", "demo"):
            return error("Modo no válido. Usa 'real' o 'demo'.")
        filas = conexion().execute(
            f"SELECT total, {', '.join(CATEGORIAS)} FROM resultados WHERE demo = ?", (1 if modo == "demo" else 0,)
        ).fetchall()
        n = len(filas)
        respuesta = {"modo": modo, "participaciones": n, "minimo": MINIMO_PARA_MOSTRAR, "suficientes": n >= MINIMO_PARA_MOSTRAR}
        if n < MINIMO_PARA_MOSTRAR:
            return jsonify(respuesta)
        promedios = {c: round(sum(f[c] for f in filas) / n) for c in CATEGORIAS}
        niveles = {"alto": 0, "medio": 0, "bajo": 0}
        for f in filas:
            niveles["alto" if f["total"] < 50 else "medio" if f["total"] < 75 else "bajo"] += 1
        respuesta.update(
            promedio_total=round(sum(f["total"] for f in filas) / n),
            categorias=promedios,
            categoria_mas_baja=min(promedios, key=promedios.get),
            niveles={k: round(v * 100 / n) for k, v in niveles.items()},
        )
        return jsonify(respuesta)

    # ---------- Red local ----------
    @app.get("/api/red")
    def red():
        puerto = request.host.rsplit(":", 1)[1] if ":" in request.host else ("443" if request.is_secure else "80")
        esquema = "https" if request.is_secure else "http"
        ip = ip_local() if app.config["P360_LAN"] else None
        return jsonify({"lan": bool(app.config["P360_LAN"]), "url": f"{esquema}://{ip}:{puerto}" if ip else None, "https": request.is_secure})

    # ---------- Salas multijugador ----------
    def token_sala():
        return request.headers.get("X-P360-Token", "")

    def cuerpo_json():
        datos = request.get_json(silent=True)
        if not isinstance(datos, dict):
            raise ErrorSala("Se esperaba un objeto JSON.")
        return datos

    @app.post("/api/salas")
    def crear_sala():
        datos = cuerpo_json()
        if excede("crear-sala", 30):
            return error("Se crearon demasiadas salas desde este dispositivo. Intenta más tarde.", 429)
        return jsonify(gestor.crear(datos.get("modo"), datos.get("opciones"))), 201

    @app.post("/api/salas/<codigo>/unirse")
    def unirse_sala(codigo):
        datos = cuerpo_json()
        if excede("unirse", 120, 300):   # frena probar códigos al azar
            return error("Demasiados intentos. Espera unos minutos.", 429)
        return jsonify(gestor.unirse(codigo, datos.get("apodo"), datos.get("avatar"), token_sala() or None)), 201

    @app.get("/api/salas/<codigo>")
    def estado_sala(codigo):
        version = request.args.get("v", type=int)
        return jsonify(gestor.estado(codigo, token_sala(), version))

    @app.post("/api/salas/<codigo>/accion")
    def accion_sala(codigo):
        datos = cuerpo_json()
        return jsonify(gestor.accion(codigo, token_sala(), datos.get("tipo"), datos))

    # ---------- Modo docente ----------
    # La «clave de docente» la genera el servidor al azar: así nadie puede reutilizar una contraseña real. Solo se guarda su hash.
    def hash_clave(clave):
        return hashlib.sha256(clave.encode("utf-8")).hexdigest()

    def docente_actual():
        clave = request.headers.get("X-P360-Docente", "").strip().upper()
        fila = None
        if clave:
            fila = conexion().execute("SELECT id FROM docentes WHERE clave_hash = ?", (hash_clave(clave),)).fetchone()
        if not fila:
            if excede("clave-docente", 20, 300):
                raise ErrorSala("Demasiados intentos con una clave incorrecta. Espera unos minutos.", 429)
            raise ErrorSala("La clave de docente no es válida.", 401)
        return fila["id"]

    def validar_actividad(d):
        permitidas = {"titulo", "modo", "grupo", "fecha", "estado", "opciones", "preguntas"}
        if set(d) - permitidas:
            raise ErrorSala("La actividad contiene campos no permitidos.")
        def texto(clave, maximo, obligatorio=False):
            v = d.get(clave, "")
            if not isinstance(v, str) or len(v.strip()) > maximo or (obligatorio and not v.strip()):
                raise ErrorSala(f"Revisa el campo «{clave}» (máximo {maximo} caracteres).")
            return v.strip()
        titulo, grupo, fecha = texto("titulo", 80, True), texto("grupo", 40), texto("fecha", 10)
        if fecha:
            try:
                date.fromisoformat(fecha)
            except ValueError:
                raise ErrorSala("La fecha no es válida.")
        modo = d.get("modo")
        if modo not in ("arena", "detectives"):
            raise ErrorSala("Modo no válido.")
        estado = d.get("estado", "lista")
        if estado not in ESTADOS_ACTIVIDAD:
            raise ErrorSala("Estado no válido.")
        preguntas = d.get("preguntas") or []
        if not isinstance(preguntas, list) or len(preguntas) > MAX_PREGUNTAS_ACTIVIDAD:
            raise ErrorSala(f"Una actividad admite hasta {MAX_PREGUNTAS_ACTIVIDAD} preguntas.")
        limpias = []
        for i, q in enumerate(preguntas, 1):
            if not isinstance(q, dict) or not isinstance(q.get("p"), str) or not 3 <= len(q["p"].strip()) <= 200:
                raise ErrorSala(f"Pregunta {i}: escribe un texto de 3 a 200 caracteres.")
            o = q.get("o")
            if not isinstance(o, list) or not 2 <= len(o) <= 4 or not all(isinstance(x, str) and 1 <= len(x.strip()) <= 100 for x in o):
                raise ErrorSala(f"Pregunta {i}: necesita de 2 a 4 opciones de hasta 100 caracteres.")
            c = q.get("c")
            if isinstance(c, bool) or not isinstance(c, int) or not 0 <= c < len(o):
                raise ErrorSala(f"Pregunta {i}: marca cuál opción es la correcta.")
            e = q.get("e") or ""
            if not isinstance(e, str) or len(e) > 200:
                raise ErrorSala(f"Pregunta {i}: la explicación admite hasta 200 caracteres.")
            limpias.append({"p": q["p"].strip(), "o": [x.strip() for x in o], "c": c, "e": e.strip()})
        opciones = d.get("opciones") or {}
        if not isinstance(opciones, dict):
            raise ErrorSala("Opciones no válidas.")
        # Comprueba las opciones con las mismas reglas que una sala real antes de guardarlas.
        gestor._opciones(modo, opciones, {"preguntas": limpias, "id": 0})
        return {"titulo": titulo, "modo": modo, "grupo": grupo, "fecha": fecha, "estado": estado, "config": {"opciones": opciones, "preguntas": limpias}}

    def actividad_publica(f):
        cfg = json.loads(f["config"])
        return {"id": f["id"], "titulo": f["titulo"], "modo": f["modo"], "grupo": f["grupo"], "fecha": f["fecha"], "estado": f["estado"],
                "opciones": cfg["opciones"], "preguntas": cfg["preguntas"], "actualizada": f["actualizada"]}

    def buscar_actividad(ident, docente):
        fila = conexion().execute("SELECT * FROM actividades WHERE id = ? AND docente_id = ?", (ident, docente)).fetchone()
        if not fila:
            raise ErrorSala("Esa actividad no existe.", 404)
        return fila

    @app.post("/api/docente/clave")
    def crear_clave_docente():
        if excede("nueva-clave", 5):
            return error("Se generaron demasiadas claves desde este dispositivo. Intenta más tarde.", 429)
        partes = ["".join(secrets.choice(ALFABETO) for _ in range(4)) for _ in range(3)]
        clave = "P360-" + "-".join(partes)
        db = conexion()
        db.execute("INSERT INTO docentes (clave_hash, creado) VALUES (?, ?)", (hash_clave(clave), date.today().isoformat()))
        db.commit()
        return jsonify({"clave": clave}), 201

    @app.get("/api/docente/actividades")
    def listar_actividades():
        docente = docente_actual()
        filas = conexion().execute(
            "SELECT * FROM actividades WHERE docente_id = ? ORDER BY CASE fecha WHEN '' THEN 1 ELSE 0 END, fecha, id", (docente,)
        ).fetchall()
        return jsonify({"actividades": [actividad_publica(f) for f in filas]})

    @app.post("/api/docente/actividades")
    def crear_actividad():
        docente = docente_actual()
        a = validar_actividad(cuerpo_json())
        db = conexion()
        if db.execute("SELECT COUNT(*) FROM actividades WHERE docente_id = ?", (docente,)).fetchone()[0] >= MAX_ACTIVIDADES:
            return error("Llegaste al máximo de actividades. Borra alguna antes de crear otra.", 409)
        cur = db.execute(
            "INSERT INTO actividades (docente_id, titulo, modo, grupo, fecha, estado, config, actualizada) VALUES (?,?,?,?,?,?,?,?)",
            (docente, a["titulo"], a["modo"], a["grupo"], a["fecha"], a["estado"], json.dumps(a["config"], ensure_ascii=False), date.today().isoformat()),
        )
        db.commit()
        return jsonify(actividad_publica(buscar_actividad(cur.lastrowid, docente))), 201

    @app.put("/api/docente/actividades/<int:ident>")
    def editar_actividad(ident):
        docente = docente_actual()
        buscar_actividad(ident, docente)
        a = validar_actividad(cuerpo_json())
        db = conexion()
        db.execute(
            "UPDATE actividades SET titulo=?, modo=?, grupo=?, fecha=?, estado=?, config=?, actualizada=? WHERE id=?",
            (a["titulo"], a["modo"], a["grupo"], a["fecha"], a["estado"], json.dumps(a["config"], ensure_ascii=False), date.today().isoformat(), ident),
        )
        db.commit()
        return jsonify(actividad_publica(buscar_actividad(ident, docente)))

    @app.delete("/api/docente/actividades/<int:ident>")
    def borrar_actividad(ident):
        docente = docente_actual()
        buscar_actividad(ident, docente)
        db = conexion()
        db.execute("DELETE FROM actividades WHERE id = ?", (ident,))
        db.commit()
        return jsonify({"borrada": True})

    @app.post("/api/docente/actividades/<int:ident>/lanzar")
    def lanzar_actividad(ident):
        docente = docente_actual()
        a = actividad_publica(buscar_actividad(ident, docente))
        return jsonify(gestor.crear(a["modo"], a["opciones"], docente_id=docente, actividad=a)), 201

    @app.get("/api/docente/estadisticas")
    def estadisticas_docente():
        docente = docente_actual()
        filas = conexion().execute("SELECT * FROM partidas WHERE docente_id = ? ORDER BY id DESC", (docente,)).fetchall()
        temas, preguntas, modos = {}, {}, {}
        for f in filas:
            det = json.loads(f["detalle"])
            m = modos.setdefault(f["modo"], {"partidas": 0, "respuestas": 0, "aciertos": 0})
            m["partidas"] += 1
            m["respuestas"] += f["respuestas"]
            m["aciertos"] += f["aciertos"]
            for tema, (ac, tot) in det["temas"].items():
                t = temas.setdefault(tema, [0, 0])
                t[0] += ac
                t[1] += tot
            for ident, p in det["preguntas"].items():
                q = preguntas.setdefault(ident, {"texto": p["texto"], "tema": p["tema"], "aciertos": 0, "total": 0})
                q["aciertos"] += p["aciertos"]
                q["total"] += p["total"]
        pct = lambda a, t: round(a * 100 / t) if t else 0
        respuestas, aciertos = sum(f["respuestas"] for f in filas), sum(f["aciertos"] for f in filas)
        por_pregunta = sorted(
            ({"texto": q["texto"], "tema": q["tema"], "total": q["total"], "porcentaje": pct(q["aciertos"], q["total"])} for q in preguntas.values() if q["total"] >= MINIMO_DETALLE),
            key=lambda q: q["porcentaje"],
        )
        return jsonify({
            "partidas": len(filas),
            "participaciones": sum(f["jugadores"] for f in filas),
            "respuestas": respuestas,
            "porcentaje": pct(aciertos, respuestas),
            "minimo": MINIMO_DETALLE,
            "porModo": {k: dict(v, porcentaje=pct(v["aciertos"], v["respuestas"])) for k, v in modos.items()},
            "porTema": sorted(
                ({"tema": k, "total": v[1], "porcentaje": pct(v[0], v[1])} for k, v in temas.items() if v[1] >= MINIMO_DETALLE),
                key=lambda t: t["porcentaje"]),
            "porPregunta": por_pregunta[:15],
            "recientes": [{"fecha": f["fecha"], "titulo": f["titulo"], "modo": f["modo"], "jugadores": f["jugadores"], "porcentaje": pct(f["aciertos"], f["respuestas"])} for f in filas[:15]],
        })

    @app.errorhandler(404)
    def no_encontrado(_e):
        if request.path.startswith("/api/"):
            return error("Ruta no encontrada.", 404)
        return send_from_directory(app.static_folder, "index.html"), 404

    @app.errorhandler(405)
    def metodo_no_permitido(_e):
        return error("Método no permitido.", 405)

    @app.errorhandler(413)
    def demasiado_grande(_e):
        return error("La petición es demasiado grande.", 413)

    @app.errorhandler(500)
    def error_interno(_e):
        return error("Error interno del servidor.", 500)

    return app


def ip_local():
    """IP de esta computadora en la red local. El socket UDP no envía nada: solo pregunta qué interfaz se usaría."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


app = crear_app()

if __name__ == "__main__":
    par = argparse.ArgumentParser(description="Servidor de PRIVACIDAD 360")
    par.add_argument("--lan", action="store_true", help="permitir que otros dispositivos de la misma red local se conecten")
    par.add_argument("--puerto", type=int, default=int(os.environ.get("PORT", 5360)))
    par.add_argument("--cert", help="certificado HTTPS (PEM)")
    par.add_argument("--clave", help="clave privada del certificado (PEM)")
    args = par.parse_args()
    app.config["P360_LAN"] = args.lan
    https = (args.cert, args.clave) if args.cert and args.clave else None
    if args.lan:
        print(f"\n  Otros dispositivos de esta red pueden entrar en: {'https' if https else 'http'}://{ip_local()}:{args.puerto}\n")
    # debug desactivado: nunca exponer el depurador de Flask. threaded=True atiende a varios jugadores a la vez.
    app.run(host="0.0.0.0" if args.lan else "127.0.0.1", port=args.puerto, debug=False, threaded=True, ssl_context=https)
