# Guía de proveedores

Cómo conseguir cada clave, qué cuesta y qué aporta cada motor.
Todo se configura en el archivo `.env` de la raíz del proyecto.

> ⚠️ **Las tarifas cambian.** Aquí se describe el *modelo* de cobro (casi todos
> facturan por caracteres enviados) y se enlaza la página oficial de precios.
> Consúltala antes de contratar nada.

---

## 1. Motores de voz (Text-to-Speech)

### 1.1 Demostración incluida — `mock`

```dotenv
TTS_PROVIDER=mock
```

**Gratis, sin conexión y sin clave.** Es el valor por defecto.

Un sintetizador de formantes escrito en JavaScript: genera un audio *hablado*
que respeta con exactitud el ritmo, las pausas, el tono, el volumen y el énfasis
calculados por el motor de interpretación.

**No es una voz humana** y la aplicación lo advierte de forma visible. Es útil
para:

- probar el recorrido completo (generar, escuchar, descargar, guardar proyecto);
- validar el **timing** de un montaje de vídeo antes de gastar créditos de pago;
- desarrollar y ejecutar las pruebas sin coste.

---

### 1.2 Google Cloud Text-to-Speech — `google`

**De pago, con cuota gratuita mensual de caracteres.**
Precios: <https://cloud.google.com/text-to-speech/pricing>

Es el proveedor que **mejor aprovecha el plan de interpretación**: admite SSML
completo, así que la aplicación aplica velocidad, tono, volumen, énfasis y
pausas **frase a frase**.

**Cómo obtener la clave**

1. Entra en <https://console.cloud.google.com/> y crea (o elige) un proyecto.
2. Activa la API: *APIs y servicios* → *Biblioteca* → **Cloud Text-to-Speech API**
   → *Habilitar*.
3. *APIs y servicios* → *Credenciales* → *Crear credenciales* → **Clave de API**.
4. Muy recomendable: pulsa *Restringir clave* y limítala a **Cloud Text-to-Speech
   API**.

```dotenv
TTS_PROVIDER=google
GOOGLE_TTS_API_KEY=AIza...
TTS_LANGUAGE=es-ES        # filtra el catálogo: es-ES, es-CO, es-MX, en-US...
```

**Notas**

- Las voces `Neural2`, `Studio` y `Chirp` suenan mejor y cuestan más que las
  `Standard`.
- Google limita cada petición a 5000 bytes de SSML. La aplicación **trocea el
  guion por frases completas y une el audio automáticamente**; no tienes que
  hacer nada.

---

### 1.3 Microsoft Azure Speech — `azure`

**De pago, con capa gratuita F0.**
Precios: <https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/>

Admite SSML completo **y estilos expresivos por voz** (`mstts:express-as`), que
la aplicación usa para traducir las emociones detectadas en el guion.

**Cómo obtener la clave**

1. Entra en <https://portal.azure.com/> y crea un recurso **Speech service**
   (puedes elegir el nivel gratuito **F0**).
2. Abre el recurso → *Keys and Endpoint*.
3. Copia **KEY 1** y la **Location/Region** (por ejemplo `westeurope`).

```dotenv
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westeurope
TTS_LANGUAGE=es-ES
```

**Notas**

- No todas las voces admiten todos los estilos expresivos. La ficha de cada voz
  en la interfaz indica los que soporta.
- La región debe ser exactamente la del recurso; si no, la autenticación falla.

---

### 1.4 ElevenLabs — `elevenlabs`

**De pago, con plan gratuito limitado.**
Precios: <https://elevenlabs.io/pricing>

Suele dar **las voces más naturales**, especialmente en castellano. A cambio,
su API no expone velocidad ni tono directos: la aplicación transmite el ritmo
mediante etiquetas `<break>` y los ajustes de expresividad
(`stability`, `similarity_boost`, `style`), y lo indica bajo los controles.

**Cómo obtener la clave**

1. Crea una cuenta en <https://elevenlabs.io/>.
2. Abre tu perfil → *API Keys* → *Create API Key*.

```dotenv
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

**Notas**

- `eleven_multilingual_v2` es el modelo recomendado para castellano.
- Para descargar en WAV, la aplicación pide PCM al proveedor y le añade la
  cabecera WAV. Si tu plan no permite salida PCM, genera MP3 y lo convierte.

---

### 1.5 OpenAI Text-to-Speech — `openai`

**De pago.** Precios: <https://openai.com/api/pricing/>

Voces multilingües y un campo `instructions` que acepta indicaciones de
interpretación en lenguaje natural: la aplicación traduce ahí el estilo, la
emoción dominante y las frases que deben destacar.

**Cómo obtener la clave**

1. Entra en <https://platform.openai.com/api-keys>.
2. *Create new secret key* y cópiala (solo se muestra una vez).

```dotenv
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

**Notas**

- OpenAI no publica un endpoint para listar voces, así que el catálogo está en
  `server/services/tts/openai.provider.js`. Si añaden voces nuevas, se amplía ahí.
- OpenAI tampoco declara oficialmente el género de cada voz: el que muestra la
  aplicación es orientativo y así se indica en la ficha.

---

## 2. Motores de IA (análisis y optimización del guion)

El motor de IA es **opcional**. Mejora el análisis de interpretación y las
propuestas del optimizador, pero la aplicación funciona sin él.

En todos los casos, la respuesta del modelo se **fusiona sobre el análisis
heurístico local** validando campo a campo: si el modelo devuelve algo
incompleto o fuera de rango, se conserva el valor calculado en local. Y si el
proveedor falla, la aplicación responde con el análisis heurístico y avisa al
usuario. Nunca se queda sin poder generar.

### 2.1 Heurístico incluido — `heuristic`

```dotenv
AI_PROVIDER=heuristic
```

**Gratis, sin conexión y sin clave.** Es el valor por defecto.

Detecta preguntas, exclamaciones, títulos, diálogos, giros narrativos, escenas,
énfasis, pausas y cambios emocionales mediante léxicos de castellano e inglés
(`server/services/ai/lexicon.js`). Su optimizador aplica solo transformaciones
deterministas y reversibles: puntuación, signos de apertura, expansión de
abreviaturas, división de frases largas y marcadores de pausa y énfasis.

### 2.2 Anthropic Claude — `anthropic`

**De pago.** Precios: <https://www.anthropic.com/pricing>
Clave: <https://console.anthropic.com/settings/keys>

```dotenv
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
```

Usa el SDK oficial `@anthropic-ai/sdk`, que se carga solo si este proveedor está
activo.

### 2.3 OpenAI — `openai`

**De pago.** Reutiliza `OPENAI_API_KEY`.

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_AI_MODEL=gpt-4o-mini
```

### 2.4 Google Gemini — `google`

**De pago, con capa gratuita.** Clave: <https://aistudio.google.com/apikey>

```dotenv
AI_PROVIDER=google
GOOGLE_AI_API_KEY=...
GOOGLE_AI_MODEL=gemini-2.0-flash
```

---

## 3. Cómo controlar el gasto

1. **Ajusta `MAX_SCRIPT_CHARS`.** Es el tope de caracteres por guion y, por
   tanto, el tope de lo que puede costar una generación.
2. **Baja `RATE_LIMIT_HEAVY_MAX`.** Limita cuántas generaciones por minuto puede
   lanzar una misma IP.
3. **Usa el motor de demostración para ajustar el ritmo.** Trabaja el guion,
   las pausas y el énfasis en `mock` (gratis) y cambia a un proveedor real solo
   para la toma final.
4. **Prueba la voz con textos cortos.** El botón *Probar voz* envía como mucho
   `MAX_PREVIEW_CHARS` caracteres (320 por defecto).
5. **Deja `AI_PROVIDER=heuristic`** salvo que necesites la calidad extra: el
   análisis local no cuesta nada.
6. **Vigila el panel del proveedor.** Casi todos permiten fijar un límite de
   gasto mensual: actívalo.

---

## 4. Añadir un proveedor nuevo

Está explicado paso a paso en [`ARQUITECTURA.md`](ARQUITECTURA.md). En resumen:
crear una clase que herede de `TtsProvider` (o `AiProvider`), implementar dos
métodos y registrarla en el `index.js` de su carpeta. No hay que tocar la
interfaz, ni las rutas, ni el motor de interpretación.
