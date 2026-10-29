# Pasiones en Pantalla 🎬❤️

Plataforma de streaming de novelas, series y películas con panel de administración.
React + Vite + Tailwind CSS en el frontend; **Supabase** para autenticación, base de datos y almacenamiento de videos.

![Pasiones en Pantalla](public/og-image.jpg)

**🌐 Sitio publicado:** https://stivenbry.github.io/Repositorio_python/pasiones/ · Panel: [`/admin`](https://stivenbry.github.io/Repositorio_python/pasiones/admin)

> **Funciona desde el primer minuto:** si todavía no configuras Supabase, la app arranca en **modo demo**
> con 12 títulos de ejemplo y un panel de administración que guarda los cambios en tu navegador.
> Cuando agregues las variables de entorno, pasa automáticamente a usar Supabase.

---

## ✨ Funcionalidades

**Vista pública**
- Inicio estilo plataforma de streaming: carrusel destacado con autoplay, cinta "Nuevos episodios", insignias **TOP 10** y **Exclusivo**, filas horizontales por categoría, "Continuar viendo", "Top 10" y "Mi lista".
- Ficha de cada video (título, descripción con "Ver más", fecha de publicación, categoría, etiquetas, duración, clasificación) con pestañas **Más como esto** / **Detalles**.
- **Buscador dinámico**: resultados mientras escribes, sin importar tildes ni mayúsculas, con filtros por categoría y etiquetas populares.
- **Reproductor propio**: play/pausa, barra de progreso con vista previa del tiempo, ±10 s, volumen, velocidad, imagen en imagen, pantalla completa y atajos de teclado. Reanuda donde lo dejaste.
- Soporta **MP4/WebM**, **HLS (.m3u8)**, **YouTube**, **Vimeo**, **Google Drive** y **Dropbox**.
- **Listas de reproducción** (capítulos de una novela, temporadas, colecciones): fila propia en el inicio, página
  `/lista/:id`, pestaña en la ficha de cada video y paso automático al siguiente capítulo con cuenta regresiva.
- Diseño responsivo (móvil, tablet, escritorio), animaciones suaves y transiciones entre páginas.

**Panel de administración (`/admin`)**
- No aparece en el sitio público (ni en el menú ni en el pie de página) y pide a los buscadores no indexarlo:
  se entra escribiendo la dirección `/admin`.
- Inicio de sesión con correo y contraseña; ruta protegida.
- Estadísticas, tabla de videos con búsqueda y filtros (categoría, publicados/programados).
- Formulario para **subir un archivo de video** (arrastrar y soltar, con barra de progreso) **o pegar un enlace**.
- Miniatura vertical y portada horizontal: súbelas, pega un enlace o **captúralas de un fotograma del video**.
- Título, descripción, categoría, etiquetas, clasificación, duración (detectada automáticamente), cinta, portada/Top 10/Exclusivo.
- **Publicación programada**: con una fecha futura el video queda oculto al público hasta ese momento.
- Asignar cada video a una **lista de reproducción** (o crear una nueva desde el mismo formulario, con descripción y
  portada) con su número de orden.
- Página **Listas**: crear y editar listas con **nombre, descripción y portada** (subida o enlace), reordenar
  (subir/bajar), quitar videos y eliminar listas (los videos se conservan; la portada subida se borra).
- Editar y eliminar (también borra los archivos de Storage).

---

## 🚀 Puesta en marcha (paso a paso)

### Paso 1 · Crear el proyecto en Supabase (5 minutos)

1. Entra a [supabase.com](https://supabase.com), crea una cuenta y pulsa **New project**
   (elige la región más cercana a tu público, p. ej. *South America (São Paulo)*).
2. Ve a **SQL Editor → New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Esto crea la tabla `videos`, la tabla `admins`, el bucket público `media` y todas las reglas de seguridad (RLS).
3. *(Opcional)* Para empezar con los 12 títulos de ejemplo, ejecuta también [`supabase/seed.sql`](supabase/seed.sql).
4. Crea tu usuario administrador: **Authentication → Users → Add user → Create new user**,
   escribe tu correo y contraseña y marca **Auto Confirm User**.
5. Dale permisos de administrador. En el **SQL Editor** ejecuta (cambiando el correo):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com'
   on conflict do nothing;
   ```
6. *(Recomendado)* Desactiva los registros públicos: **Authentication → Sign In / Providers → Email →
   "Allow new users to sign up" = off**. Aunque alguien se registre, sin estar en `admins` no puede modificar nada.
7. Copia tus credenciales en **Project Settings → API** (o **API Keys**):
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** / **publishable key** → será `VITE_SUPABASE_ANON_KEY`

> 🔐 La clave *anon/publishable* es pública por diseño (va dentro del sitio). La protección la dan las
> políticas RLS. **Nunca** uses la clave `service_role`/`secret` en el frontend.

### Paso 2 · Publicar el sitio

#### Opción A — Vercel (recomendada)

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repositorio `Repositorio_python` desde GitHub.
2. En **Root Directory** elige `pasiones-en-pantalla` (Vercel detecta Vite automáticamente).
3. En **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Pulsa **Deploy**. Cada `git push` a la rama principal vuelve a publicar el sitio.

O con un clic (crea una copia del repositorio en tu cuenta):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FStivenBry%2FRepositorio_python&root-directory=pasiones-en-pantalla&project-name=pasiones-en-pantalla&repository-name=pasiones-en-pantalla&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Credenciales%20p%C3%BAblicas%20de%20Supabase%20(Project%20Settings%20%E2%86%92%20API)&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard%2Fproject%2F_%2Fsettings%2Fapi)

#### Opción B — Netlify

1. En [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → elige el repositorio.
   El archivo [`netlify.toml`](../netlify.toml) (en la raíz del repo) ya configura carpeta, comando de build y redirecciones.
2. En **Site configuration → Environment variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Deploys → Trigger deploy**.

O con un clic:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/StivenBry/Repositorio_python)

#### Opción C — GitHub Pages (ya configurado en este repositorio)

El sitio se publica solo en **https://stivenbry.github.io/Repositorio_python/pasiones/**.
GitHub Pages está configurado para servir la carpeta `docs/` de `main`. Cada cambio en `pasiones-en-pantalla/`
que llega a `main` ejecuta el workflow [`.github/workflows/pasiones-pages.yml`](../.github/workflows/pasiones-pages.yml),
que compila con `npm run build:pages` y guarda el resultado en `docs/pasiones/` (también copia `terapias.html` a `docs/`).
`docs/404.html` permite abrir directamente enlaces como `/pasiones/video/...`.

Las credenciales públicas de Supabase para este build se leen de `pasiones-en-pantalla/.env.production`.

#### Opción D — Cualquier hosting estático

```bash
npm install
npm run build      # genera la carpeta dist/
```
Sube `dist/` a Cloudflare Pages, GitHub Pages, Firebase Hosting, etc. Configura las variables **antes** del build
(Vite las incrusta al compilar) y una regla que redirija todas las rutas a `index.html`
(ya incluida en `public/_redirects` para Netlify y Cloudflare Pages).

> ⚠️ Las variables `VITE_*` se leen **al compilar**. Si las cambias en Vercel/Netlify, vuelve a desplegar.

### Paso 3 · Entrar al panel

Abre `https://tu-sitio.vercel.app/admin`, inicia sesión con el usuario del paso 1 y sube tu primer video.
El indicador **"Supabase conectado"** en la barra del panel confirma que todo está bien configurado.

---

## 💻 Desarrollo local

Requisitos: Node.js 20.19+ (recomendado 22).

```bash
cd pasiones-en-pantalla
npm install
cp .env.example .env.local   # edita con tus credenciales (o déjalo así para modo demo)
npm run dev                  # http://localhost:5173
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga instantánea |
| `npm run build` | Verifica tipos (TypeScript) y genera `dist/` para producción |
| `npm run build:pages` | Igual, pero para GitHub Pages (subcarpeta `/Repositorio_python/pasiones/`, salida en `../docs/pasiones`) |
| `npm run preview` | Sirve `dist/` localmente para probar el build |
| `npm run typecheck` | Solo verificación de tipos |

**Modo demo:** usuario `admin@pasiones.demo` / contraseña `demo1234`. Los videos que subas se guardan en
IndexedDB de tu navegador; el botón **Restaurar demo** del panel vuelve al catálogo original.

---

## 💰 Publicidad con Google AdSense

La integración ya está en el código y se activa con dos variables. Mientras no existan, el sitio no carga nada de Google.

1. **Requisitos de Google**
   - Un **dominio propio** (p. ej. `pasionesenpantalla.com`). AdSense solo acepta sitios de nivel de dominio y exige
     `ads.txt` en la raíz, así que no sirve una subcarpeta de `github.io`. En GitHub: *Settings → Pages → Custom domain*.
   - **Contenido propio o con derechos de emisión.** Publicar novelas o series de terceros sin licencia hace que Google
     rechace o cierre la cuenta.
   - Política de privacidad: ya incluida en `/privacidad`, enlazada en el pie de página.
2. Crea la cuenta en [adsense.google.com](https://adsense.google.com) con tu dominio y copia tu **ID de editor** (`ca-pub-…`).
3. En **Anuncios → Por bloque de anuncios**, crea un bloque **Display adaptable** y copia su `data-ad-slot`.
4. Agrega en `.env.production` (o en las variables de Vercel/Netlify):
   ```
   VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   VITE_ADSENSE_SLOT=XXXXXXXXXX
   ```
5. Publica. El build añade el script de AdSense, la meta `google-adsense-account` (verificación del sitio) y `ads.txt`.
6. En AdSense: verifica el sitio y, en **Privacidad y mensajes**, activa el mensaje de consentimiento para visitantes de
   Europa/Reino Unido (Google lo exige y lo muestra él mismo).

Los anuncios aparecen en el inicio (entre filas), en la ficha de cada video, en la búsqueda y en las categorías. **Nunca**
en el reproductor ni en el panel. Si Google no llena un espacio, el bloque se oculta solo. Si activas *Auto ads* en AdSense,
desactiva los anuncios "anclados" para que no tapen los controles del reproductor.

## 💸 Publicidad con Adsterra

Ya está activa en `.env.production`. Cada formato se configura con una variable cuyo valor es el `src` del script que
da Adsterra en **Get code** (para el Smartlink, el enlace). Si una variable falta o está vacía, ese formato no se carga.

| Variable | Formato | Dónde aparece |
| --- | --- | --- |
| `VITE_ADSTERRA_POPUNDER` | Popunder | Todo el sitio: se abre al hacer clic en la página. |
| `VITE_ADSTERRA_SOCIAL_BAR` | Social Bar | Todo el sitio. |
| `VITE_ADSTERRA_NATIVE` | Native Banner | Inicio (debajo de «Recién agregados»), categorías y final de cada lista. |
| `VITE_ADSTERRA_BANNER` + `VITE_ADSTERRA_BANNER_SIZE` | Banner (p. ej. `468x60`) | Final del inicio, ficha de cada video, búsqueda y encima de los capítulos de cada lista. |
| `VITE_ADSTERRA_SMARTLINK` | Smartlink | Enlace «Patrocinado» en el pie de página. |

- Nunca se cargan en el panel `/admin`.
- Como la app no recarga la página al navegar, el Native Banner y el banner se cargan dentro de páginas propias
  (`ads/nativo.html` y `ads/banner.html`, generadas al compilar) para que se pidan de nuevo en cada sección. En
  celulares el banner se reduce para caber en la pantalla.
- En Adsterra el sitio está registrado como `stivenbry.github.io`. Si cambias a un dominio propio, agrégalo también allí.
- Para cambiar un código: edita la variable, ejecuta `npm run build:pages` y sube los cambios (o deja que lo haga
  la acción de GitHub al hacer push).

## 🌐 Dominio propio (p. ej. pasionesenpantalla.com)

1. Compra el dominio en un registrador (Namecheap, Porkbun, Cloudflare, GoDaddy…).
2. En su panel DNS crea estos registros:
   - `A` para `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`
   - `CNAME` para `www` → `stivenbry.github.io`
3. En el repositorio se añade `docs/CNAME` con el dominio y se recompila el sitio con `base` `/`, para que la app quede
   en la raíz del dominio.
4. En GitHub → *Settings → Pages* marca **Enforce HTTPS** cuando aparezca disponible (el certificado tarda hasta 24 h).

## 🎥 Sobre el almacenamiento de videos

- El plan gratuito de Supabase permite archivos de hasta **50 MB**. En planes de pago puedes subirlo
  (Storage → Settings → *Upload file size limit*). El formulario avisa si un archivo supera ese tamaño.
- Para capítulos largos o mucho tráfico, usa la opción **Enlace** del formulario con un servicio de streaming
  (Bunny Stream, Cloudflare Stream, Mux… que entregan **HLS .m3u8**), o enlaces de YouTube/Vimeo.
- Formato recomendado para subir: **MP4 (H.264 + AAC)**, que se reproduce en todos los navegadores.
- Google Drive: el archivo debe estar compartido como *"Cualquier persona con el enlace"*. La app intenta reproducirlo
  en su propio reproductor; si Drive no entrega el archivo (suele pasar con archivos grandes o muy vistos), muestra el
  visor de Drive recortado, sin el botón de "abrir en ventana nueva". El formulario te dice cuál de los dos se usará y
  puede tomar la imagen de Drive como miniatura y portada.

## ⌨️ Atajos del reproductor

| Tecla | Acción |
| --- | --- |
| `Espacio` / `K` | Reproducir / pausar |
| `←` `→` / `J` `L` | Retroceder / adelantar 10 s |
| `↑` `↓` | Subir / bajar volumen |
| `M` | Silenciar |
| `F` / doble clic | Pantalla completa |
| `0`–`9` | Saltar al 0 %–90 % del video |

---

## 🗂️ Estructura

```
pasiones-en-pantalla/
├── public/
│   ├── demo/                 # Pósters, portadas y clips originales del catálogo de ejemplo
│   ├── favicon.svg, og-image.jpg, _redirects
├── supabase/
│   ├── schema.sql            # Tablas, RLS, bucket "media" y políticas de Storage
│   └── seed.sql              # Datos de ejemplo (opcional)
├── src/
│   ├── components/           # Header, HeroCarousel, VideoRow, VideoCard, VideoPlayer, AdSlot…
│   ├── context/              # Auth, catálogo y notificaciones
│   ├── data/demoCatalog.ts   # Catálogo de ejemplo
│   ├── lib/                  # Configuración, formato, detección de enlaces, Mi lista/progreso
│   ├── pages/                # Inicio, ficha, reproductor, búsqueda, categoría, Mi lista
│   │   └── admin/            # Login, layout protegido, panel y formulario
│   ├── services/             # Backend Supabase y backend demo (misma interfaz)
│   └── index.css             # Tema (colores, tipografías, animaciones)
├── .env.example
└── vercel.json
```

## 🎨 Personalización rápida

- **Colores y tipografías:** bloque `@theme` en `src/index.css` (`--color-brand` es el naranja principal).
- **Logo:** `src/components/Logo.tsx` y `public/favicon.svg`.
- **Textos de SEO y redes:** `index.html` y `public/og-image.jpg`.

## 🛠️ Solución de problemas

| Síntoma | Solución |
| --- | --- |
| El panel dice "Modo demo" en producción | Faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o no se volvió a desplegar después de agregarlas. |
| "Tu usuario no tiene permisos de administrador" | Ejecuta el `insert into public.admins …` del paso 1.5 con el correo correcto. |
| "Debes confirmar el correo del usuario" | En Authentication → Users, confirma el usuario o créalo con *Auto Confirm User*. |
| "La tabla videos no existe" / "No existe el bucket" | Ejecuta `supabase/schema.sql` completo. |
| "El archivo supera el tamaño máximo" | Sube el límite en Storage o usa un enlace externo (ver arriba). |
| Error 404 al recargar `/admin` o `/video/...` | Falta la redirección SPA; `vercel.json`, `netlify.toml` y `_redirects` ya la incluyen. |
| Un enlace HLS no carga | El servidor del `.m3u8` debe permitir CORS para tu dominio. |
