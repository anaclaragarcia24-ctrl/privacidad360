# PRIVACIDAD 360

**Protege tu vida digital y sube de nivel.** Videojuego educativo para mejorar hábitos de privacidad digital y aprender a
actuar ante el bullying y el ciberbullying: se juega solo o en grupo, se instala como app y sus modos individuales funcionan sin internet. Prototipo escolar del **Reto 3** (caso: Escuela Preparatoria «Lázaro Cárdenas»).

Equipo: Ana Clara García Barrera · César de Jesús Bautista García · Azucena Vargas de la Cruz · Carlos Fernando Tencos Marcial
(José María Gonzáles Hermosillo · Construye Aplicaciones Web · Docente: Paul J.)

> PRIVACIDAD 360 nunca pide contraseñas reales, fotografías ni acceso a redes sociales.
> Todas las situaciones, casos, personajes y los datos del modo demostración son **ficticios**.
> En las salas nadie vota contra una persona real y no hay chat libre.

## Qué incluye

| Módulo | Qué hace | Dónde se guarda |
|---|---|---|
| Diagnóstico | 24 preguntas en 6 categorías, puntaje 0-100 ponderado y explicable | Navegador (`localStorage`) |
| Resultados y recomendaciones | Puntaje por categoría y recomendaciones ordenadas por prioridad | Navegador |
| Plan de 7 días | Una acción diaria basada en las 3 categorías más bajas | Navegador |
| Verificador de contraseñas | Evaluación educativa 100 % local, no guarda ni envía nada | No se guarda |
| Auditoría manual | Lista de revisión de WhatsApp, Instagram, TikTok, Facebook, correo y teléfono | Navegador |
| Simulador | 12 situaciones ficticias por turnos, con retroalimentación y estrellas | Navegador |
| Academia | 6 módulos con lección y cuestionario | Navegador |
| Evaluación antes / después | Dos formas equivalentes de 10 preguntas para medir el aprendizaje | Navegador |
| Guía de emergencia | Robo de cuenta, suplantación, fotos difundidas sin permiso, acoso | — |
| Recursos | Fuentes oficiales verificadas | — |
| Mi progreso | Compara primer vs. último diagnóstico y evaluación antes vs. después | Navegador |
| Estadísticas agregadas | Promedios anónimos; se ocultan con menos de 10 resultados | Servidor (SQLite) |
| Modo demostración | Perfil y estadísticas ficticias, separados de los datos reales | Navegador / SQLite (`demo = 1`) |
| Gamificación | XP calculada desde lo realizado, 5 niveles, 20 insignias, mapa de 8 misiones, confeti | Navegador |
| **Modo aventura** | 5 mundos con escudo (vida), cronómetro, combos, consecuencias, suspenso, caja misteriosa, cofres, racha de días y jefe final con alarma. Minijuegos: forjar contraseña, ¿engaño o seguro?, tapar datos de una publicación, ¿ayuda o empeora? (testigos de acoso), ruta de denuncia segura | Navegador |
| Música y sonido | Música de fondo y efectos generados por el navegador (sin archivos); botones 🎵 y 🔊 que recuerdan la elección | Navegador |
| Modo claro / oscuro | Botón 🌙/☀️; recuerda la elección | Navegador |
| Idiomas | Español, inglés, francés y portugués en la interfaz y todos los juegos; las secciones informativas siguen en español y lo avisan | Navegador |
| **Arena Relámpago** | Salas con código, tiempo límite, puntos por acierto y rapidez, racha, equipos, ranking y podio | Memoria del servidor; solo totales en SQLite |
| **Detectives del Mirador** | Deducción social con 6 casos ficticios (bullying, ciberbullying, exclusión, discriminación): pistas repartidas, una máscara secreta mezcla rumores, se vota qué pasó y cómo actuar. También en solitario | Memoria del servidor / Navegador |
| **Colegio Mirador** | Escuela virtual para caminar, ayudar a 8 personajes, recoger monedas y entrar a otros modos | Navegador |
| **Escape Digital** | 3 salas de escape con retos que dan dígitos para abrir una cerradura | Navegador |
| **Cortafuegos** | Arcade de seguridad digital: bloquear mensajes peligrosos | Navegador |
| **Relevo por equipos** | Equipos por turnos en un solo dispositivo, con robo de preguntas | Navegador |
| **Tienda y avatar** | 42 artículos con monedas del juego; nunca dinero real | Navegador |
| **Modo docente** | Crear partidas con preguntas propias, organizar actividades y ver estadísticas sin datos por estudiante. Clave generada al azar | SQLite (solo el hash de la clave) |
| **App instalable** | PWA con ícono propio y modos individuales sin internet | Caché del navegador |

No hay **inicio de sesión de estudiantes**: la plataforma no necesita identificar a nadie y así se evita guardar
credenciales (ver `14_Documentacion_Tecnica.docx`).

## Requisitos

- Python 3.10 o superior (probado con Python 3.13.2).
- Un navegador actual (Chrome, Edge o Firefox).
- Node.js 18+ solo si quieres ejecutar las pruebas de la lógica (probado con Node 24.16).

## Instalación y ejecución

```bash
cd 08_Aplicacion_Web
python -m venv .venv
.venv\Scripts\activate          # En macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Abre <http://127.0.0.1:5360> en el navegador. Para usar otro puerto: `python app.py --puerto 8000`.

### Jugar en grupo en la misma red (no necesita internet)

```bash
python app.py --lan
```

La consola muestra una dirección como `http://192.168.1.69:5360`. Windows puede preguntar si Python puede usar la red:
hay que permitirlo en redes privadas. Quien crea la sala ve la dirección y el código en pantalla; los demás, en el mismo Wi-Fi,
abren esa dirección y escriben el código. Algunas redes escolares bloquean la conexión entre dispositivos: pruébenlo antes.

### Instalar la app

| Dónde | Qué pasa |
|---|---|
| Computadora, en `http://127.0.0.1:5360` (Chrome o Edge) | Sección **Instalar** → botón **Instalar PRIVACIDAD 360** |
| Teléfono o tableta por `http://192.168…` | **El navegador no lo permite** porque exige HTTPS. La app lo explica; sí se puede jugar en salas |
| Teléfono o tableta con la app publicada con HTTPS | Android: botón **Instalar**. iPhone/iPad: Safari → Compartir → «Agregar a pantalla de inicio» |

### Qué necesita servicios externos

| Función | Qué hace falta |
|---|---|
| Instalar en teléfonos | Publicar con HTTPS. Un certificado autofirmado no basta: el service worker lo rechaza, salvo que se instale una autoridad en cada dispositivo (por ejemplo, `mkcert`, y `--cert` y `--clave`) |
| Jugar entre lugares distintos | Un hospedaje con HTTPS que ejecute Python, con un solo proceso porque las salas viven en memoria: `gunicorn -w 1 --threads 8 app:app`. **No está contratado ni implementado** |

La base de datos se crea sola en `instance/privacidad360.db`, con 42 resultados **ficticios**
marcados como demostración (`demo = 1`). Para empezar de cero, borra esa carpeta.

### Sin servidor

También puedes abrir `static/index.html` directamente: funcionan el diagnóstico, la academia y el modo aventura.
Para que abran los demás modos individuales, la app debe servirse por http(s), porque el navegador no deja leer sus
archivos de contenido desde un archivo local. En un hosting estático con HTTPS funcionan e instalan los modos individuales.
**Salas, Docente y Estadísticas** necesitan el servidor de Flask.

## Cómo probar

```bash
python -m unittest discover -s tests -v      # 45 pruebas: API, salas, Detectives, modo docente y PWA (Python)
node --test tests/logica.test.js             # 38 pruebas: lógica, tienda, puntajes, idiomas y contenido (Node.js)
```

Pruebas con navegador real (requieren `puppeteer-core`). `servidor_pruebas.py` usa una base de datos temporal:

```bash
python ../_herramientas/servidor_pruebas.py --lan
node ../_herramientas/e2e_capturas.js            # 60 comprobaciones de la versión anterior (borra y regenera las capturas)
node ../_herramientas/e2e_modos.js en-linea      # 85: varios dispositivos por red local, docente, idiomas, móvil y carga
# apagar el servidor y luego:
node ../_herramientas/e2e_modos.js sin-red       # 18: la app con el servidor apagado de verdad
```

`P360_LAN_URL` indica la dirección de red si no es `http://192.168.1.69:5360`. Los resultados quedan en `../evidencias/`.

**Lo que las pruebas no cubren:** teléfonos reales, iPhone/iPad, pulsar el botón final de instalación y cómo suena la música.

### Cómo probarlo a mano (15 minutos)

1. `python app.py --lan`, abre <http://127.0.0.1:5360> y pulsa **Ver modo demostración** (300 monedas ficticias).
2. **Salas:** crea una Arena. En una ventana de incógnito o en un teléfono, abre la dirección y escribe el código. Empieza y juega.
3. **Detectives en sala:** repite con 3 ventanas o teléfonos. Publica pistas, vota y actúa.
4. **Modos:** prueba Detectives en solitario, Colegio, Escape, Cortafuegos, Relevo y Tienda.
5. **Docente:** genera una clave, crea una actividad con tus preguntas, abre la sala, juega y mira Estadísticas.
6. **Idiomas:** cambia a EN, FR y PT.
7. **Instalar:** abre la sección, pulsa el botón y abre la app desde su ícono.
8. **Sin internet:** cierra el servidor (Ctrl+C) y abre la app instalada. Los modos individuales funcionan; Salas y Docente lo avisan.
9. **Salir de demostración** borra los datos ficticios.

## Estructura

```
08_Aplicacion_Web/
├── app.py               Servidor Flask: archivos, API, modo docente, cabeceras de seguridad, --lan
├── salas.py             Motor de salas multijugador (tiempos, puntos, papeles secretos)
├── requirements.txt
├── static/
│   ├── index.html       Página única (SPA) con navegación por #rutas
│   ├── sw.js            Service worker: guarda la app para usarla sin internet
│   ├── manifest.webmanifest  Datos de instalación
│   ├── css/             estilos.css (paleta, responsivo) y modos.css (modos de juego)
│   ├── datos/           Contenido en 4 idiomas: arena, casos, escape, cortafuegos, colegio, tienda
│   ├── fonts/           Fredoka y Nunito (woff2, licencia SIL OFL)
│   ├── img/             Logotipo, íconos de la app y capturas del manifiesto
│   └── js/
│       ├── i18n.js      Motor de idiomas e inglés; idiomas/ tiene francés, portugués y los textos de los modos
│       ├── datos.js     Contenido: preguntas, escenarios, módulos, guías, recursos y mundos del juego
│       ├── juego.js     Modo aventura: motor, minijuegos, efectos y sonidos
│       ├── logica.js    Cálculos puros: diagnóstico, plan, contraseñas, comparaciones, XP e insignias
│       ├── nucleo.js    Piezas compartidas de los modos
│       ├── salas.js, modos.js, escape.js, escuela.js, docente.js   Los modos de juego
│       └── app.js       Interfaz, rutas y almacenamiento local
└── tests/
    ├── test_api.py      Pruebas de la API (unittest)
    ├── test_salas.py    Pruebas de salas y modo docente, con reloj controlado
    └── logica.test.js   Pruebas de la lógica (node:test)
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Comprueba que el servidor responde |
| POST | `/api/resultados` | Recibe `{ total, categorias: {6 puntajes 0-100}, demo }`. Rechaza cualquier otro campo |
| GET | `/api/estadisticas?modo=real\|demo` | Promedios agregados. Con menos de 10 resultados solo devuelve el conteo |
| GET | `/api/red` | Dirección para invitar a otros dispositivos |
| POST | `/api/salas` | Crea una sala y devuelve código y token |
| POST | `/api/salas/<código>/unirse` | Entra con apodo y avatar del catálogo |
| GET | `/api/salas/<código>?v=n` | Vista propia del jugador (cabecera `X-P360-Token`) |
| POST | `/api/salas/<código>/accion` | iniciar, siguiente, expulsar, cerrar, salir, responder, publicar, frase, votar, actuar |
| POST | `/api/docente/clave` | Genera una clave de docente |
| GET, POST, PUT, DELETE | `/api/docente/actividades[/<id>]` | Organiza actividades (cabecera `X-P360-Docente`) |
| POST | `/api/docente/actividades/<id>/lanzar` | Abre una sala con esa actividad |
| GET | `/api/docente/estadisticas` | Datos agregados del grupo |

## Privacidad y seguridad (resumen)

- Minimización: de los resultados, el servidor solo recibe 7 números y una bandera de demo; no guarda IP ni hora.
- Salas: los apodos viven en memoria y no se escriben en disco; de cada partida solo quedan totales.
- Sin chat libre; se vota por personajes ficticios y máscaras que cambian en cada caso; se rechazan correos, teléfonos e insultos como apodo.
- El servidor decide tiempos, puntos y papeles, y la respuesta correcta no viaja antes de cerrar la pregunta.
- Docente: clave aleatoria (solo se guarda su hash) y detalle solo con 3 respuestas o más.
- Consentimiento explícito antes de enviar cualquier dato.
- Umbral mínimo de 10 resultados para mostrar estadísticas.
- Validación estricta de entradas, límite de tamaño (2 KB) y de envíos (20 por hora por cliente, en memoria).
- Cabeceras: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy.
- Depurador de Flask desactivado; consultas SQL con parámetros.

## Créditos

Proyecto escolar desarrollado con apoyo de herramientas de inteligencia artificial. El uso de IA está
documentado en `05_Bitacora_de_Prompts` (.pdf, .md, .docx y .xlsx).
