"""Pruebas de salas multijugador y modo docente, con un reloj controlado para no esperar tiempos reales.
Ejecutar desde 08_Aplicacion_Web:  python -m unittest discover -s tests -v
"""
import json
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import crear_app  # noqa: E402
from salas import ErrorSala, puntos_arena, validar_apodo  # noqa: E402


class Reloj:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.reloj = Reloj()
        self.bd = os.path.join(self.tmp.name, "prueba.db")
        self.app = crear_app({"BASE_DATOS": self.bd, "TESTING": True, "RELOJ": self.reloj})
        self.c = self.app.test_client()
        self.gestor = self.app.extensions["p360_salas"]

    def tearDown(self):
        self.tmp.cleanup()

    def crear(self, modo="arena", **opciones):
        r = self.c.post("/api/salas", json={"modo": modo, "opciones": opciones})
        self.assertEqual(r.status_code, 201, r.get_json())
        return r.get_json()

    def unir(self, codigo, apodo):
        r = self.c.post(f"/api/salas/{codigo}/unirse", json={"apodo": apodo, "avatar": {"base": "🐼"}})
        self.assertEqual(r.status_code, 201, r.get_json())
        return r.get_json()["token"]

    def ver(self, codigo, token):
        r = self.c.get(f"/api/salas/{codigo}", headers={"X-P360-Token": token})
        self.assertEqual(r.status_code, 200, r.get_json())
        return r.get_json()

    def accion(self, codigo, token, tipo, esperado=200, **datos):
        r = self.c.post(f"/api/salas/{codigo}/accion", json=dict(datos, tipo=tipo), headers={"X-P360-Token": token})
        self.assertEqual(r.status_code, esperado, r.get_json())
        return r.get_json()

    def material(self, codigo):
        return self.gestor.salas[codigo].ops["material"]


class PruebasArena(Base):
    def test_partida_completa_con_ranking(self):
        s = self.crear(rondas=3, segundos=20, automatico=False)
        cod, host = s["codigo"], s["token"]
        ana, beto = self.unir(cod, "Zorro Azul"), self.unir(cod, "Rana Lila")
        self.accion(cod, host, "iniciar")
        for ronda, q in enumerate(self.material(cod)):
            v = self.ver(cod, ana)
            self.assertEqual((v["fase"], v["ronda"]), ("pregunta", ronda))
            self.assertNotIn("c", v["pregunta"], "la respuesta correcta no debe viajar antes de tiempo")
            self.assertNotIn("resultado", v)
            self.reloj.t += 5
            self.accion(cod, ana, "responder", opcion=q["c"])
            self.accion(cod, beto, "responder", opcion=(q["c"] + 1) % 4)
            v = self.ver(cod, ana)
            self.assertEqual(v["fase"], "resultado")   # todos respondieron: no espera al reloj
            self.assertEqual(v["resultado"]["c"], q["c"])
            self.assertEqual(sum(v["resultado"]["dist"]), 2)
            self.accion(cod, host, "siguiente")
        v = self.ver(cod, host)
        self.assertEqual(v["fase"], "final")
        self.assertEqual([r["apodo"] for r in v["ranking"]], ["Zorro Azul", "Rana Lila"])
        self.assertEqual(v["ranking"][1]["puntos"], 0)
        self.assertEqual(v["ranking"][0]["aciertos"], 3)

    def test_tiempo_limite_cierra_la_pregunta_y_no_acepta_respuestas(self):
        s = self.crear(rondas=3, segundos=10, automatico=False)
        cod = s["codigo"]
        j = self.unir(cod, "Búho")
        self.unir(cod, "Panda")
        self.accion(cod, s["token"], "iniciar")
        self.reloj.t += 11
        self.accion(cod, j, "responder", 409, opcion=0)
        self.assertEqual(self.ver(cod, j)["fase"], "resultado")
        self.assertFalse(self.ver(cod, j)["yo"]["ultimo"]["respondio"])

    def test_avance_automatico_llega_al_final_sin_anfitrion(self):
        s = self.crear(rondas=3, segundos=10)
        cod = s["codigo"]
        j = self.unir(cod, "Búho")
        self.accion(cod, s["token"], "iniciar")
        for _ in range(3):
            self.reloj.t += 10.5
            self.ver(cod, j)
            self.reloj.t += 9.5
            self.ver(cod, j)
        self.assertEqual(self.ver(cod, j)["fase"], "final")

    def test_rapidez_y_racha_las_mide_el_servidor(self):
        self.assertEqual(puntos_arena(20, 20, 0), 1000)
        self.assertEqual(puntos_arena(0, 20, 0), 500)
        self.assertEqual(puntos_arena(10, 20, 3), 870)
        self.assertEqual(puntos_arena(10, 20, 99), 950)
        s = self.crear(rondas=3, segundos=20, automatico=False)
        cod = s["codigo"]
        j = self.unir(cod, "Búho")
        self.accion(cod, s["token"], "iniciar")
        self.reloj.t += 10
        # Un campo extra de tiempo enviado por el cliente se ignora.
        self.accion(cod, j, "responder", opcion=self.material(cod)[0]["c"], restante=20)
        self.assertEqual(self.ver(cod, j)["yo"]["puntos"], 750)

    def test_no_se_puede_responder_dos_veces(self):
        s = self.crear(rondas=3, automatico=False)
        cod = s["codigo"]
        j = self.unir(cod, "Búho")
        self.unir(cod, "Panda")
        self.accion(cod, s["token"], "iniciar")
        self.accion(cod, j, "responder", opcion=0)
        self.accion(cod, j, "responder", 409, opcion=1)

    def test_equipos_se_reparten_y_puntuan_por_promedio(self):
        s = self.crear(rondas=3, equipos=2, automatico=False)
        cod = s["codigo"]
        a, b, c = self.unir(cod, "Uno"), self.unir(cod, "Dos"), self.unir(cod, "Tres")
        v = self.ver(cod, a)
        self.assertEqual(sorted(e["n"] for e in v["equipos"]), [1, 2])
        self.accion(cod, s["token"], "iniciar")
        q = self.material(cod)[0]
        for tok in (a, b, c):
            self.accion(cod, tok, "responder", opcion=q["c"])
        v = self.ver(cod, a)
        puntos = {e["id"]: e["puntos"] for e in v["equipos"]}
        self.assertEqual(set(puntos), {"coral", "menta"})
        self.assertEqual(puntos["coral"], round((v["ranking"][0]["puntos"] + v["ranking"][2]["puntos"]) / 2))

    def test_opciones_invalidas(self):
        for mal in ({"segundos": 5}, {"rondas": 99}, {"equipos": 1}, {"segundos": True}, {"temas": ["inexistente"]}):
            r = self.c.post("/api/salas", json={"modo": "arena", "opciones": mal})
            self.assertEqual(r.status_code, 400, mal)
        self.assertEqual(self.c.post("/api/salas", json={"modo": "x"}).status_code, 400)

    def test_temas_filtran_el_banco(self):
        s = self.crear(rondas=3, temas=["phishing"])
        self.assertTrue(all(q["tema"] == "phishing" for q in self.material(s["codigo"])))


class PruebasEntrada(Base):
    def test_apodos_protegen_datos_personales(self):
        for bien in ("Zorro Azul", "Búho_7", "Lúa", "ana-b"):
            validar_apodo(bien)
        for mal in ("a", "x" * 17, "yo@correo.com", "5512345678", "http://sitio", "<script>", "idiota", "FUCK", 7, None):
            with self.assertRaises(ErrorSala, msg=mal):
                validar_apodo(mal)

    def test_codigo_inexistente_apodo_repetido_y_sala_llena(self):
        self.assertEqual(self.c.post("/api/salas/ZZZZZ/unirse", json={"apodo": "Búho"}).status_code, 404)
        s = self.crear()
        self.unir(s["codigo"], "Búho")
        self.assertEqual(self.c.post(f"/api/salas/{s['codigo']}/unirse", json={"apodo": "buho"}).status_code, 409)

    def test_el_codigo_no_distingue_mayusculas(self):
        s = self.crear()
        self.unir(s["codigo"].lower(), "Búho")

    def test_sin_token_no_se_ve_la_sala_ni_se_actua(self):
        s = self.crear()
        cod = s["codigo"]
        self.assertEqual(self.c.get(f"/api/salas/{cod}").status_code, 403)
        self.assertEqual(self.c.get(f"/api/salas/{cod}", headers={"X-P360-Token": "falso"}).status_code, 403)
        j = self.unir(cod, "Búho")
        self.accion(cod, j, "iniciar", 403)
        self.accion(cod, "falso", "responder", 403, opcion=0)

    def test_avatar_solo_del_catalogo(self):
        s = self.crear()
        r = self.c.post(f"/api/salas/{s['codigo']}/unirse", json={"apodo": "Búho", "avatar": {"base": "<img src=x>", "sombrero": "👑", "raro": "x"}})
        v = self.ver(s["codigo"], r.get_json()["token"])
        self.assertEqual(v["yo"]["avatar"], {"base": "🦊", "sombrero": "👑"})

    def test_expulsar_impide_volver_con_ese_apodo(self):
        s = self.crear()
        cod = s["codigo"]
        j = self.unir(cod, "Molesto")
        ident = self.ver(cod, j)["yo"]["id"]
        self.accion(cod, s["token"], "expulsar", id=ident)
        self.assertEqual(self.c.get(f"/api/salas/{cod}", headers={"X-P360-Token": j}).status_code, 403)
        self.assertEqual(self.c.post(f"/api/salas/{cod}/unirse", json={"apodo": "molesto"}).status_code, 403)

    def test_cuerpos_grandes_rechazados_en_salas(self):
        r = self.c.post("/api/salas", data="x" * 5000, content_type="application/json")
        self.assertEqual(r.status_code, 413)

    def test_salas_inactivas_se_borran(self):
        s = self.crear()
        self.reloj.t += 46 * 60
        self.crear()
        self.assertNotIn(s["codigo"], self.gestor.salas)

    def test_sin_cambios_responde_liviano(self):
        s = self.crear()
        j = self.unir(s["codigo"], "Búho")
        v = self.ver(s["codigo"], j)["version"]
        r = self.c.get(f"/api/salas/{s['codigo']}?v={v}", headers={"X-P360-Token": j}).get_json()
        self.assertTrue(r["sinCambios"])
        self.assertNotIn("ranking", r)


class PruebasDetectives(Base):
    def preparar(self, n=4, **opciones):
        s = self.crear("detectives", rondas=1, automatico=False, **opciones)
        cod = s["codigo"]
        tokens = [self.unir(cod, f"Agente {i}") for i in range(n)]
        return cod, s["token"], tokens

    def test_minimo_de_jugadores(self):
        s = self.crear("detectives", rondas=1)
        self.unir(s["codigo"], "Uno")
        self.accion(s["codigo"], s["token"], "iniciar", 409)

    def test_privacidad_nadie_puede_ver_el_papel_ni_la_mascara_de_otro(self):
        cod, host, tokens = self.preparar(4)
        self.accion(cod, host, "iniciar")
        vistas = [self.ver(cod, t) for t in tokens]
        self.assertEqual(sum(v["yo"]["eco"] for v in vistas), 1)
        for v in vistas:
            crudo = json.dumps(v["ranking"], ensure_ascii=False)
            self.assertNotIn("mascara", crudo)
            self.assertNotIn("eco", crudo)
            self.assertNotIn("culpable", json.dumps(v["caso"], ensure_ascii=False))
            self.assertNotIn("falsa", json.dumps(v["yo"]["pistas"], ensure_ascii=False))
            self.assertNotIn("resultado", v)
        # El anfitrión tampoco ve papeles.
        self.assertNotIn("yo", self.ver(cod, host))
        self.assertEqual(len({v["yo"]["mascara"] for v in vistas}), 4)

    def test_caso_completo_puntos_y_revelacion_solo_de_mascaras(self):
        cod, host, tokens = self.preparar(4)
        self.accion(cod, host, "iniciar")
        caso = self.material(cod)[0]
        vistas = {t: self.ver(cod, t) for t in tokens}
        eco_tok = next(t for t in tokens if vistas[t]["yo"]["eco"])
        honestos = [t for t in tokens if t != eco_tok]
        mascara_eco = vistas[eco_tok]["yo"]["mascara"]
        # Pistas: el Eco tiene falsas; los demás, verdaderas
        falsas = {p["id"] for p in self.gestor.salas[cod].pistas if p["falsa"]}
        self.assertEqual(len(falsas & {p["id"] for p in vistas[eco_tok]["yo"]["pistas"]}), 2)
        for t in honestos:
            self.assertFalse(falsas & {p["id"] for p in vistas[t]["yo"]["pistas"]})
        # Publicar y frases
        p = vistas[honestos[0]]["yo"]["pistas"][0]["id"]
        self.accion(cod, honestos[0], "publicar", pista=p)
        self.accion(cod, honestos[1], "publicar", 403, pista=vistas[eco_tok]["yo"]["pistas"][0]["id"])
        self.accion(cod, honestos[0], "frase", frase="sospecho", objetivo=caso["culpable"])
        self.accion(cod, honestos[0], "frase", 400, frase="texto libre con insultos")
        self.accion(cod, honestos[0], "frase", 400, frase="sospecho", objetivo="Agente 2")
        v = self.ver(cod, honestos[1])
        self.assertEqual(len(v["caso"]["tablero"]), 1)
        self.assertEqual(v["caso"]["tablero"][0]["mascara"], vistas[honestos[0]]["yo"]["mascara"])
        self.assertEqual(v["caso"]["feed"][0]["objetivo"], caso["culpable"])
        # Votar
        self.accion(cod, tokens[0], "votar", 409, sospechoso=caso["culpable"], situacion=caso["tipo"])
        self.accion(cod, host, "siguiente")
        self.accion(cod, honestos[0], "votar", 400, sospechoso="persona real", situacion=caso["tipo"])
        for t in honestos:
            self.accion(cod, t, "votar", sospechoso=caso["culpable"], situacion=caso["tipo"], mascara=mascara_eco)
        inocente = next(x for x in caso["sospechosos"] if x != caso["culpable"])
        self.accion(cod, eco_tok, "votar", sospechoso=inocente, situacion=caso["tipo"])
        self.assertEqual(self.ver(cod, tokens[0])["fase"], "actuar")
        for t in tokens:
            self.accion(cod, t, "actuar", opcion=caso["accion"])
        v = self.ver(cod, honestos[0])
        self.assertEqual(v["fase"], "revelar")
        self.assertEqual(v["resultado"]["culpable"], caso["culpable"])
        self.assertEqual(v["resultado"]["ecos"], [mascara_eco])
        self.assertTrue(v["resultado"]["ecoDescubierto"])
        self.assertEqual(v["yo"]["ultimo"]["puntos"], 650)
        # El Eco falló culpable, grupo acertó y fue descubierto: solo gana tipo y acción.
        self.assertEqual(self.ver(cod, eco_tok)["yo"]["ultimo"]["puntos"], 350)
        # La revelación no relaciona máscara con apodo.
        crudo = json.dumps(v["resultado"], ensure_ascii=False)
        for j in v["ranking"]:
            self.assertNotIn(j["apodo"], crudo)
        self.accion(cod, host, "siguiente")
        self.assertEqual(self.ver(cod, host)["fase"], "final")

    def test_no_se_entra_con_caso_empezado(self):
        cod, host, _ = self.preparar(3)
        self.accion(cod, host, "iniciar")
        self.assertEqual(self.c.post(f"/api/salas/{cod}/unirse", json={"apodo": "Tarde"}).status_code, 409)

    def test_las_pistas_de_los_casos_cubren_a_todos_los_sospechosos(self):
        casos = self.gestor.contenido["casos"]
        tipos = {c["tipo"] for c in casos}
        self.assertEqual(tipos, {"bullying", "ciberbullying", "exclusion", "discriminacion"})
        for c in casos:
            for l in ("es", "en", "fr", "pt"):
                self.assertEqual(len(c[l]["acciones"]), 4)
                self.assertEqual(len(c[l]["pistas"]), len(c["es"]["pistas"]))


class PruebasDocente(Base):
    def setUp(self):
        super().setUp()
        self.clave = self.c.post("/api/docente/clave").get_json()["clave"]
        self.h = {"X-P360-Docente": self.clave}

    def actividad(self, **extra):
        base = {"titulo": "Repaso de phishing", "modo": "arena", "grupo": "2.º B", "fecha": "2026-11-20",
                "opciones": {"segundos": 15, "automatico": False},
                "preguntas": [{"p": "¿Quién pide tu contraseña?", "o": ["Nadie legítimo", "El banco"], "c": 0, "e": "Nadie debe pedirla."},
                              {"p": "¿Es seguro este enlace?", "o": ["Sí", "No", "Depende"], "c": 1}]}
        base.update(extra)
        return base

    def test_clave_requerida_y_solo_se_guarda_el_hash(self):
        self.assertEqual(self.c.get("/api/docente/actividades").status_code, 401)
        self.assertEqual(self.c.get("/api/docente/actividades", headers={"X-P360-Docente": "P360-FALSA"}).status_code, 401)
        self.assertEqual(self.c.get("/api/docente/actividades", headers=self.h).status_code, 200)
        db = sqlite3.connect(self.bd)
        guardado = db.execute("SELECT clave_hash FROM docentes").fetchone()[0]
        db.close()
        self.assertNotIn(self.clave, guardado)

    def test_crear_editar_listar_y_borrar(self):
        r = self.c.post("/api/docente/actividades", json=self.actividad(), headers=self.h)
        self.assertEqual(r.status_code, 201, r.get_json())
        ident = r.get_json()["id"]
        r = self.c.put(f"/api/docente/actividades/{ident}", json=self.actividad(titulo="Nuevo", estado="borrador"), headers=self.h)
        self.assertEqual(r.get_json()["titulo"], "Nuevo")
        lista = self.c.get("/api/docente/actividades", headers=self.h).get_json()["actividades"]
        self.assertEqual([a["estado"] for a in lista], ["borrador"])
        self.assertEqual(self.c.delete(f"/api/docente/actividades/{ident}", headers=self.h).status_code, 200)
        self.assertEqual(self.c.get("/api/docente/actividades", headers=self.h).get_json()["actividades"], [])

    def test_validacion_de_actividad(self):
        malas = [
            self.actividad(titulo=""), self.actividad(modo="otro"), self.actividad(fecha="mañana"), self.actividad(estado="x"),
            self.actividad(preguntas=[{"p": "ok?", "o": ["uno"], "c": 0}]),
            self.actividad(preguntas=[{"p": "bien", "o": ["a", "b"], "c": 5}]),
            self.actividad(preguntas=[{"p": "", "o": ["a", "b"], "c": 0}]),
            self.actividad(opciones={"segundos": 2}),
            dict(self.actividad(), extra="campo"),
        ]
        for m in malas:
            self.assertEqual(self.c.post("/api/docente/actividades", json=m, headers=self.h).status_code, 400, m)

    def test_una_clave_no_ve_lo_de_otra(self):
        ident = self.c.post("/api/docente/actividades", json=self.actividad(), headers=self.h).get_json()["id"]
        otra = {"X-P360-Docente": self.c.post("/api/docente/clave").get_json()["clave"]}
        self.assertEqual(self.c.get("/api/docente/actividades", headers=otra).get_json()["actividades"], [])
        self.assertEqual(self.c.put(f"/api/docente/actividades/{ident}", json=self.actividad(), headers=otra).status_code, 404)
        self.assertEqual(self.c.delete(f"/api/docente/actividades/{ident}", headers=otra).status_code, 404)
        self.assertEqual(self.c.post(f"/api/docente/actividades/{ident}/lanzar", headers=otra).status_code, 404)

    def test_lanzar_jugar_y_ver_estadisticas_sin_apodos(self):
        ident = self.c.post("/api/docente/actividades", json=self.actividad(), headers=self.h).get_json()["id"]
        s = self.c.post(f"/api/docente/actividades/{ident}/lanzar", headers=self.h).get_json()
        cod, host = s["codigo"], s["token"]
        tokens = [self.unir(cod, n) for n in ("Apodo Secreto", "Rana Lila", "Búho Sol")]
        self.accion(cod, host, "iniciar")
        v = self.ver(cod, tokens[0])
        self.assertEqual(v["pregunta"]["textos"]["es"]["p"], "¿Quién pide tu contraseña?")
        self.assertEqual(v["titulo"], "Repaso de phishing")
        for t in tokens[:2]:
            self.accion(cod, t, "responder", opcion=0)
        self.accion(cod, tokens[2], "responder", opcion=1)
        self.accion(cod, host, "siguiente")
        for t in tokens:
            self.accion(cod, t, "responder", opcion=1)
        self.accion(cod, host, "siguiente")
        self.assertEqual(self.ver(cod, host)["fase"], "final")
        e = self.c.get("/api/docente/estadisticas", headers=self.h).get_json()
        self.assertEqual((e["partidas"], e["participaciones"], e["respuestas"], e["porcentaje"]), (1, 3, 6, 83))
        self.assertEqual(e["porPregunta"][0]["porcentaje"], 67)
        self.assertEqual(e["recientes"][0]["titulo"], "Repaso de phishing")
        self.assertEqual(self.c.get("/api/docente/actividades", headers=self.h).get_json()["actividades"][0]["estado"], "realizada")
        # Lo escrito en disco no contiene apodos.
        db = sqlite3.connect(self.bd)
        contenido = json.dumps([list(f) for f in db.execute("SELECT * FROM partidas").fetchall()], ensure_ascii=False)
        db.close()
        self.assertNotIn("Apodo Secreto", contenido)
        self.assertNotIn("Rana Lila", contenido)

    def test_no_se_muestra_detalle_con_muy_pocas_respuestas(self):
        ident = self.c.post("/api/docente/actividades", json=self.actividad(), headers=self.h).get_json()["id"]
        s = self.c.post(f"/api/docente/actividades/{ident}/lanzar", headers=self.h).get_json()
        cod = s["codigo"]
        t = self.unir(cod, "Solo")
        self.accion(cod, s["token"], "iniciar")
        self.accion(cod, t, "responder", opcion=0)
        self.accion(cod, s["token"], "siguiente")
        self.accion(cod, t, "responder", opcion=1)
        self.accion(cod, s["token"], "siguiente")
        e = self.c.get("/api/docente/estadisticas", headers=self.h).get_json()
        self.assertEqual(e["porPregunta"], [])

    def test_estadisticas_vacias_no_inventan_nada(self):
        e = self.c.get("/api/docente/estadisticas", headers=self.h).get_json()
        self.assertEqual((e["partidas"], e["respuestas"], e["porcentaje"], e["porTema"]), (0, 0, 0, []))


class PruebasPWA(Base):
    def test_manifest_y_service_worker(self):
        r = self.c.get("/manifest.webmanifest")
        self.assertEqual(r.status_code, 200)
        self.assertIn("application/manifest+json", r.content_type)
        self.assertEqual(r.headers["Cache-Control"], "no-cache")
        m = json.loads(r.data)
        self.assertEqual(m["display"], "standalone")
        tamanos = {i["sizes"] for i in m["icons"]}
        self.assertTrue({"192x192", "512x512"} <= tamanos)
        for i in m["icons"]:
            self.assertEqual(self.c.get("/" + i["src"]).status_code, 200, i["src"])
        r = self.c.get("/sw.js")
        self.assertEqual(r.status_code, 200)
        self.assertIn("javascript", r.content_type)
        self.assertEqual(r.headers["Cache-Control"], "no-cache")
        self.assertIn("worker-src 'self'", r.headers["Content-Security-Policy"])

    def test_red_informa_si_hay_lan(self):
        self.assertFalse(self.c.get("/api/red").get_json()["lan"])
        self.app.config["P360_LAN"] = True
        self.assertTrue(self.c.get("/api/red").get_json()["lan"])


if __name__ == "__main__":
    unittest.main()
