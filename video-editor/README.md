# Editor de Video Local

SPA/PWA móvil para editar video **100% en el navegador** con [FFmpeg.wasm](https://ffmpegwasm.netlify.app/). Ningún archivo se sube a un servidor: la carga, la vista previa y la codificación final ocurren en el dispositivo del usuario.

## Stack

- **React 19** + **Vite** — SPA.
- **Tailwind CSS v4** (`@tailwindcss/vite`) — UI mobile-first.
- **Zustand** — estado del editor (archivo, ajustes, progreso).
- **@ffmpeg/ffmpeg + @ffmpeg/core** (single-thread) — codificación local, sin necesitar cabeceras COOP/COEP.
- **vite-plugin-pwa** — instalable, funciona offline tras la primera carga.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite en un móvil o con las devtools en modo responsive.

## Compilar para producción

```bash
npm run build
npm run preview   # sirve dist/ localmente para probar el build final
```

## Cómo funciona

### Carga del motor FFmpeg

`src/ffmpeg/engine.js` carga el *core* de FFmpeg.wasm bajo demanda (solo al pulsar "Exportar", no al abrir la app) desde unpkg, usando el build **`dist/esm`** de `@ffmpeg/core`.

> ⚠️ Importante: `@ffmpeg/ffmpeg` 0.12.x siempre crea su Web Worker con `{ type: "module" }`. Eso hace que `importScripts()` falle dentro del worker y caiga al *fallback* `import(coreURL)`, que requiere un `export default` real — el build `dist/umd` (el que aparece en casi todos los tutoriales) no lo tiene y falla con `failed to import ffmpeg-core.js`. Por eso aquí se usa `dist/esm`.

El core se sirve desde una CDN (no se versiona en el repo por su peso, ~30 MB) y el *service worker* lo cachea (`runtimeCaching` en `vite.config.js`) para que, tras el primer uso, la app funcione sin conexión. El video del usuario nunca se envía a ningún sitio: solo el *motor* (código) se descarga una vez.

Se usa el core **single-thread** (no `core-mt`) a propósito: no requiere `SharedArrayBuffer` ni cabeceras `Cross-Origin-Opener/Embedder-Policy`, por lo que la app funciona en cualquier hosting estático sin configuración adicional. El costo es velocidad de codificación (un solo hilo); si tu hosting puede servir esas cabeceras, se puede migrar a `@ffmpeg/core-mt`.

### Pipeline de edición (`src/ffmpeg/`)

- `buildCommand.js` — traduce el estado del editor (transformar/audio/color/exportar) a filtros `-vf`/`-af` y flags de FFmpeg.
- `probe.js` — antes de codificar, corre `ffmpeg -i input` (sin salida) y parsea su log para saber si hay pista de audio y la duración real, sin depender de una librería de parsing aparte.
- `runExport.js` — orquesta: cargar motor → escribir archivo → probe → construir comando → ejecutar → leer resultado → limpiar filesystem virtual.
- `profiles.js` — los 3 perfiles de exportación.

Filtros aplicados:

| Ajuste | Filtro FFmpeg |
|---|---|
| Invertir horizontal | `hflip` |
| Zoom/recorte 1-5% | `crop` centrado + `scale` de vuelta al tamaño original + `setsar=1` |
| Velocidad 1.00-1.05x | `setpts` (video) + `atempo` (audio) |
| Pitch shift | `asetrate` + `aresample` + `atempo` compensado (cambia el tono sin alterar la duración) |
| Ecualizador | `bass` / `equalizer` (medios) / `treble` |
| Color | `eq=brightness:contrast:saturation` |
| Texto superpuesto | `drawtext` (ver abajo) |
| Metadatos | `-map_metadata -1 -map_chapters -1` + `-fflags/-flags +bitexact` (elimina GPS, autor, cámara, capítulos y pistas de datos ocultas; solo persisten campos estructurales obligatorios del contenedor MP4, no identificables) |

`drawtext` va **al final** de la cadena de filtros de video (después de flip/zoom/color) para que el texto nunca salga espejado ni recortado por esos ajustes. Usa `textfile=` en vez de `text=` — el contenido se escribe a un archivo en el sistema de archivos virtual de FFmpeg (`runExport.js`) y se lee tal cual, byte a byte, evitando por completo el escapado de `:`, `,`, comillas y acentos que exigiría pasar el texto inline en el filtro. La fuente (`public/fonts/DejaVuSans(-Bold).ttf`, licencia Bitstream Vera — permite redistribución) también se escribe al FS virtual antes de codificar, porque FFmpeg.wasm no tiene acceso a las fuentes del sistema operativo. Tamaño y posición se calculan como expresiones (`fontsize=h*pct`, `x=(w*pct-text_w/2)`) para que escalen con la resolución real de salida, no con píxeles fijos.

La vista previa en pantalla es una **aproximación** con CSS (`transform`/`filter`) y `playbackRate` sobre el `<video>` nativo — instantánea, pero no ejecuta FFmpeg hasta exportar. El texto es la excepción: la pestaña "Texto" renderiza un `<div>` arrastrable sobre el video usando la **misma fuente DejaVu Sans** (vía `@font-face`) para que la vista previa case con el resultado real. Mientras esa pestaña está activa, el texto se dibuja con `z-index` por encima del panel inferior — si no, con la posición por defecto (cerca del borde inferior, la típica para subtítulos) quedaría tapado por el panel expandido y sería imposible arrastrarlo. El pitch/EQ de audio no tiene preview en vivo (requeriría un grafo Web Audio aparte); se escucha en el archivo exportado.

### Perfiles de exportación (`src/ffmpeg/profiles.js`)

- **Mismo peso** — CRF 24 (constante), preserva calidad.
- **Optimizar** — apunta a un *bitrate* objetivo calculado a partir de `tamaño_original × (1 − reducción%) / duración`, con un piso de 250 kbps para no producir video ilegible en clips ya muy comprimidos.
- **Alta compresión** — CRF 30 + downscale a máx. 1280 px de ancho.

Los tres usan H.264 (`libx264`) + AAC, `-movflags +faststart` y CRF en el rango 23-26 recomendado (perfil "Mismo peso") o configurable en "Ajustes avanzados".

**Exportación rápida** (toggle en "Ajustes avanzados"): cambia `-preset` de `veryfast` a `ultrafast`. FFmpeg.wasm corre en un solo hilo dentro del navegador, así que el preset x264 es la palanca de velocidad disponible sin tocar el hosting (ver nota de `core-mt` arriba) — codifica notablemente más rápido a costa de comprimir algo menos eficiente para el mismo CRF/bitrate objetivo (archivo ligeramente más grande).

## Notas de compatibilidad

- Algunos navegadores (sobre todo builds de Chromium sin códecs propietarios, sea en Linux) no pueden **previsualizar** H.264 en el `<video>` nativo. La app lo detecta y muestra un aviso — la edición y exportación **no dependen del códec del navegador** (FFmpeg.wasm trae los suyos), así que siguen funcionando igual.
- Videos muy grandes (varios cientos de MB) pueden agotar la memoria del dispositivo, ya que FFmpeg.wasm carga el archivo completo en memoria. Pensado para clips cortos/medianos, como el resto de editores móviles basados en WASM.

## Estructura

```
public/
  fonts/           DejaVu Sans (regular + bold) para drawtext, bundleadas — no CDN
src/
  ffmpeg/          motor FFmpeg.wasm, probing, construcción de comandos, perfiles
  store/           estado global (zustand)
  components/
    tabs/          Transformar / Texto / Audio / Color / Exportar
    ui/            Slider, Toggle
  utils/           formato de bytes/tiempo
```
