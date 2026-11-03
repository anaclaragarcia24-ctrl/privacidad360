"""Pruebas automáticas de la API de PRIVACIDAD 360 (unittest, incluido en Python).
Ejecutar desde 08_Aplicacion_Web:  python -m unittest discover -s tests -v
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import CATEGORIAS, MINIMO_PARA_MOSTRAR, crear_app  # noqa: E402


def resultado_valido(valor=60, demo=False):
    return {"total": valor, "categorias": {c: valor for c in CATEGORIAS}, "demo": demo}


class PruebasAPI(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app = crear_app({"BASE_DATOS": os.path.join(self.tmp.name, "prueba.db"), "TESTING": True})
        self.cliente = self.app.test_client()

    def tearDown(self):
        self.tmp.cleanup()

    def test_salud(self):
        r = self.cliente.get("/api/salud")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json(), {"estado": "ok"})

    def test_pagina_principal_y_cabeceras_de_seguridad(self):
        r = self.cliente.get("/")
        self.assertEqual(r.status_code, 200)
        self.assertIn(b"PRIVACIDAD", r.data)
        self.assertIn("default-src 'self'", r.headers["Content-Security-Policy"])
        self.assertEqual(r.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(r.headers["Referrer-Policy"], "no-referrer")

    def test_guardar_resultado_valido(self):
        r = self.cliente.post("/api/resultados", json=resultado_valido())
        self.assertEqual(r.status_code, 201)

    def test_rechaza_campos_extra_como_nombre(self):
        datos = resultado_valido()
        datos["nombre"] = "Persona de prueba"
        r = self.cliente.post("/api/resultados", json=datos)
        self.assertEqual(r.status_code, 400)

    def test_rechaza_puntajes_fuera_de_rango_o_no_enteros(self):
        for malo in (101, -1, "50", 50.5, True, None):
            datos = resultado_valido()
            datos["categorias"]["acceso"] = malo
            self.assertEqual(self.cliente.post("/api/resultados", json=datos).status_code, 400, malo)

    def test_rechaza_categorias_incompletas(self):
        datos = resultado_valido()
        del datos["categorias"]["imagenes"]
        self.assertEqual(self.cliente.post("/api/resultados", json=datos).status_code, 400)

    def test_rechaza_cuerpo_que_no_es_json(self):
        r = self.cliente.post("/api/resultados", data="hola", content_type="text/plain")
        self.assertEqual(r.status_code, 400)

    def test_rechaza_peticiones_demasiado_grandes(self):
        r = self.cliente.post("/api/resultados", data="x" * 5000, content_type="application/json")
        self.assertEqual(r.status_code, 413)

    def test_estadisticas_ocultas_con_pocos_datos(self):
        for _ in range(MINIMO_PARA_MOSTRAR - 1):
            self.cliente.post("/api/resultados", json=resultado_valido())
        e = self.cliente.get("/api/estadisticas?modo=real").get_json()
        self.assertEqual(e["participaciones"], MINIMO_PARA_MOSTRAR - 1)
        self.assertFalse(e["suficientes"])
        self.assertNotIn("categorias", e)

    def test_estadisticas_agregadas_con_datos_suficientes(self):
        for v in [40] * 5 + [80] * 5:
            self.cliente.post("/api/resultados", json=resultado_valido(v))
        e = self.cliente.get("/api/estadisticas?modo=real").get_json()
        self.assertTrue(e["suficientes"])
        self.assertEqual(e["promedio_total"], 60)
        self.assertEqual(e["categorias"]["acceso"], 60)
        self.assertEqual(e["niveles"], {"alto": 50, "medio": 0, "bajo": 50})

    def test_datos_demo_separados_de_datos_reales(self):
        self.cliente.post("/api/resultados", json=resultado_valido(demo=True))
        real = self.cliente.get("/api/estadisticas?modo=real").get_json()
        demo = self.cliente.get("/api/estadisticas?modo=demo").get_json()
        self.assertEqual(real["participaciones"], 0)
        self.assertGreaterEqual(demo["participaciones"], 42)
        self.assertTrue(demo["suficientes"])

    def test_modo_invalido(self):
        self.assertEqual(self.cliente.get("/api/estadisticas?modo=todo").status_code, 400)

    def test_limite_de_envios(self):
        codigos = [self.cliente.post("/api/resultados", json=resultado_valido()).status_code for _ in range(21)]
        self.assertEqual(codigos[-1], 429)

    def test_ruta_api_inexistente(self):
        r = self.cliente.get("/api/usuarios")
        self.assertEqual(r.status_code, 404)
        self.assertIn("error", r.get_json())


if __name__ == "__main__":
    unittest.main()
