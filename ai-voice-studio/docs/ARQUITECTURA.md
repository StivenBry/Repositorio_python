# Arquitectura

Cómo está construida la aplicación y cómo ampliarla.

---

## 1. Las cinco capas

El enunciado pedía separar **frontend, backend, motor TTS, motor de IA y
almacenamiento**. Cada una vive en su propia carpeta y se comunica con las demás
a través de una interfaz explícita:

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND            public/                                 │
│  HTML + CSS + JavaScript de módulos, sin paso de compilación │
│  Habla con el servidor SOLO a través de public/js/api.js     │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP + JSON
┌───────────────────────────▼──────────────────────────────────┐
│  BACKEND             server/routes + server/middleware       │
│  Valida, limita, orquesta y traduce errores                  │
└───┬─────────────┬──────────────┬──────────────┬──────────────┘
    │             │              │              │
┌───▼──────┐ ┌────▼───────┐ ┌────▼────────┐ ┌───▼─────────────┐
│ MOTOR DE │ │ MOTOR DE   │ │ MOTOR DE    │ │ ALMACENAMIENTO  │
│ GUION    │ │ IA         │ │ VOZ (TTS)   │ │                 │
│          │ │            │ │             │ │ local · memory  │
│ script/  │ │ ai/        │ │ tts/        │ │ storage/        │
└──────────┘ └────────────┘ └─────────────┘ └─────────────────┘
                    │              │
              heuristic       mock · elevenlabs
              anthropic       openai · google
              openai          azure
              google
```

Ninguna ruta HTTP conoce a un proveedor concreto. Todas llaman a
`analyzeScript()`, `optimizeScript()`, `listVoices()` y `synthesize()`.

---

## 2. El plan de interpretación

Es el contrato interno que une el guion con cualquier motor de voz.

```
                    guion escrito por el usuario
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  parseMarkers()           segment()             analyzeScript()
  markers.js               segmenter.js          ai/index.js
        │                       │                       │
  texto limpio +          párrafos y frases       etiquetas por frase
  instrucciones           con posiciones          (tipo, emoción, énfasis,
  explícitas                                       pausas, giros, escenas)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                     buildPerformance()   director.js
                                │
                  + estilo de narración (styles.js)
                  + controles del usuario (velocidad, tono,
                    volumen, intensidad, pausas)
                                │
                                ▼
                    ┌───────────────────────┐
                    │  PLAN                 │
                    │  segments[] con       │
                    │    text               │
                    │    rate  pitch  volume│
                    │    emphasis  emotion  │
                    │    pauseAfterMs       │
                    │    reasons[]          │
                    │  estimatedSeconds     │
                    └───────────┬───────────┘
                                │
      ┌────────────┬────────────┼────────────┬────────────┐
      ▼            ▼            ▼            ▼            ▼
 toGoogleSsml  toAzureSsml  toBreakText  toInstructions renderSegment
   Google         Azure      ElevenLabs      OpenAI      demostración
```

**Reglas del plan**

1. El texto de cada segmento es **exactamente** el del usuario. Nunca se
   reescribe, se traduce ni se resume.
2. Los **marcadores explícitos siempre mandan**, incluso con la interpretación
   automática desactivada: si el usuario escribió `[PAUSA LARGA]`, hay pausa larga.
3. La interpretación automática se aplica **ponderada por el control de
   intensidad**: a 0 no toca nada; a 1 aplica el matiz completo.
4. Las pausas que el análisis propone "antes de" una frase se suman al final de
   la frase anterior, que es lo único que un motor TTS sabe expresar.

---

## 3. Cómo añadir un proveedor de voz

**Paso 1** — Crea `server/services/tts/miproveedor.provider.js`:

```js
import { TtsProvider, languageLabel, normalizeGender } from './base.provider.js';
import { config } from '../../config.js';
import { errors } from '../../errors.js';
import { request } from '../http.js';
import { toGoogleSsml } from '../script/ssml.js';

export class MiProveedorTtsProvider extends TtsProvider {
  constructor() {
    super('miproveedor', {
      ssml: true,          // ¿entiende SSML?
      perSentenceProsody: true,
      rate: true, pitch: true, volume: true, breaks: true, styles: false,
      formats: ['mp3', 'wav'],
      needsKey: true,
    });
  }

  async listVoices() {
    // Devuelve el catálogo normalizado (id, name, gender, language,
    // languageLabel, accent, description, tags, provider).
  }

  async synthesize(plan, { voiceId, format, style }) {
    // Traduce `plan` al lenguaje del proveedor y devuelve
    // { buffer, format, sampleRate, durationSeconds, notes }.
  }
}
```

**Paso 2** — Regístralo en `server/services/tts/index.js`:

```js
const FACTORIES = {
  mock: () => new MockTtsProvider(),
  // ...
  miproveedor: () => new MiProveedorTtsProvider(),
};
```

**Paso 3** — Añádelo a `TTS_PROVIDERS` y a `ttsCredential()` en
`server/config.js`, y documenta sus variables en `.env.example`.

Eso es todo. La interfaz descubre las voces y las capacidades por la API: si tu
proveedor no admite tono, la aplicación lo avisa sola bajo los controles.

### Convenciones de unidades

`server/services/script/ssml.js` centraliza todas las conversiones:

| Concepto | Rango interno | Google | Azure | OpenAI | Demostración |
|---|---|---|---|---|---|
| Velocidad | `0.5` … `2.0` | `rate="105%"` | `rate="+5%"` | `speed` | duración por sílaba |
| Tono | `-1` … `1` | `pitch="+4.0st"` | `pitch="+25%"` | — | frecuencia base |
| Volumen | `0.2` … `1.6` | `volume="+2.0dB"` | `volume="loud"` | — | amplitud |
| Pausa | milisegundos | `<break time="500ms"/>` | `<break time="500ms"/>` | puntuación | silencio en muestras |
| Énfasis | `0` … `1` | `<emphasis level>` | `<emphasis level>` | `instructions` | ganancia |

---

## 4. Cómo añadir un proveedor de IA

Igual de sencillo: hereda de `AiProvider` e implementa `analyze()` y
`optimize()`. Reutiliza los ayudantes de `server/services/ai/prompt.js`:

```js
const baseline = analyzeHeuristic(script, options);       // red de seguridad
const raw = await miModelo(analysisSystemPrompt(), analysisUserPrompt(baseline.sentences, options));
const data = parseJsonResponse(raw);                      // tolera bloques de código
return data ? mergeAnalysis(baseline, data, this.id) : baseline;
```

`mergeAnalysis()` valida cada campo por separado (tipos y rangos) y descarta lo
que no encaje, así que una respuesta imperfecta del modelo nunca rompe la
generación. `mergeOptimization()` hace lo mismo con el optimizador y además
rechaza propuestas que cambien demasiado la longitud del guion.

---

## 5. Cómo añadir un almacenamiento

`server/services/storage/base.storage.js` define el contrato: audio
(`saveAudio`, `readAudio`, `deleteAudio`), proyectos (`listProjects`,
`getProject`, `saveProject`, `deleteProject`) y `cleanup()`.

Para un bucket S3, por ejemplo, basta con implementar esos métodos y registrar el
driver en `server/services/storage/index.js`. Las rutas no cambian.

---

## 6. Manejo de errores

```
Excepción cualquiera
        │
        ▼
   toAppError()          errors.js
        │                convierte lo desconocido en INTERNAL_ERROR
        ▼
   AppError { code, message, hint, status }
        │
        ├─ logger.error(...)   traza completa, con las claves censuradas
        │                      por redact()
        ▼
   { "error": { "code", "message", "hint" } }    → navegador
        │
        ▼
   toastError()          public/js/ui/toast.js
```

El navegador **nunca** recibe trazas ni nombres internos. Los mensajes están
escritos para una persona sin conocimientos técnicos, y casi todos incluyen un
`hint` con el siguiente paso.

---

## 7. Decisiones de diseño

**Frontend sin compilación.** Módulos ES nativos servidos tal cual. Se instala y
arranca en dos comandos, no hay `build` que pueda romperse y el código que se
lee es el que se ejecuta. A cambio se renuncia al *tree-shaking* y a JSX; para
el tamaño de esta aplicación es un buen intercambio.

**Dependencias mínimas.** Solo tres: `express`, `@breezystack/lamejs` (codificador
MP3 en JavaScript puro, para que la descarga en MP3 funcione sin ffmpeg) y
`@anthropic-ai/sdk` (que solo se carga si se usa ese proveedor). El lector de
`.env`, el limitador de peticiones, las cabeceras de seguridad y el logger están
escritos a mano, son pocas líneas y quedan documentados.

**Dos llamadas para generar, no una.** `analyze` y `generate` son peticiones
separadas para que la barra de progreso muestre trabajo real y no una animación
inventada. `generate` acepta el análisis del paso anterior —validando que
corresponda al guion recibido— para no pagar dos veces la llamada a la IA.

**El cliente nunca es fuente de verdad.** El análisis que envía el navegador se
valida campo a campo y se comprueba que el número de frases coincida con el del
guion; si no, se recalcula en el servidor.

**Degradar antes que fallar.** Si el proveedor de voz no tiene credenciales, se
usa el motor de demostración. Si el de IA falla, se usa el heurístico. Si no hay
ffmpeg, se codifica el MP3 en JavaScript. En todos los casos se avisa al usuario
de qué está pasando en lugar de fingir normalidad.

---

## 8. Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `server/config.js` | Lee `.env`, valida y decide qué es público |
| `server/errors.js` | Catálogo de errores con mensaje para el usuario |
| `server/services/script/markers.js` | Marcadores → instrucciones; nunca se pronuncian |
| `server/services/script/segmenter.js` | Párrafos y frases, con abreviaturas y decimales |
| `server/services/script/stats.js` | Estadísticas e informe de Shorts |
| `server/services/script/styles.js` | Los 11 estilos y sus pistas por proveedor |
| `server/services/script/director.js` | **Plan de interpretación** |
| `server/services/script/ssml.js` | Plan → SSML / texto / instrucciones |
| `server/services/ai/lexicon.js` | Léxicos de emoción, giros y abreviaturas |
| `server/services/ai/heuristic.provider.js` | Analizador y optimizador sin conexión |
| `server/services/ai/prompt.js` | Prompts y fusión validada de respuestas |
| `server/services/tts/mock.provider.js` | Sintetizador de formantes offline |
| `server/services/tts/chunk.js` | Troceado por frases para proveedores con límite |
| `server/services/audio/wav.js` | Leer, escribir y unir WAV |
| `server/services/audio/convert.js` | ffmpeg con reserva en JavaScript |
| `public/js/state.js` | Estado y preferencias del navegador |
| `public/js/ui/results.js` | Progreso, reproductor y mapa de interpretación |
