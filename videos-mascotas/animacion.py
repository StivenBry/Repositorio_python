"""Motor mínimo de animación 2D (cairo) para shorts verticales 9:16.

Cada video se describe con una función dibujar(ctx, t) que pinta el cuadro
del instante t (en segundos). Este módulo pone las herramientas comunes:
curvas de animación, figuras con contorno, subtítulos, partículas y el
renderizado final con ffmpeg (imagen + sonido en un .mp4).
"""
import math
import random
import subprocess

import cairo

W, H, FPS = 1080, 1920, 30
TAU = 2 * math.pi
FUENTE = "Inter"

TINTA = (0.16, 0.11, 0.09)
BLANCO = (1.0, 1.0, 1.0)
NEGRO = (0.0, 0.0, 0.0)
AMARILLO = (1.0, 0.84, 0.12)


def hx(codigo):
    """'#rrggbb' -> (r, g, b) en 0..1."""
    codigo = codigo.lstrip("#")
    return tuple(int(codigo[i:i + 2], 16) / 255 for i in (0, 2, 4))


# ---------------------------------------------------------------- tiempo

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, k):
    return a + (b - a) * k


def mezcla(c1, c2, k):
    return tuple(lerp(a, b, k) for a, b in zip(c1, c2))


def tramo(t, a, b):
    """Progreso 0..1 de t dentro del intervalo [a, b]."""
    if b <= a:
        return 1.0 if t >= b else 0.0
    return clamp((t - a) / (b - a))


def suave(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def sale(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def entra(x):
    x = clamp(x)
    return x ** 3


def sale_atras(x, s=1.9):
    """Llega pasándose un poco y vuelve (efecto 'pop')."""
    x = clamp(x) - 1
    return 1 + x * x * ((s + 1) * x + s)


def rebote(x):
    x = clamp(x)
    n, d = 7.5625, 2.75
    if x < 1 / d:
        return n * x * x
    if x < 2 / d:
        x -= 1.5 / d
        return n * x * x + 0.75
    if x < 2.5 / d:
        x -= 2.25 / d
        return n * x * x + 0.9375
    x -= 2.625 / d
    return n * x * x + 0.984375


def temblor(t, fuerza, semilla=0.0):
    """Desplazamiento (dx, dy) pseudoaleatorio para sacudir la cámara."""
    dx = math.sin(t * 91.7 + semilla) * 0.6 + math.sin(t * 57.3 + semilla * 2) * 0.4
    dy = math.sin(t * 77.1 + semilla * 3) * 0.6 + math.sin(t * 43.9 + semilla) * 0.4
    return dx * fuerza, dy * fuerza


def fotogramas(t, claves):
    """Interpola (x, y) entre claves [(t, x, y), ...] con curva suave."""
    if t <= claves[0][0]:
        return claves[0][1], claves[0][2]
    for (t0, x0, y0), (t1, x1, y1) in zip(claves, claves[1:]):
        if t <= t1:
            k = suave(tramo(t, t0, t1))
            return lerp(x0, x1, k), lerp(y0, y1, k)
    return claves[-1][1], claves[-1][2]


# ---------------------------------------------------------------- figuras

def elipse(ctx, cx, cy, rx, ry, ang=0.0):
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(ang)
    ctx.scale(max(rx, 0.01), max(ry, 0.01))
    ctx.new_sub_path()
    ctx.arc(0, 0, 1, 0, TAU)
    ctx.close_path()
    ctx.restore()


def rect_redondo(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def poligono(ctx, puntos):
    ctx.move_to(*puntos[0])
    for p in puntos[1:]:
        ctx.line_to(*p)
    ctx.close_path()


def pintar(ctx, color, borde=6.0, alpha=1.0, tinta=TINTA):
    """Rellena el trazado actual y, si borde > 0, le pone contorno."""
    ctx.set_source_rgba(*color, alpha)
    if borde:
        ctx.fill_preserve()
        ctx.set_line_width(borde)
        ctx.set_source_rgba(*tinta, alpha)
        ctx.stroke()
    else:
        ctx.fill()


def trazo(ctx, color, ancho, borde=6.0, alpha=1.0, tinta=TINTA):
    """Traza el camino actual como un tubo grueso con contorno (colas, patas, brazos)."""
    if borde:
        ctx.set_source_rgba(*tinta, alpha)
        ctx.set_line_width(ancho + 2 * borde)
        ctx.stroke_preserve()
    ctx.set_source_rgba(*color, alpha)
    ctx.set_line_width(ancho)
    ctx.stroke()


def linea(ctx, puntos, ancho=6.0, color=TINTA, alpha=1.0):
    ctx.new_path()
    ctx.move_to(*puntos[0])
    for p in puntos[1:]:
        ctx.line_to(*p)
    ctx.set_source_rgba(*color, alpha)
    ctx.set_line_width(ancho)
    ctx.stroke()


def sombra(ctx, x, y, rx, ry=None, alpha=0.18):
    elipse(ctx, x, y, rx, ry or rx * 0.14)
    ctx.set_source_rgba(0, 0, 0, alpha)
    ctx.fill()


def estrella(ctx, x, y, r, color=AMARILLO, alpha=1.0, rot=0.0):
    """Destello de 4 puntas."""
    puntos = []
    for i in range(8):
        a = rot + i * math.pi / 4
        rr = r if i % 2 == 0 else r * 0.28
        puntos.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    ctx.new_path()
    poligono(ctx, puntos)
    pintar(ctx, color, max(2.0, r * 0.12), alpha)


def lineas_velocidad(ctx, x, y, direccion, alpha=1.0, largo=90, n=3, sep=34):
    """Rayitas detrás de algo que se mueve rápido (direccion=1 si va a la derecha)."""
    for i in range(n):
        yy = y + (i - (n - 1) / 2) * sep
        x0 = x - direccion * (30 + i * 12)
        linea(ctx, [(x0, yy), (x0 - direccion * largo, yy)], 7, BLANCO, alpha * 0.9)


def nube_polvo(ctx, x, y, k, escala=1.0):
    """Nube tipo 'puf' que crece y se desvanece (k de 0 a 1)."""
    if k <= 0 or k >= 1:
        return
    alpha = 1 - k
    r = (40 + 70 * sale(k)) * escala
    for i in range(7):
        a = i * TAU / 7 + 0.4
        elipse(ctx, x + math.cos(a) * r, y + math.sin(a) * r * 0.6, r * 0.55, r * 0.5)
        pintar(ctx, (0.96, 0.95, 0.93), 4, alpha)


# ---------------------------------------------------------------- texto

def _palabras(cadena):
    """Divide en palabras; lo que va entre *asteriscos* se resalta.

    Cada palabra es una lista de trozos (texto, resaltado), así una palabra
    como '*minutos*...' queda con 'minutos' resaltado y '...' normal.
    """
    palabras, resaltado = [], False
    for p in cadena.split():
        trozos = []
        for j, trozo in enumerate(p.split("*")):
            if j:
                resaltado = not resaltado
            if trozo:
                trozos.append((trozo, resaltado))
        if trozos:
            palabras.append(trozos)
    return palabras


def texto(ctx, cadena, x, y, tam=78, color=BLANCO, resalte=AMARILLO, borde=NEGRO,
          ancho_max=940, escala=1.0, alpha=1.0, grosor=0.22, con_sombra=True, rot=0.0):
    """Texto grueso con contorno, centrado en (x, y), con salto de línea automático."""
    if alpha <= 0:
        return
    ctx.save()
    ctx.select_font_face(FUENTE, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(tam)
    espacio = ctx.text_extents(" ").x_advance
    lineas, actual, ancho = [], [], 0.0
    for trozos in _palabras(cadena):
        w = sum(ctx.text_extents(trozo).x_advance for trozo, _ in trozos)
        nuevo = ancho + (espacio if actual else 0) + w
        if actual and nuevo > ancho_max:
            lineas.append((actual, ancho))
            actual, nuevo = [], w
        actual.append((trozos, w))
        ancho = nuevo
    if actual:
        lineas.append((actual, ancho))

    alto = tam * 1.13
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(escala, escala)
    y0 = -alto * len(lineas) / 2 + tam * 0.86

    def recorrer():
        yy = y0
        for palabras, ancho_linea in lineas:
            xx = -ancho_linea / 2
            for trozos, w in palabras:
                xt = xx
                for trozo, resaltado in trozos:
                    yield trozo, resaltado, xt, yy
                    xt += ctx.text_extents(trozo).x_advance
                xx += w + espacio
            yy += alto

    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    if con_sombra:
        ctx.new_path()
        for palabra, _, xx, yy in recorrer():
            ctx.move_to(xx, yy + tam * 0.09)
            ctx.text_path(palabra)
        ctx.set_source_rgba(0, 0, 0, 0.35 * alpha)
        ctx.set_line_width(tam * grosor)
        ctx.stroke_preserve()
        ctx.fill()
    ctx.new_path()
    for palabra, _, xx, yy in recorrer():
        ctx.move_to(xx, yy)
        ctx.text_path(palabra)
    ctx.set_source_rgba(*borde, alpha)
    ctx.set_line_width(tam * grosor)
    ctx.stroke()
    for palabra, resaltada, xx, yy in recorrer():
        ctx.new_path()
        ctx.move_to(xx, yy)
        ctx.text_path(palabra)
        ctx.set_source_rgba(*(resalte if resaltada else color), alpha)
        ctx.fill()
    ctx.restore()


def subtitulo(ctx, t, inicio, fin, cadena, y=300, tam=80, **kw):
    """Subtítulo que aparece con un 'pop' y se desvanece al final."""
    if t < inicio or t > fin:
        return
    escala = 0.45 + 0.55 * sale_atras(tramo(t, inicio, inicio + 0.3))
    alpha = min(tramo(t, inicio, inicio + 0.08), 1 - tramo(t, fin - 0.15, fin))
    texto(ctx, cadena, W / 2, y, tam, escala=escala, alpha=alpha, **kw)


def zzz(ctx, x, y, t, escala=1.0, alpha=1.0):
    """Tres 'Z' que suben y se desvanecen sin parar."""
    for i in range(3):
        fase = (t * 0.55 + i / 3) % 1.0
        zx = x + (50 * fase + 14 * math.sin(fase * TAU * 1.5)) * escala
        zy = y - 190 * fase * escala
        tam = (36 + 44 * fase) * escala
        texto(ctx, "Z", zx, zy, tam, color=(0.85, 0.92, 1.0), borde=hx("#2B3A67"),
              alpha=alpha * math.sin(math.pi * fase), con_sombra=False, grosor=0.2)


# ---------------------------------------------------------------- cámara

def camara(ctx, zoom=1.0, cx=W / 2, cy=H / 2, dx=0.0, dy=0.0, rot=0.0):
    """Centra la vista en el punto (cx, cy) del mundo con el zoom pedido."""
    ctx.translate(W / 2 + dx, H / 2 + dy)
    ctx.rotate(rot)
    ctx.scale(zoom, zoom)
    ctx.translate(-cx, -cy)


def vineta(ctx, color=(0, 0, 0), alpha=0.35):
    grad = cairo.RadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
    grad.add_color_stop_rgba(0, *color, 0)
    grad.add_color_stop_rgba(1, *color, alpha)
    ctx.rectangle(0, 0, W, H)
    ctx.set_source(grad)
    ctx.fill()


def destello(ctx, alpha, color=BLANCO):
    if alpha > 0:
        ctx.rectangle(0, 0, W, H)
        ctx.set_source_rgba(*color, alpha)
        ctx.fill()


# ---------------------------------------------------------------- partículas

class Particulas:
    """Partículas con física simple, precalculadas cuadro a cuadro.

    `crear(rnd)` devuelve un dict con x, y, vx, vy, piso (y donde se posa) y
    opcionalmente giro, vaiven (amplitud de balanceo), mas cualquier dato
    que luego use quien las dibuja.
    """

    def __init__(self, n, t0, duracion, semilla, crear, gravedad=900.0, arrastre=0.0):
        rnd = random.Random(semilla)
        self.t0 = t0
        self.datos = []
        self.trayectorias = []
        pasos = 4
        dt = 1.0 / (FPS * pasos)
        for _ in range(n):
            p = crear(rnd)
            x, y, vx, vy = p["x"], p["y"], p["vx"], p["vy"]
            ang, giro = p.get("ang", 0.0), p.get("giro", 0.0)
            vaiven, fase = p.get("vaiven", 0.0), rnd.uniform(0, TAU)
            quieta, tau = False, 0.0
            vis_x = x
            tray = []
            for _ in range(int(duracion * FPS) + 2):
                tray.append((vis_x, y, ang, quieta))
                for _ in range(pasos):
                    if quieta:
                        break
                    tau += dt
                    vy += gravedad * dt
                    freno = math.exp(-arrastre * dt)
                    vx *= freno
                    vy *= freno
                    x += vx * dt
                    y += vy * dt
                    ang += giro * dt
                    vis_x = x + vaiven * math.sin(tau * 3.2 + fase) * (1 - math.exp(-2 * tau))
                    if vaiven:
                        ang = p.get("ang", 0.0) + 0.6 * math.cos(tau * 3.2 + fase)
                    if y >= p["piso"]:
                        y = p["piso"]
                        quieta = True
            self.datos.append(p)
            self.trayectorias.append(tray)

    def estados(self, t):
        """[(datos, x, y, ang, quieta), ...] en el instante t (vacío antes de t0)."""
        if t < self.t0:
            return []
        i = int((t - self.t0) * FPS)
        res = []
        for p, tray in zip(self.datos, self.trayectorias):
            x, y, ang, quieta = tray[min(i, len(tray) - 1)]
            res.append((p, x, y, ang, quieta))
        return res


# ---------------------------------------------------------------- render

def _contexto(sup):
    ctx = cairo.Context(sup)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    return ctx


def foto(dibujar, t, ruta):
    """Guarda un solo cuadro como PNG (útil para revisar escenas)."""
    sup = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    dibujar(_contexto(sup), t)
    sup.write_to_png(ruta)


def renderizar(dibujar, duracion, ruta_audio, ruta_salida):
    """Dibuja todos los cuadros y los codifica junto al audio en un .mp4 (H.264 + AAC)."""
    sup = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    comando = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", ruta_audio,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
        ruta_salida,
    ]
    proceso = subprocess.Popen(comando, stdin=subprocess.PIPE)
    total = int(round(duracion * FPS))
    for i in range(total):
        dibujar(_contexto(sup), i / FPS)
        sup.flush()
        proceso.stdin.write(sup.get_data())
    proceso.stdin.close()
    if proceso.wait() != 0:
        raise RuntimeError("ffmpeg falló al crear " + ruta_salida)
