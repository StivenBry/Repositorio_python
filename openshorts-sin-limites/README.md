# OpenShorts Sin Límites

Copia de [OpenShorts](https://github.com/mutonby/openshorts) (licencia MIT) para
tu propio servidor, con las mismas funciones y **sin límites**: sin cuota de
minutos, sin marca de agua, sin tope de tamaño ni de duración, sin máximo de
clips y sin borrado automático de tus trabajos.

Convierte vídeos largos (podcasts, directos, clases, entrevistas) en clips
verticales 9:16 para TikTok, Instagram Reels y YouTube Shorts, crea vídeos de
anuncio con actores de IA y prepara miniaturas, títulos y descripciones para
YouTube.

## Funciones

Las tres herramientas del original, completas:

1. **Generador de clips.** Transcribe el vídeo con marcas de tiempo por
   palabra, detecta escenas y deja que la IA (Gemini, o tu propio modelo local)
   elija los mejores momentos. Después corta, reencuadra en vertical siguiendo
   la cara, añade subtítulos y un texto gancho.
   - Diseños automáticos: **TRACK** (sigue a quien habla), **SPLIT** (dos
     personas apiladas con los subtítulos en la costura), **SCREENCAST**
     (pantalla sobre el presentador) y **GENERAL** (fondo desenfocado).
   - Editor de clips (recortar, unir tramos, cambiar encuadre), estilos de
     subtítulos (karaoke, Hormozi...), ganchos, efectos de vídeo generados por
     IA y doblaje a más de 30 idiomas con ElevenLabs.
2. **AI Shorts (vídeos UGC).** A partir de una web o una descripción: guion,
   actor de IA (Flux), voz (ElevenLabs), vídeo con sincronía labial (Hailuo +
   VEED o Kling), b-roll y montaje final con subtítulos.
3. **YouTube Studio.** Miniaturas con IA (con tu cara), 10 títulos virales con
   chat para pulirlos y descripciones con capítulos.

Y además:

- **Publicación y programación** en TikTok, Instagram y YouTube a la vez
  (vía Upload-Post), con cola de programados y estadísticas.
- **Para agentes y automatizaciones:** servidor MCP (`/mcp`, también por
  stdio), API REST con documentación en `/docs`, webhooks firmados al terminar
  cada trabajo, CLI (`cli/`), skill para agentes (`skills/openshorts/`) y
  workflows de n8n (`examples/n8n/`).
- **Galería UGC** con páginas SEO por vídeo y copia opcional en S3.
- **Herramientas gratuitas:** transcripción de vídeos de YouTube y generador de
  títulos/descripciones/etiquetas.

## Límites quitados

| En el original | Aquí | Para volver a ponerlo (`.env`) |
|---|---|---|
| Plan gratis del servicio alojado: 20 min/mes y marca de agua | No existe: sin cuota ni marca de agua | — |
| Trabajos simultáneos por plan (error 429) | No existe; lo que no cabe espera en la cola | — |
| Subida de 2 GB como máximo | Sin límite (probado con 2,4 GB) | `MAX_FILE_SIZE_MB` |
| Vídeos de menos de 45 s rechazados | Se aceptan | `MIN_SOURCE_SECONDS` |
| Máximo 15 clips por vídeo | Sin máximo (`--clips 40`, `target_clips: 40`...) | — |
| Clips de 180 s como máximo | Sin máximo (mínimo 5 s) | — |
| Editor: 12 tramos y 180 s por clip | Sin máximo | `RECUT_MAX_SEGMENTS`, `RECUT_MAX_TOTAL_SECONDS` |
| Trabajos y subidas borrados a las 24 h | Se guardan hasta que los borres | `JOB_RETENTION_SECONDS` |
| Tope de disco (25 GB de trabajos, 15 GB de subidas) que borraba lo antiguo | Sin tope | `OUTPUT_MAX_GB`, `UPLOADS_MAX_GB` |
| Herramientas gratuitas: 10 cada 10 min y 60 al día por IP | Sin límite | `FREE_TOOLS_RATE_LIMIT=1` |

Todo está explicado en [`.env.example`](.env.example).

### Lo que esta copia no puede quitar

- **Los servicios externos son tuyos y tienen sus propios límites y precios:**
  Gemini (capa gratuita generosa, o un modelo local sin coste), fal.ai (pago
  por uso, ~0,65-2 $ por AI Short), ElevenLabs y Upload-Post (10 subidas
  gratis al mes).
- **Tu máquina:** en CPU, un vídeo de 8 minutos tarda 5-8 minutos (con GPU
  NVIDIA, alrededor de uno). `MAX_CONCURRENT_JOBS` (5) solo decide cuántos
  trabajos van a la vez; el resto espera en la cola.
- **El disco:** como ya nada se borra solo, la carpeta `output/` crece. Bórrala
  cuando quieras o pon `JOB_RETENTION_SECONDS=86400` para volver al borrado a
  las 24 h.
- **YouTube** puede bloquear descargas; para eso está `YOUTUBE_COOKIES`.

Se mantienen algunas protecciones que no limitan el uso normal: la foto de
actor hasta 25 MB (se carga entera en memoria), clips de al menos 5 s, aviso
previo si un vídeo de YouTube baja de 720p (solo avisa) y caducidad de 6 h de
los huecos de subida para agentes que nunca se usan.

### Lo que no incluye

Lo exclusivo del servicio de pago de openshorts.app, que vive en `cloud/` con
licencia comercial: cuentas e inicio de sesión, planes y pagos, claves
gestionadas, la pestaña Historial y **Autopilot** (recortar solo los vídeos
nuevos de tu canal). Para algo parecido a Autopilot tienes el workflow
`examples/n8n/openshorts-content-machine.json`.

## Requisitos

- Docker y Docker Compose, y 8 GB de RAM o más.
- Clave de **Google Gemini** ([gratis](https://aistudio.google.com/app/apikey)),
  salvo que uses un modelo local.
- Opcionales según lo que uses: **fal.ai** (AI Shorts), **ElevenLabs** (voz y
  doblaje) y **Upload-Post** (publicar en redes).

## Puesta en marcha

```bash
git clone https://github.com/StivenBry/Repositorio_python.git
cd Repositorio_python/openshorts-sin-limites
cp .env.example .env          # opcional
docker compose up --build
```

- Panel: **http://localhost:5175** → pon tu clave de Gemini en **Settings**
  (es la única obligatoria; Upload-Post solo hace falta si quieres que publique
  en tus redes por ti, si no descargas los clips y los subes a mano).
- API: http://localhost:8000 (documentación en http://localhost:8000/docs).

### Con GPU NVIDIA (opcional)

Instala el controlador y el
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
y crea `docker-compose.override.yml` junto a `docker-compose.yml`:

```yaml
services:
  backend:
    build:
      context: .
      args:
        GPU: "1"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu, video]
```

y en `.env`:

```
WHISPER_MODEL=large-v3-turbo
WHISPER_DEVICE=cuda
WHISPER_COMPUTE=float16
FFMPEG_ENCODER=auto
```

### Sin clave de Google (modelo local)

La elección de momentos puede usar cualquier servidor compatible con OpenAI
(Ollama, LM Studio, vLLM, llama.cpp, OpenRouter...):

```
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_MODEL=qwen2.5:14b
```

Con Ollama arranca con `OLLAMA_CONTEXT_LENGTH=16384`. Lo que necesita ver
fotogramas (elección automática de diseño, vídeos sin voz) sigue usando Gemini
si hay clave, o vuelve al encuadre normal si no la hay.

## Automatizar

```bash
# MCP para Claude Code, Cursor, etc. (sin clave)
claude mcp add --transport http openshorts http://localhost:8000/mcp
claude mcp add openshorts -- python mcp_stdio.py    # sin servidor web

# API REST
curl -X POST http://localhost:8000/api/process \
  -H "Content-Type: application/json" -H "X-Gemini-Key: TU_CLAVE" \
  -d '{"url": "https://youtube.com/watch?v=...", "acknowledged": true,
       "target_clips": 30, "clip_max_seconds": 300,
       "webhook_url": "https://tu-servidor/hooks/openshorts"}'

# CLI
pip install ./cli
openshorts process "https://youtube.com/watch?v=..." --clips 30 --max-seconds 300 --wait
```

Con `webhook_url` recibes un único POST al terminar (firmado con
`X-OpenShorts-Signature` si pasas `webhook_secret`). Más en
[`cli/README.md`](cli/README.md), [`skills/openshorts/`](skills/openshorts/) y
[`examples/n8n/`](examples/n8n/).

## Desarrollo

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
pytest tests/ -v

cd dashboard && npm install
npm run dev        # http://localhost:5173
npm run build
```

`docs/architecture/` es la documentación interna del original (algunas partes
hablan del servicio de pago, que aquí no está).

## Créditos y licencia

Basado en [mutonby/openshorts](https://github.com/mutonby/openshorts) (commit
`9fc517b`), licencia MIT. Se conservan [`LICENSE`](LICENSE) y
[`NOTICE`](NOTICE). Esta copia no incluye el directorio `cloud/` del original,
así que todo su código es MIT.
