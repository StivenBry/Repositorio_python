# 🎙️ AI Voice Studio

Aplicación web para convertir un guion escrito en una **narración con voz natural
y expresiva**. Pega el texto, elige la voz y el estilo, ajusta el ritmo, escucha
el resultado y descárgalo en MP3 o WAV.

> **Funciona nada más instalarla, sin ninguna clave de API.** Incluye un motor de
> voz de demostración y un analizador de guiones propios que funcionan sin
> conexión. Cuando quieras una voz humana real, añades una clave en `.env` y la
> aplicación cambia de motor sin tocar una línea de código.

---

## Índice

1. [Qué hace](#qué-hace)
2. [Instalación en 3 pasos](#instalación-en-3-pasos)
3. [Qué APIs necesita y cuáles son de pago](#qué-apis-necesita-y-cuáles-son-de-pago)
4. [Configuración (.env)](#configuración-env)
5. [Cómo se usa](#cómo-se-usa)
6. [Marcadores de interpretación](#marcadores-de-interpretación)
7. [Arquitectura](#arquitectura)
8. [API HTTP](#api-http)
9. [Seguridad](#seguridad)
10. [Puesta en producción](#puesta-en-producción)
11. [Pruebas](#pruebas)
12. [Problemas frecuentes](#problemas-frecuentes)
13. [Preparado para el futuro](#preparado-para-el-futuro)

---

## Qué hace

| | |
|---|---|
| **Editor de guion** | Contador de palabras, caracteres, frases, párrafos, duración estimada y velocidad de lectura, actualizados mientras escribes. Respeta párrafos y saltos de línea. |
| **11 estilos de narración** | Natural, Documental, Educativo, Noticias, Energético, Emocional, Misterioso, Dramático, Inspirador, Profesional y Conversacional. |
| **Interpretación inteligente** | Antes de generar el audio, la aplicación analiza el guion y detecta preguntas, exclamaciones, frases importantes, cambios de tema, inicio y final de escena, énfasis, pausas y cambios emocionales. |
| **Marcadores** | `[PAUSA]`, `[ÉNFASIS]`, `[EMOCIÓN: FELIZ]`, `[TONO: MISTERIOSO]`… se convierten en instrucciones para el motor de voz y **nunca se pronuncian**. |
| **Controles de voz** | Velocidad, tono, volumen, intensidad y pausas, con deslizadores y valores visibles. |
| **Optimizador con IA** | Propone un guion mejorado y muestra **las dos versiones lado a lado**. Tu original nunca se sustituye sin que lo aceptes. |
| **Reproductor** | Play/pausa, barra de progreso, duración, volumen, reinicio y descarga. |
| **Exportación** | MP3 y WAV. El nombre del archivo se genera a partir del proyecto: `documental_historia_de_colombia.mp3`. |
| **Proyectos** | Guarda nombre, guion, voz, estilo, ajustes, fechas y audio generado. |
| **Modo Shorts / Reels / TikTok** | Analiza gancho inicial, longitud de frases, ritmo, pausas, énfasis y duración aproximada. |
| **Diseño** | Responsive (ordenador, tableta y móvil), modo oscuro y claro, tarjetas redondeadas y animaciones sutiles. |

### Interpretación inteligente, en la práctica

Con el guion:

```
Todo iba bien aquella mañana. Pero entonces ocurrió algo inesperado.
```

la aplicación detecta que la segunda frase abre un **giro narrativo**, así que
inserta un silencio justo **antes** de ella, baja un poco la velocidad y le da
más peso. Ese razonamiento se muestra en la interfaz, frase por frase, para que
entiendas por qué suena como suena.

---

## Instalación en 3 pasos

Necesitas [Node.js 20.11 o superior](https://nodejs.org/).

```bash
# 1. Entra en la carpeta del proyecto
cd ai-voice-studio

# 2. Instala las dependencias
npm install

# 3. Arranca
npm start
```

Verás este mensaje:

```
  AI Voice Studio esta funcionando.
  Abre esta direccion en tu navegador:  http://localhost:3000
  (para detenerlo, pulsa Ctrl + C en esta ventana)
```

**Ahora abre tú <http://localhost:3000> en el navegador.** La aplicación no lo
abre sola: `npm start` solo enciende el servidor y se queda funcionando en esa
ventana de la terminal.

Dos cosas que conviene saber:

- **La terminal se queda "colgada" a propósito.** Mientras el servidor funciona,
  no vuelve a aparecer el símbolo del sistema. Es lo normal. Para pararlo,
  `Ctrl` + `C`.
- **Si necesitas escribir más comandos**, abre una segunda ventana de terminal;
  no cierres la primera o el servidor se detendrá.

> Para desarrollo, `npm run dev` reinicia el servidor al guardar cambios.
> Si el puerto 3000 está ocupado, arráncalo en otro: `PORT=3005 npm start`
> (en PowerShell: `$env:PORT=3005; npm start`).

### ¿Y sin claves de API?

Sí, funciona. Sin configurar nada:

- **Motor de voz `mock`**: un sintetizador escrito en JavaScript que genera un
  audio *hablado* respetando con exactitud el ritmo, las pausas, el tono y el
  énfasis del plan de interpretación. **No es una voz humana**, y la aplicación
  lo advierte de forma visible. Sirve para probar el recorrido completo y para
  validar el montaje de un vídeo antes de gastar créditos de pago.
- **Motor de IA `heuristic`**: analizador y optimizador de guiones propios,
  basados en reglas lingüísticas para castellano e inglés. Sin conexión, sin
  coste y sin límite de uso.

---

## Qué APIs necesita y cuáles son de pago

La aplicación **no depende de ninguna API concreta**. Escoge la que prefieras.

### Motores de voz (Text-to-Speech)

| Proveedor | `TTS_PROVIDER` | Coste | Qué controles aprovecha |
|---|---|---|---|
| **Demostración (incluido)** | `mock` | **Gratis**, sin conexión | Velocidad, tono, volumen, énfasis y pausas |
| **Google Cloud TTS** | `google` | **De pago**, con cuota gratuita mensual | SSML completo: velocidad, tono, volumen y pausas por frase |
| **Microsoft Azure Speech** | `azure` | **De pago**, con capa gratuita F0 | SSML completo + estilos expresivos por voz |
| **ElevenLabs** | `elevenlabs` | **De pago**, con plan gratuito limitado | Pausas y ajustes de expresividad (sin velocidad ni tono directos) |
| **OpenAI TTS** | `openai` | **De pago** | Velocidad global + indicaciones de interpretación en lenguaje natural |

**Recomendación**: si buscas el máximo control sobre la interpretación, usa
**Google Cloud** o **Azure** (admiten SSML y aplican el plan frase a frase). Si
buscas la voz más natural, **ElevenLabs** suele ser la mejor opción.

### Motores de IA (análisis y optimización del guion)

| Proveedor | `AI_PROVIDER` | Coste |
|---|---|---|
| **Heurístico (incluido)** | `heuristic` | **Gratis**, sin conexión |
| **Anthropic Claude** | `anthropic` | **De pago** |
| **OpenAI** | `openai` | **De pago** |
| **Google Gemini** | `google` | **De pago**, con capa gratuita |

El motor de IA es **opcional**: mejora la calidad del análisis y del optimizador,
pero la aplicación funciona igual sin él. Y si un proveedor externo falla o se
queda sin cuota, la aplicación **cae automáticamente al motor heurístico** y avisa
al usuario, en lugar de dejarlo sin poder trabajar.

> 💰 **Antes de contratar nada**, consulta las tarifas vigentes en la web de cada
> proveedor: cambian con frecuencia y casi todos cobran por caracteres enviados.
> Los enlaces están en [`docs/PROVEEDORES.md`](docs/PROVEEDORES.md), junto con las
> instrucciones detalladas para obtener cada clave.

---

## Configuración (.env)

```bash
cp .env.example .env
```

Edita `.env` y rellena **solo** lo que vayas a usar. El archivo
[`.env.example`](.env.example) documenta todas las variables; estas son las
imprescindibles:

```dotenv
# --- Servidor ---
PORT=3000
NODE_ENV=development

# --- Motor de voz: mock | elevenlabs | openai | google | azure ---
TTS_PROVIDER=google
GOOGLE_TTS_API_KEY=tu_clave_aqui
TTS_LANGUAGE=es-ES

# --- Motor de IA: heuristic | anthropic | openai | google ---
AI_PROVIDER=heuristic

# --- Límites ---
MAX_SCRIPT_CHARS=8000

# --- Almacenamiento: local | memory ---
STORAGE_DRIVER=local
STORAGE_DIR=./data
```

> 🔐 `.env` está en `.gitignore`. **Nunca subas tus claves a un repositorio** y
> nunca las escribas en el código del navegador: en esta aplicación viven
> exclusivamente en el proceso del servidor.

### Cambiar de proveedor

Cambia una línea y reinicia:

```dotenv
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...
```

No hay que tocar la interfaz, ni las rutas, ni el motor de interpretación.

---

## Cómo se usa

```
PEGAR GUION → ELEGIR VOZ → ELEGIR ESTILO → AJUSTAR → ANALIZAR
            → GENERAR → ESCUCHAR → DESCARGAR
```

1. **Escribe o pega el guion** en el panel izquierdo. Las estadísticas se
   actualizan solas.
2. **Elige la voz** en el panel derecho. Filtra por femenina o masculina y pulsa
   *Probar voz* para escuchar una muestra.
3. **Elige el estilo** de narración.
4. **Ajusta** velocidad, tono, volumen, intensidad y pausas si lo necesitas.
   Con *Interpretación automática* activada, la IA decide los matices por ti.
5. **(Opcional) Optimiza el guion**: verás el original y la propuesta lado a
   lado, y decides si aplicarla.
6. **Pulsa *Generar narración***. La barra muestra el progreso real:
   analizando → preparando interpretación → generando voz → procesando →
   audio listo.
7. **Escucha y descarga** en MP3 o WAV.
8. **Guarda el proyecto** para retomarlo más adelante.

> Atajo: `Ctrl` + `Intro` (o `Cmd` + `Intro`) genera la narración desde el editor.

---

## Marcadores de interpretación

Escríbelos dentro del guion. **No se pronuncian**: se traducen a instrucciones
para el motor de voz. Se aceptan con y sin tilde, en mayúsculas o minúsculas, y
en inglés (`[PAUSE]`, `[EMPHASIS]`, `[EMOTION: HAPPY]`…).

| Marcador | Qué hace |
|---|---|
| `[PAUSA]` | Silencio de medio segundo |
| `[PAUSA CORTA]` | Respiración breve (0,25 s) |
| `[PAUSA LARGA]` | Silencio marcado (0,9 s) |
| `[PAUSA: 1.5s]` | Silencio con la duración exacta que indiques |
| `[ÉNFASIS]…[/ÉNFASIS]` | Resalta todo el fragmento |
| `[ÉNFASIS: frase]` | Resalta una frase concreta |
| `[EMOCIÓN: FELIZ]` | `FELIZ`, `TRISTE`, `TENSO`, `CALMA`, `SORPRESA`, `URGENTE`, `INSPIRADOR`, `NEUTRAL` |
| `[TONO: MISTERIOSO]` | `MISTERIOSO`, `DRAMÁTICO`, `CÁLIDO`, `ÉPICO`, `SERIO`, `ÍNTIMO`, `ALEGRE`, `PROFESIONAL` |
| `[VELOCIDAD: LENTA]` | `MUY LENTA`, `LENTA`, `NORMAL`, `RÁPIDA`, `MUY RÁPIDA` |
| `[VOLUMEN: ALTO]` | `SUSURRO`, `BAJO`, `NORMAL`, `ALTO` |

Los corchetes que **no** correspondan a un marcador conocido (por ejemplo
`[Nota del autor]`) se respetan como texto tuyo y se leen en voz alta; la
aplicación te avisa por si fue una errata.

Ejemplo:

```
Colombia guarda una historia que pocos conocen.

[PAUSA] Pero entonces ocurrió algo inesperado.
[ÉNFASIS]En una sola noche, el 90% de los archivos desapareció.[/ÉNFASIS]

[EMOCIÓN: TRISTE] Durante años, nadie habló de aquello.
[TONO: MISTERIOSO] Hasta que una carta cambió todo lo que creíamos saber.
```

---

## Arquitectura

Las cinco capas del enunciado están separadas de forma explícita:

```
ai-voice-studio/
├── public/                      FRONTEND (HTML + CSS + JS, sin compilación)
│   ├── index.html
│   ├── styles/                  base · componentes · maquetación responsive
│   └── js/
│       ├── api.js               único punto de acceso al servidor
│       ├── state.js             estado y preferencias
│       └── ui/                  editor · ajustes · resultados · optimizador · proyectos
│
├── server/                      BACKEND
│   ├── index.js                 aplicación Express y arranque
│   ├── config.js                variables de entorno (las claves viven aquí)
│   ├── errors.js                errores con mensaje para el usuario
│   ├── middleware/              seguridad · límite de peticiones · validación
│   ├── routes/                  API HTTP
│   └── services/
│       ├── script/              MOTOR DE GUION
│       │   ├── markers.js         marcadores → instrucciones
│       │   ├── segmenter.js       párrafos y frases
│       │   ├── stats.js           estadísticas y modo Shorts
│       │   ├── styles.js          los 11 estilos de narración
│       │   ├── director.js        PLAN DE INTERPRETACIÓN
│       │   └── ssml.js            plan → SSML / instrucciones por proveedor
│       │
│       ├── ai/                  MOTOR DE IA          (abstracción + proveedores)
│       │   ├── base.provider.js   contrato
│       │   ├── heuristic.provider.js   analizador y optimizador sin conexión
│       │   └── anthropic · openai · google
│       │
│       ├── tts/                 MOTOR DE VOZ         (abstracción + proveedores)
│       │   ├── base.provider.js   contrato
│       │   ├── mock.provider.js   sintetizador offline
│       │   └── elevenlabs · openai · google · azure
│       │
│       ├── storage/             ALMACENAMIENTO       (abstracción + drivers)
│       │   └── local · memory
│       │
│       └── audio/               utilidades de audio (WAV, MP3, conversión)
│
├── tests/                       56 pruebas automáticas
└── docs/                        documentación ampliada
```

### La pieza central: el plan de interpretación

```
guion crudo
   │
   ├─ parseMarkers()      separa el texto hablado de las instrucciones
   ├─ segment()           divide en párrafos y frases
   ├─ analyzeScript()     etiqueta cada frase (motor de IA)
   └─ buildPerformance()  mezcla estilo + controles + análisis + marcadores
          │
          ▼
   PLAN: por cada frase → velocidad, tono, volumen, énfasis, emoción y pausa
          │
          ├─ toGoogleSsml()    → Google Cloud
          ├─ toAzureSsml()     → Azure (con estilos expresivos)
          ├─ toBreakText()     → ElevenLabs
          ├─ toInstructions()  → OpenAI
          └─ renderSegment()   → motor de demostración
```

Cada proveedor traduce el **mismo** plan a su propio lenguaje. Añadir uno nuevo
es escribir una clase que herede de `TtsProvider` y registrarla en
`server/services/tts/index.js`. Los detalles están en
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

**El texto del usuario nunca se modifica** al generar el audio. Solo se añaden
instrucciones de interpretación a su alrededor. La única excepción es el
optimizador, y solo si el usuario acepta expresamente los cambios.

---

## API HTTP

Todas las respuestas de error tienen la forma
`{ "error": { "code", "message", "hint" } }`, con el mensaje ya redactado en
castellano para mostrarlo tal cual.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `GET` | `/api/config` | Configuración pública, estilos, marcadores y rangos de los controles |
| `GET` | `/api/voices` | Catálogo de voces del proveedor activo |
| `POST` | `/api/script/stats` | Estadísticas del guion |
| `POST` | `/api/script/analyze` | Análisis de interpretación + plan |
| `POST` | `/api/script/optimize` | Guion original y guion optimizado + lista de cambios |
| `POST` | `/api/script/shorts` | Informe para vídeo vertical |
| `POST` | `/api/tts/generate` | Genera la narración completa |
| `POST` | `/api/tts/preview` | Muestra corta de una voz |
| `GET` | `/api/audio/:id` | Reproducción (admite `Range`) |
| `GET` | `/api/audio/:id/download` | Descarga (`?format=mp3\|wav&name=…`) |
| `GET` `POST` | `/api/projects` | Listar y crear proyectos |
| `GET` `PUT` `DELETE` | `/api/projects/:id` | Leer, actualizar y borrar |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/tts/generate \
  -H 'content-type: application/json' \
  -d '{
    "script": "Bienvenidos. [PAUSA LARGA] Pero entonces ocurrió algo inesperado.",
    "styleId": "documental",
    "voiceId": "demo-mateo",
    "controls": { "speed": 0.95, "intensity": 0.7 },
    "format": "mp3",
    "projectName": "Documental: Historia de Colombia"
  }'
```

---

## Seguridad

- **Las claves de API nunca salen del servidor.** `/api/config` solo expone
  banderas (`ttsConfigured: true`) y catálogos, jamás credenciales; hay una
  prueba automática que lo verifica.
- **Todo el texto recibido se sanea**: se normalizan los saltos de línea y se
  eliminan caracteres de control e invisibles.
- **Tamaño limitado**: `MAX_SCRIPT_CHARS` (8000 por defecto) y cuerpo JSON
  máximo de 1 MB.
- **Nada de código del usuario se ejecuta**: la interfaz inserta texto con
  `textContent`, nunca con `innerHTML`.
- **Content-Security-Policy estricta** (`default-src 'self'`, sin `unsafe-inline`),
  más `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y
  `Permissions-Policy`.
- **Sin travesía de rutas**: los identificadores de audio deben ser UUID válidos
  antes de tocar el disco.
- **Límite de peticiones por IP**, con un cupo aparte y más estricto para las
  operaciones que cuestan dinero (IA y generación de voz).
- **Los errores técnicos se registran, no se muestran**: al navegador solo llega
  un código estable y un mensaje comprensible.
- **CORS cerrado** por defecto: solo el mismo origen, salvo que enumeres dominios
  en `CORS_ORIGINS`.

---

## Puesta en producción

```bash
NODE_ENV=production npm start
```

Recomendaciones:

1. Sirve la aplicación **detrás de HTTPS** (un proxy inverso como Nginx o Caddy).
   Con `NODE_ENV=production` se envía `Strict-Transport-Security`.
2. Define `CORS_ORIGINS` si el frontend se sirve desde otro dominio.
3. Ajusta `RATE_LIMIT_*` a tu tráfico real. El limitador es por proceso: con
   varias instancias, usa además el del proxy.
4. `STORAGE_DIR` debe apuntar a un volumen persistente. Los audios se borran
   solos pasadas `AUDIO_RETENTION_HOURS` (72 por defecto), salvo los asociados a
   un proyecto guardado.
5. Instala **ffmpeg** en el servidor si quieres convertir entre formatos ya
   generados. Sin él, la descarga en MP3 sigue funcionando (codificador en
   JavaScript incluido) y la de WAV se resuelve regenerando la narración.
6. Repasa `MAX_SCRIPT_CHARS`: cada carácter enviado a un proveedor de pago cuesta
   dinero.

---

## Pruebas

```bash
npm test
```

56 pruebas automáticas que cubren marcadores, segmentación, estadísticas,
análisis de interpretación, optimizador, plan de narración, generación de SSML,
codificación de audio, el arranque real del servidor, el recorrido completo de
la API y los casos de error y seguridad. No necesitan claves ni conexión a
internet.

---

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `npm start` no muestra nada y vuelve el símbolo del sistema | El servidor no llegó a arrancar. Comprueba tu versión con `node --version`: hace falta **20.11 o superior**. Si usas una versión anterior a la 1.0.1 de esta aplicación, actualízala: había un fallo que impedía arrancar en Windows. |
| Arranca, pero «no se abre nada» | `npm start` **no abre el navegador**. Abre tú <http://localhost:3000>. La ventana de la terminal debe quedarse funcionando. |
| `EADDRINUSE: address already in use` | El puerto 3000 ya está ocupado por otro programa. Usa otro: `PORT=3005 npm start` (PowerShell: `$env:PORT=3005; npm start`). |
| «El servicio de voz no está configurado» | Falta la clave del proveedor elegido en `.env`, o el archivo no se ha guardado. Reinicia el servidor tras editarlo. |
| La voz suena robótica | Estás en el motor de demostración (etiqueta amarilla arriba). Configura un proveedor real en `.env`. |
| «No es posible entregar el audio en formato WAV» | El audio se generó en MP3 y no hay ffmpeg para convertirlo. La aplicación lo regenera en WAV automáticamente al pulsar *Descargar*; para convertir sin regenerar, instala ffmpeg. |
| «El guion es demasiado largo» | Supera `MAX_SCRIPT_CHARS`. Divídelo o sube el límite en `.env`. |
| «Se agotó la cuota disponible» | El plan del proveedor llegó a su tope. Revisa tu consumo en su panel. |
| El análisis dice que usó el motor incluido | El proveedor de IA falló o no tiene clave. La aplicación siguió funcionando con el analizador heurístico. |
| Los deslizadores de tono no cambian nada | El motor activo no admite ese control (ElevenLabs y OpenAI, por ejemplo). La aplicación lo indica bajo los controles y lo compensa con pausas y estilo. |

---

## Preparado para el futuro

La arquitectura deja sitio, sin rediseñar nada, para:

- **Clonación de voz con consentimiento** — nuevo `TtsProvider` con un catálogo
  de voces propias y un registro de consentimiento por voz.
- **Varios narradores y diálogos entre personajes** — el plan ya es una lista de
  segmentos; basta con añadir `voiceId` a cada segmento y mezclar los audios con
  `concatWav()`.
- **Efectos de sonido y música de fondo** — una capa de mezcla sobre
  `services/audio/`.
- **Subtítulos y sincronización** — el plan conoce la duración estimada de cada
  frase: generar SRT o VTT es recorrerlo acumulando tiempos.
- **Editor de audio y separación por escenas** — el análisis ya devuelve las
  escenas detectadas.
- **Traducción y narración multilingüe** — el `AiProvider` puede exponer un
  método `translate()`; los léxicos de `services/ai/lexicon.js` están preparados
  para ampliarse a más idiomas.
- **Biblioteca de voces y presets personalizados** — los estilos de
  `services/script/styles.js` son datos: guardarlos por usuario es añadir una
  colección en la capa de almacenamiento.
- **Generación de vídeo a partir del guion** — el plan aporta los tiempos por
  frase, que es justo lo que necesita un montador automático.

---

## Licencia

MIT.
