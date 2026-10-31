"""Short vertical (9:16): «Cuando dejas a tu perro solo 5 minutos...».

El dueño sale, el perro activa el modo travieso: destroza un cojín, tira la
planta y llena la sala de papel higiénico. Cuando el dueño vuelve, pone
carita de «yo no fui».

Uso:  python3 perro_travieso.py   ->  videos/perro_travieso.mp4
"""
import math
import os
import tempfile

import sonido as S
from animacion import (
    AMARILLO, BLANCO, H, TINTA, W, Particulas, camara, clamp, destello, elipse,
    entra, estrella, foto, hx, lerp, linea, lineas_velocidad, nube_polvo, pintar, poligono,
    rect_redondo, renderizar, sale, sale_atras, sombra, subtitulo, suave, temblor, texto,
    tramo, trazo, vineta,
)

DUR = 25.5

# Colores de la sala
PARED, PARED_RAYA = hx("#F7E6C9"), hx("#F1DAB6")
ZOCALO, PISO, PISO_LINEA = hx("#FFF7EA"), hx("#CF9C68"), hx("#B9834F")
ALFOMBRA, ALFOMBRA_2 = hx("#6FA8C8"), hx("#8EC2DC")
SOFA, SOFA_OSC, SOFA_CLARO = hx("#D1495B"), hx("#A93545"), hx("#DD6474")
COJIN, COJIN_RAYA = hx("#F4C04E"), hx("#E3922B")
MADERA, MADERA_CLARA = hx("#8F5A32"), hx("#B97A47")
MACETA, MACETA_OSC = hx("#D9703C"), hx("#B3542A")
HOJA, HOJA_OSC, TIERRA = hx("#55B75A"), hx("#2E7D32"), hx("#6B4226")
PUERTA, PUERTA_OSC, LUZ, SILUETA = hx("#B5784A"), hx("#93603A"), hx("#FFF3C4"), hx("#1F2433")
CIELO, CIELO_2 = hx("#8FD3F4"), hx("#CDEFFF")
CORTINA, CORTINA_OSC = hx("#F2B134"), hx("#D9921B")

# Colores del perro
CAFE, CAFE_OSC, CREMA, OREJA = hx("#C98B4F"), hx("#9C6236"), hx("#F6E3C8"), hx("#6E4024")
NARIZ, LENGUA, BOCA = hx("#2A1C17"), hx("#F27C8C"), hx("#7A2230")
COLLAR, ORO, ROSA = hx("#E0413A"), hx("#F4C430"), hx("#F59AA8")
ROJO_TEXTO = hx("#FF4D4D")

# Momentos clave (segundos)
T_PORTAZO = 2.25
T_TRAVIESO = 4.1
T_AGARRA = 6.33
T_ROMPE = 8.2
T_CHOQUE = 12.35
T_VUELVE = 18.0
T_GRITO = 18.35
T_POSE = 18.7
T_ZOOM = 21.0


# =============================================================== perro

def collar(ctx, x, y):
    rect_redondo(ctx, x - 52, y - 11, 104, 22, 10)
    pintar(ctx, COLLAR, 5)
    elipse(ctx, x, y + 19, 11, 11)
    pintar(ctx, ORO, 4)


def pata(ctx, x, y, ang, color, largo):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.new_path()
    ctx.move_to(0, 0)
    ctx.line_to(0, largo - 12)
    trazo(ctx, color, 34, 5)
    elipse(ctx, 8, largo - 10, 27, 15)
    pintar(ctx, color, 5)
    ctx.restore()


def pluma(ctx, x, y, ang, tam=1.0, alpha=1.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.scale(tam, tam)
    ctx.new_path()
    ctx.move_to(-28, 0)
    ctx.curve_to(-12, -14, 16, -12, 28, 0)
    ctx.curve_to(14, 10, -12, 12, -28, 0)
    pintar(ctx, (1.0, 0.99, 0.96), 3, alpha, tinta=(0.62, 0.6, 0.58))
    linea(ctx, [(-34, 2), (22, -1)], 2.5, (0.62, 0.6, 0.58), alpha)
    ctx.restore()


def cojin(ctx, x, y, ang=0.0, escala=1.0, mitad=0):
    """Cojín amarillo. mitad=-1/1 dibuja solo el pedazo izquierdo/derecho (roto)."""
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.scale(escala, escala)
    if mitad:
        ctx.new_path()
        dientes = [(4, -70), (-8, -40), (10, -15), (-6, 12), (8, 38), (-4, 70)]
        lejos = 120 * mitad
        poligono(ctx, [(lejos, -80)] + dientes + [(lejos, 80)])
        ctx.clip()
    w, h = 70, 58

    def forma():
        ctx.new_path()
        ctx.move_to(-w, -h)
        ctx.curve_to(-w * 0.3, -h * 0.72, w * 0.3, -h * 0.72, w, -h)
        ctx.curve_to(w * 0.78, -h * 0.3, w * 0.78, h * 0.3, w, h)
        ctx.curve_to(w * 0.3, h * 0.72, -w * 0.3, h * 0.72, -w, h)
        ctx.curve_to(-w * 0.78, h * 0.3, -w * 0.78, -h * 0.3, -w, -h)
        ctx.close_path()

    forma()
    pintar(ctx, COJIN, 0)
    ctx.save()
    forma()
    ctx.clip()
    for yy in (-24, 24):
        ctx.rectangle(-w, yy - 9, 2 * w, 18)
        ctx.set_source_rgb(*COJIN_RAYA)
        ctx.fill()
    ctx.restore()
    forma()
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()
    if mitad:
        linea(ctx, [(4, -70), (-8, -40), (10, -15), (-6, 12), (8, 38), (-4, 70)], 5)
        for i in range(5):
            elipse(ctx, 0, -50 + i * 25, 14, 9)
            pintar(ctx, (1, 1, 0.97), 0)
    else:
        elipse(ctx, 0, 0, 7, 7)
        pintar(ctx, COJIN_RAYA, 4)
    ctx.restore()


def rollo(ctx, x, y, ang=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    rect_redondo(ctx, -30, -34, 60, 68, 8)
    pintar(ctx, BLANCO, 5)
    elipse(ctx, 0, -34, 30, 10)
    pintar(ctx, (0.93, 0.93, 0.93), 5)
    elipse(ctx, 0, -34, 11, 4)
    pintar(ctx, (0.65, 0.55, 0.45), 0)
    ctx.restore()


def aureola(ctx, x, y, k, t):
    if k <= 0:
        return
    y += 6 * math.sin(t * 3)
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(k, k)
    elipse(ctx, 0, 0, 66, 16)
    ctx.set_source_rgba(1, 0.92, 0.5, 0.35)
    ctx.set_line_width(26)
    ctx.stroke()
    elipse(ctx, 0, 0, 62, 14)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(16)
    ctx.stroke()
    elipse(ctx, 0, 0, 62, 14)
    ctx.set_source_rgb(*ORO)
    ctx.set_line_width(9)
    ctx.stroke()
    ctx.restore()


def cabeza(ctx, cx, cy, cara, t, objeto=None, con_pluma=False, halo=0.0):
    """Cabeza de frente con expresiones: ojos, cejas, boca y orejas animables."""
    ojos = cara.get("ojos", "normal")
    cejas = cara.get("cejas", "normal")
    boca = cara.get("boca", "sonrisa")
    mx, my = cara.get("mirada", (0.0, 0.0))
    oreja = cara.get("oreja", 0.0)
    caidas = cara.get("orejas_caidas", 0.0)
    parpadea = ojos in ("normal", "tierno") and (t % 3.3) < 0.11

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(cara.get("inclinacion", 0.0))

    elipse(ctx, 0, 0, 92, 84)
    pintar(ctx, CAFE)
    ctx.save()
    elipse(ctx, 0, 0, 92, 84)
    ctx.clip()
    elipse(ctx, 0, -58, 17, 44)
    ctx.set_source_rgb(*CREMA)
    ctx.fill()
    elipse(ctx, 40, -22, 36, 34, 0.3)
    ctx.set_source_rgb(*CAFE_OSC)
    ctx.fill()
    ctx.restore()
    elipse(ctx, 0, 0, 92, 84)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()

    # Orejas caídas
    for lado in (-1, 1):
        ctx.save()
        ctx.translate(lado * 74, -48)
        ctx.rotate(-lado * (0.2 - 0.18 * caidas) + oreja)
        ctx.new_path()
        ctx.move_to(-lado * 12, -6)
        ctx.curve_to(lado * 40, -14, lado * 48, 80, lado * 22, 112)
        ctx.curve_to(lado * 4, 130, -lado * 26, 108, -lado * 22, 60)
        ctx.curve_to(-lado * 20, 30, -lado * 22, 10, -lado * 12, -6)
        pintar(ctx, OREJA, 6)
        ctx.restore()

    # Hocico
    if boca == "lengua":
        elipse(ctx, 6, 66, 15, 21)
        pintar(ctx, LENGUA, 4)
        linea(ctx, [(6, 54), (6, 72)], 3, hx("#D85A6C"))
    elipse(ctx, 0, 36, 56, 40)
    pintar(ctx, CREMA, 5)

    # Ojos
    for lado in (-1, 1):
        ex, ey = lado * 34, -14
        if ojos == "cerrados" or parpadea:
            ctx.new_path()
            ctx.arc(ex, ey + 6, 15, math.pi * 1.15, math.pi * 1.85)
            ctx.set_source_rgb(*TINTA)
            ctx.set_line_width(6)
            ctx.stroke()
            continue
        grande = ojos == "tierno"
        rx, ry = (25, 29) if grande else (20, 24)
        elipse(ctx, ex, ey, rx, ry)
        pintar(ctx, BLANCO, 0)
        ctx.save()
        elipse(ctx, ex, ey, rx, ry)
        ctx.clip()
        pr = 16 if grande else (6 if ojos == "susto" else 12)
        px = ex + mx * (rx - pr * 0.75)
        py = ey + my * (ry - pr * 0.75)
        elipse(ctx, px, py, pr, pr * 1.1)
        pintar(ctx, NARIZ, 0)
        elipse(ctx, px - pr * 0.35, py - pr * 0.42, pr * 0.4, pr * 0.4)
        pintar(ctx, BLANCO, 0)
        if grande:
            elipse(ctx, px + pr * 0.4, py + pr * 0.45, pr * 0.2, pr * 0.2)
            pintar(ctx, BLANCO, 0)
        if ojos == "travieso":
            interior, exterior = ex - lado * rx, ex + lado * rx
            ctx.new_path()
            poligono(ctx, [(exterior, ey - ry * 0.6), (interior, ey - ry * 0.02),
                           (interior, ey - ry - 6), (exterior, ey - ry - 6)])
            ctx.set_source_rgb(*(CAFE_OSC if lado == 1 else CAFE))
            ctx.fill()
            linea(ctx, [(exterior, ey - ry * 0.6), (interior, ey - ry * 0.02)], 6)
        ctx.restore()
        elipse(ctx, ex, ey, rx, ry)
        ctx.set_source_rgb(*TINTA)
        ctx.set_line_width(5)
        ctx.stroke()

    # Cejas
    alturas = {"normal": (-50, -52), "malvado": (-40, -60), "tierno": (-62, -50), "sorpresa": (-68, -66)}
    dentro, fuera = alturas[cejas]
    for lado in (-1, 1):
        linea(ctx, [(lado * 34 - lado * 15, dentro), (lado * 34 + lado * 15, fuera)], 9)

    # Nariz
    elipse(ctx, 0, 12, 22, 15)
    pintar(ctx, NARIZ, 0)
    elipse(ctx, -7, 7, 8, 4)
    ctx.set_source_rgba(1, 1, 1, 0.6)
    ctx.fill()

    # Boca
    if boca in ("sonrisa", "lengua"):
        linea(ctx, [(0, 26), (0, 38)], 5)
        ctx.new_path()
        ctx.arc(-14, 38, 14, 0, math.pi)
        ctx.new_sub_path()
        ctx.arc(14, 38, 14, 0, math.pi)
        ctx.set_source_rgb(*TINTA)
        ctx.set_line_width(5)
        ctx.stroke()
    elif boca == "abierta":
        linea(ctx, [(0, 26), (0, 40)], 5)
        ctx.new_path()
        ctx.move_to(-30, 40)
        ctx.curve_to(-26, 94, 26, 94, 30, 40)
        ctx.close_path()
        pintar(ctx, BOCA, 0)
        ctx.save()
        ctx.move_to(-30, 40)
        ctx.curve_to(-26, 94, 26, 94, 30, 40)
        ctx.close_path()
        ctx.clip()
        elipse(ctx, 0, 80, 22, 16)
        pintar(ctx, LENGUA, 0)
        ctx.restore()
        ctx.move_to(-30, 40)
        ctx.curve_to(-26, 94, 26, 94, 30, 40)
        ctx.close_path()
        ctx.set_source_rgb(*TINTA)
        ctx.set_line_width(5)
        ctx.stroke()
    elif boca == "malvada":
        ctx.new_path()
        ctx.move_to(-46, 32)
        ctx.curve_to(-20, 76, 24, 72, 48, 24)
        ctx.curve_to(22, 46, -18, 50, -46, 32)
        pintar(ctx, BOCA, 5)
        for a, b, c in (((-26, 44), (-16, 45), (-21, 56)), ((14, 43), (24, 40), (20, 52))):
            ctx.new_path()
            poligono(ctx, [a, b, c])
            pintar(ctx, BLANCO, 2.5)
    elif boca == "o":
        linea(ctx, [(0, 26), (0, 38)], 5)
        elipse(ctx, 0, 54, 11, 14)
        pintar(ctx, BOCA, 5)

    if cara.get("rubor"):
        for lado in (-1, 1):
            elipse(ctx, lado * 60, 24, 17, 9)
            ctx.set_source_rgba(*ROSA, 0.75)
            ctx.fill()

    if objeto:
        objeto(ctx, 0, 60)
    if con_pluma:
        pluma(ctx, 34, -88, -0.6, 1.0)
    aureola(ctx, 0, -138, halo, t)
    ctx.restore()


def _de_pie(ctx, t, cara, fase, corre, cola, patas_del, extras):
    bob = -10 * abs(math.sin(fase)) * corre
    giro = 0.6 * corre
    pata(ctx, 72, -125 + bob, giro * math.sin(fase + math.pi) + patas_del, CAFE_OSC, 125)
    pata(ctx, -78, -125 + bob, giro * math.sin(fase), CAFE_OSC, 125)
    ctx.save()
    ctx.translate(-112, -178 + bob)
    ctx.rotate(-2.25 + cola)
    ctx.new_path()
    ctx.move_to(0, 0)
    ctx.curve_to(35, -14, 70, 4, 100, -16)
    trazo(ctx, CAFE, 24, 5)
    ctx.restore()

    elipse(ctx, 0, -158 + bob, 130, 70)
    pintar(ctx, CAFE, 0)
    ctx.save()
    elipse(ctx, 0, -158 + bob, 130, 70)
    ctx.clip()
    elipse(ctx, 100, -130 + bob, 62, 58)
    ctx.set_source_rgb(*CREMA)
    ctx.fill()
    elipse(ctx, -35, -215 + bob, 58, 34)
    ctx.set_source_rgb(*CAFE_OSC)
    ctx.fill()
    ctx.restore()
    elipse(ctx, 0, -158 + bob, 130, 70)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()

    pata(ctx, 98, -120 + bob, giro * math.sin(fase) + patas_del, CAFE, 120)
    pata(ctx, -52, -120 + bob, giro * math.sin(fase + math.pi), CAFE, 120)
    collar(ctx, 118, -188 + bob)
    cabeza(ctx, 120, -268 + bob, cara, t, **extras)


def _sentado(ctx, t, cara, cola, extras):
    ctx.save()
    ctx.translate(-75, -22)
    ctx.rotate(math.pi - 0.15 + cola * 0.5)
    ctx.new_path()
    ctx.move_to(0, 0)
    ctx.curve_to(30, -10, 60, 6, 92, -6)
    trazo(ctx, CAFE, 24, 5)
    ctx.restore()

    pata(ctx, 52, -150, 0.03, CAFE_OSC, 150)
    elipse(ctx, -12, -135, 86, 106, -0.15)
    pintar(ctx, CAFE, 0)
    ctx.save()
    elipse(ctx, -12, -135, 86, 106, -0.15)
    ctx.clip()
    elipse(ctx, 42, -150, 44, 72)
    ctx.set_source_rgb(*CREMA)
    ctx.fill()
    elipse(ctx, -58, -175, 40, 46)
    ctx.set_source_rgb(*CAFE_OSC)
    ctx.fill()
    ctx.restore()
    elipse(ctx, -12, -135, 86, 106, -0.15)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()

    elipse(ctx, -52, -55, 64, 54, -0.3)
    pintar(ctx, CAFE)
    elipse(ctx, -2, -12, 44, 15)
    pintar(ctx, CAFE)
    pata(ctx, 22, -150, -0.02, CAFE, 150)
    collar(ctx, 26, -192)
    cabeza(ctx, 26, -272, cara, t, **extras)


def perro(ctx, t, x, y, s=1.0, dir=1, pose="sentado", cara=None, fase=0.0, corre=0.0,
          cola=0.0, rot=0.0, salto=0.0, aplastar=0.0, patas_del=0.0, objeto=None,
          con_pluma=False, halo=0.0):
    """Perro con los pies en (x, y). dir=1 mira a la derecha y -1 a la izquierda."""
    cara = dict(cara or {})
    mx, my = cara.get("mirada", (0.0, 0.0))
    cara["mirada"] = (mx * dir, my)
    sombra(ctx, x, y, 130 * s * (1 - 0.35 * clamp(salto / 120)), 18 * s)
    ctx.save()
    ctx.translate(x, y - salto)
    ctx.scale(s * dir, s)
    if aplastar:
        ctx.scale(1 + aplastar * 0.5, 1 - aplastar)
    if rot:
        ctx.translate(-60, 0)
        ctx.rotate(rot)
        ctx.translate(60, 0)
    extras = dict(objeto=objeto, con_pluma=con_pluma, halo=halo)
    if pose == "sentado":
        _sentado(ctx, t, cara, cola, extras)
    else:
        _de_pie(ctx, t, cara, fase, corre, cola, patas_del, extras)
    ctx.restore()


def cabeza_mundo(e):
    """Centro aproximado de la cabeza del perro en coordenadas de la pantalla."""
    hx_, hy_ = (26, -272) if e["pose"] == "sentado" else (120, -268)
    return e["x"] + e["dir"] * e["s"] * hx_, e["y"] - e.get("salto", 0) + e["s"] * hy_


# =============================================================== guion del perro

def recorrido_papel(t):
    """Posición del perro mientras corre con el papel higiénico (t en 15.0..17.6)."""
    if t < 16.5:
        k = tramo(t, 15.0, 16.5)
        return lerp(-260, 1320, k), 1770 + 45 * math.sin((t - 15.0) * 7), 1, 1.1
    k = tramo(t, 16.5, 17.6)
    return lerp(1320, 560, sale(k)), 1650 + 30 * math.sin((t - 16.5) * 8) * (1 - k), -1, lerp(1.1, 1.05, k)


def estado_perro(t):
    e = dict(x=560, y=1650, s=1.05, dir=1, pose="sentado", cara={}, fase=t * 20, corre=0.0,
             cola=0.0, rot=0.0, salto=0.0, aplastar=0.0, patas_del=0.0, objeto=None,
             con_pluma=t > 8.6, halo=0.0)
    meneo = math.sin(t * 14)

    if t < 3.0:  # El dueño se va
        if t < T_PORTAZO:
            e.update(cara=dict(boca="lengua", mirada=(0.85, -0.25)), cola=0.55 * meneo)
        else:
            k = tramo(t, T_PORTAZO, T_PORTAZO + 0.25)
            e.update(cara=dict(boca="sonrisa", mirada=(0.85, -0.1), orejas_caidas=1.0),
                     cola=0.1 * math.sin(t * 3), salto=30 * math.sin(math.pi * k))

    elif t < 5.4:  # Mira a los lados... y se activa el modo travieso
        if t < T_TRAVIESO:
            mirada = -0.9 if t < 3.6 else 0.9
            e.update(cara=dict(boca="sonrisa", mirada=(mirada, 0.0), inclinacion=-0.1 * mirada * e["dir"]))
        else:
            e.update(cara=dict(ojos="travieso", cejas="malvado", boca="malvada", mirada=(0.0, 0.15)),
                     cola=0.35 * math.sin(t * 7))

    elif t < 10.0:  # Minuto 1: el cojín
        travieso = dict(ojos="travieso", cejas="malvado", boca="lengua", mirada=(0.6, 0.0))
        if t < 6.2:
            k = suave(tramo(t, 5.4, 6.2))
            e.update(x=lerp(560, 390, k), y=lerp(1650, 1490, k), s=lerp(1.05, 0.95, k), dir=-1,
                     pose="de_pie", corre=1.0, cara=travieso, cola=0.4 * meneo)
        elif t < 6.5:
            e.update(x=390, y=1490, s=0.95, dir=-1, pose="de_pie", salto=95 * math.sin(math.pi * tramo(t, 6.2, 6.5)),
                     cara=dict(travieso, boca="abierta"), patas_del=-0.5)
        elif t < T_ROMPE:
            sacudida = math.sin(t * 28)
            e.update(x=390, y=1490, s=0.95, dir=-1, pose="de_pie",
                     cara=dict(ojos="cerrados", cejas="malvado", boca="sonrisa",
                               inclinacion=0.4 * sacudida, oreja=0.5 * math.sin(t * 28 - 0.8)),
                     cola=0.6 * math.sin(t * 20))
        else:
            k = tramo(t, T_ROMPE, T_ROMPE + 0.25)
            e.update(x=390, y=1490, s=0.95, dir=-1,
                     cara=dict(boca="lengua", mirada=(0.3 * math.sin(t * 2), lerp(-0.8, 0.5, tramo(t, 8.4, 10.0)))),
                     cola=0.5 * meneo, aplastar=0.12 * math.sin(math.pi * k))
        if T_AGARRA <= t < T_ROMPE:
            e["objeto"] = lambda ctx, x, y: cojin(ctx, x, y + 14, 0.15, 0.85)

    elif t < 14.2:  # Minuto 2: la planta
        travieso = dict(ojos="travieso", cejas="malvado", boca="lengua", mirada=(0.6, -0.4))
        if t < 10.8:
            k = suave(tramo(t, 10.0, 10.8))
            e.update(x=lerp(390, 555, k), y=lerp(1490, 1500, k), s=lerp(0.95, 0.98, k), dir=1,
                     pose="de_pie", corre=1.0, cara=travieso, cola=0.4 * meneo)
        elif t < 12.35:
            sube = sale(tramo(t, 10.8, 11.1)) * (1 - suave(tramo(t, 12.0, 12.3)))
            e.update(x=555, y=1500, s=0.98, dir=1, pose="de_pie", rot=-0.42 * sube, patas_del=-0.9 * sube,
                     cara=dict(ojos="travieso", cejas="malvado", boca="malvada", mirada=(0.7, -0.7)),
                     cola=0.5 * meneo)
        elif t < 12.65:
            e.update(x=555, y=1500, s=0.98, dir=1, pose="de_pie",
                     salto=45 * math.sin(math.pi * tramo(t, T_CHOQUE, 12.65)),
                     cara=dict(ojos="susto", cejas="sorpresa", boca="o", mirada=(0.8, 0.0)))
        elif t < 13.4:
            e.update(x=555, y=1500, s=0.98, dir=1,
                     cara=dict(ojos="normal", cejas="sorpresa", boca="o", mirada=(0.0, 0.0)))
        else:
            e.update(x=555, y=1500, s=0.98, dir=1,
                     cara=dict(ojos="travieso", cejas="malvado", boca="malvada", mirada=(0.0, 0.1)),
                     cola=0.5 * meneo)

    elif t < T_VUELVE:  # Minuto 3: el papel higiénico
        feliz = dict(ojos="cerrados", cejas="normal", boca="sonrisa")
        if t < 14.6:
            k = entra(tramo(t, 14.2, 14.6))
            e.update(x=lerp(555, -260, k), y=lerp(1500, 1560, k), s=0.98, dir=-1, pose="de_pie",
                     corre=1.0, cara=dict(ojos="travieso", cejas="malvado", boca="lengua"))
        elif t < 15.0:
            e.update(x=-600, y=1600)
        else:
            x, y, d, s = recorrido_papel(min(t, 17.6))
            corre = 1.0 - tramo(t, 17.3, 17.6)
            e.update(x=x, y=y, s=s, dir=d, pose="de_pie", corre=corre, cara=feliz,
                     cola=0.6 * meneo, objeto=lambda ctx, x, y: rollo(ctx, x, y + 6, 0.1))

    elif t < T_ZOOM:  # ¡¿Quién hizo esto?!
        if t < T_POSE:
            e.update(x=560, y=1650, s=1.05, dir=-1, pose="de_pie",
                     salto=55 * math.sin(math.pi * tramo(t, T_VUELVE, T_VUELVE + 0.3)),
                     cara=dict(ojos="susto", cejas="sorpresa", boca="o", mirada=(-1.0, -0.3), oreja=0.0))
        else:
            e.update(cara=dict(ojos="tierno", cejas="tierno", boca="sonrisa", rubor=True, mirada=(0.0, -0.3)),
                     cola=0.25 * math.sin(t * 5), halo=sale_atras(tramo(t, 19.4, 19.8)))

    else:  # Yo no fui...
        e.update(cara=dict(ojos="tierno", cejas="tierno", boca="sonrisa", rubor=True,
                           mirada=(0.0, -0.3), inclinacion=0.12 * math.sin(t * 1.6)),
                 cola=0.25 * math.sin(t * 5), halo=1.0)
    return e


# =============================================================== escenario

def fondo(ctx, t):
    # Se pinta más allá de los bordes para que los temblores y el zoom no dejen huecos
    ctx.rectangle(-300, -300, W + 600, 1630)
    ctx.set_source_rgb(*PARED)
    ctx.fill()
    for x in range(-270, W + 300, 90):
        ctx.rectangle(x, -300, 45, 1630)
        ctx.set_source_rgb(*PARED_RAYA)
        ctx.fill()

    # Ventana con nubes
    ctx.rectangle(140, 560, 290, 320)
    ctx.set_source_rgb(*CIELO)
    ctx.fill()
    ctx.save()
    ctx.rectangle(140, 560, 290, 320)
    ctx.clip()
    for i, (nx, ny, r) in enumerate(((150, 650, 34), (330, 760, 28), (520, 640, 30))):
        x = 140 + ((nx + t * 14 + i * 40) % 420) - 60
        for dx, dy, rr in ((-r, 6, r * 0.8), (0, 0, r), (r, 8, r * 0.75)):
            elipse(ctx, x + dx, ny + dy, rr * 1.2, rr)
            ctx.set_source_rgb(*CIELO_2)
            ctx.fill()
    ctx.restore()
    rect_redondo(ctx, 140, 560, 290, 320, 6)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(22)
    ctx.stroke()
    rect_redondo(ctx, 140, 560, 290, 320, 6)
    ctx.set_source_rgb(*BLANCO)
    ctx.set_line_width(12)
    ctx.stroke()
    linea(ctx, [(285, 560), (285, 880)], 10, BLANCO)
    linea(ctx, [(140, 720), (430, 720)], 10, BLANCO)
    rect_redondo(ctx, 115, 880, 340, 28, 8)
    pintar(ctx, BLANCO, 5)
    for lado, x in ((-1, 120), (1, 450)):
        ctx.new_path()
        ctx.move_to(x - 40, 540)
        ctx.line_to(x + 40, 540)
        ctx.curve_to(x + 30 - lado * 20, 700, x + 40, 820, x + 34 + lado * 10, 930)
        ctx.line_to(x - 34 + lado * 10, 930)
        ctx.curve_to(x - 40, 820, x - 30 - lado * 20, 700, x - 40, 540)
        pintar(ctx, CORTINA, 5)
        linea(ctx, [(x, 560), (x + lado * 6, 910)], 4, CORTINA_OSC)
    rect_redondo(ctx, 70, 528, 430, 20, 10)
    pintar(ctx, MADERA, 5)

    # Cuadro con un hueso
    rect_redondo(ctx, 600, 600, 180, 140, 6)
    pintar(ctx, hx("#BFE3C8"), 0)
    ctx.save()
    ctx.translate(690, 670)
    ctx.rotate(-0.35)
    rect_redondo(ctx, -45, -10, 90, 20, 10)
    for dx in (-45, 45):
        for dy in (-12, 12):
            elipse(ctx, dx, dy, 15, 15)
    pintar(ctx, BLANCO, 5)
    ctx.restore()
    rect_redondo(ctx, 600, 600, 180, 140, 6)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(20)
    ctx.stroke()
    rect_redondo(ctx, 600, 600, 180, 140, 6)
    ctx.set_source_rgb(*MADERA_CLARA)
    ctx.set_line_width(11)
    ctx.stroke()

    # Piso de madera
    ctx.rectangle(-300, 1330, W + 600, H)
    ctx.set_source_rgb(*PISO)
    ctx.fill()
    y, alto, fila = 1345, 42, 0
    while y < H + 600:
        linea(ctx, [(-300, y), (W + 300, y)], 4, PISO_LINEA)
        desfase = (fila * 170) % 340
        for x in range(-desfase - 340, W + 300, 340):
            linea(ctx, [(x, y), (x, y + alto)], 4, PISO_LINEA)
        y += alto
        alto += 9
        fila += 1
    rect_redondo(ctx, -310, 1305, W + 620, 40, 4)
    pintar(ctx, ZOCALO, 5)

    elipse(ctx, 560, 1690, 440, 125)
    pintar(ctx, ALFOMBRA, 6)
    elipse(ctx, 560, 1690, 370, 98)
    ctx.set_source_rgb(*ALFOMBRA_2)
    ctx.set_line_width(14)
    ctx.stroke()


def silueta(ctx, x, base, t, pose, alpha=1.0):
    """Silueta oscura del dueño en la puerta."""
    ctx.save()
    ctx.set_source_rgba(*SILUETA, alpha)
    elipse(ctx, x, base - 420, 40, 46)
    ctx.fill()
    ctx.new_path()
    poligono(ctx, [(x - 78, base - 360), (x + 78, base - 360), (x + 56, base - 200), (x - 56, base - 200)])
    ctx.fill()
    rect_redondo(ctx, x - 60, base - 380, 120, 60, 28)
    ctx.fill()
    for lado in (-1, 1):
        ctx.rectangle(x + lado * 30 - 23, base - 215, 46, 215)
        ctx.fill()
    ctx.set_line_width(32)
    if pose == "jarras":
        for lado in (-1, 1):
            linea(ctx, [(x + lado * 66, base - 350), (x + lado * 118, base - 275), (x + lado * 54, base - 215)],
                  32, SILUETA, alpha)
    else:
        linea(ctx, [(x - 66, base - 350), (x - 80, base - 250), (x - 70, base - 180)], 32, SILUETA, alpha)
        mano = 26 * math.sin(t * 13)
        linea(ctx, [(x + 66, base - 350), (x + 120, base - 420), (x + 110 + mano, base - 500)], 32, SILUETA, alpha)
    ctx.restore()


def apertura_puerta(t):
    if t < 1.9:
        return 1.0
    if t < T_PORTAZO:
        return 1 - entra(tramo(t, 1.9, T_PORTAZO))
    if t < T_VUELVE:
        return 0.0
    return sale(tramo(t, T_VUELVE, T_VUELVE + 0.35))


def puerta(ctx, t):
    a = apertura_puerta(t)
    x0, x1, y0, y1 = 830, 1050, 790, 1330
    if a > 0:
        ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
        ctx.set_source_rgb(*LUZ)
        ctx.fill()
        if t < 2.2:
            sale_k = tramo(t, 1.4, 1.9)
            silueta(ctx, 940 + 60 * sale_k, y1, t, "adios", 1 - sale_k)
        elif t >= T_VUELVE:
            silueta(ctx, 940, y1, t, "jarras", tramo(t, T_VUELVE, T_VUELVE + 0.2))
    rect_redondo(ctx, x0 - 18, y0 - 18, x1 - x0 + 36, y1 - y0 + 18, 6)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()
    ancho = (x1 - x0) * (1 - 0.86 * a)
    borde = x1 - ancho
    ctx.new_path()
    poligono(ctx, [(x1, y0), (borde, y0 - 30 * a), (borde, y1 + 30 * a), (x1, y1)])
    pintar(ctx, PUERTA, 6)
    if a < 0.5:
        for yy in (840, 1080):
            rect_redondo(ctx, borde + ancho * 0.18, yy, ancho * 0.64, 190, 8)
            pintar(ctx, PUERTA_OSC, 4)
        elipse(ctx, borde + 26, 1070, 12, 12)
        pintar(ctx, ORO, 4)


def luz_en_piso(ctx, t):
    a = apertura_puerta(t)
    if a <= 0:
        return
    ctx.new_path()
    poligono(ctx, [(840, 1330), (1045, 1330), (1180, H), (640, H)])
    ctx.set_source_rgba(*LUZ, 0.32 * a)
    ctx.fill()


def sofa(ctx):
    rect_redondo(ctx, 55, 1005, 430, 240, 40)
    pintar(ctx, SOFA)
    for x in (80, 275):
        rect_redondo(ctx, x, 1030, 185, 170, 30)
        pintar(ctx, SOFA_CLARO, 5)
    rect_redondo(ctx, 45, 1195, 450, 70, 24)
    pintar(ctx, SOFA)
    rect_redondo(ctx, 45, 1250, 450, 85, 20)
    pintar(ctx, SOFA_OSC)
    for x in (20, 430):
        rect_redondo(ctx, x, 1110, 90, 225, 34)
        pintar(ctx, SOFA)
    for x in (60, 460):
        ctx.rectangle(x, 1335, 22, 22)
        pintar(ctx, MADERA, 4)


def planta(ctx, x, y, ang=0.0, rota=False):
    """Maceta con planta; (x, y) es el centro de la base."""
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    hojas = ((-0.9, 95), (-0.45, 120), (0.0, 135), (0.45, 120), (0.9, 95), (-0.2, 105), (0.25, 108))
    for i, (a, largo) in enumerate(hojas):
        ctx.save()
        ctx.translate(0, -80)
        ctx.rotate(a + (0.6 if rota else 0.0) * (i % 2 * 2 - 1) * 0.3)
        elipse(ctx, 0, -largo / 2, 20, largo / 2)
        pintar(ctx, HOJA if i % 2 else HOJA_OSC, 5)
        linea(ctx, [(0, -10), (0, -largo + 14)], 3, HOJA_OSC if i % 2 else HOJA)
        ctx.restore()
    if not rota:
        ctx.new_path()
        poligono(ctx, [(-36, 0), (36, 0), (47, -72), (-47, -72)])
        pintar(ctx, MACETA)
        rect_redondo(ctx, -54, -92, 108, 24, 6)
        pintar(ctx, MACETA_OSC)
    ctx.restore()


def mesa(ctx, ang):
    ctx.save()
    ctx.translate(670, 1390)
    ctx.rotate(ang)
    for lx in (-60, 50):
        ctx.rectangle(lx, -230, 14, 230)
        pintar(ctx, MADERA, 5)
    rect_redondo(ctx, -82, -250, 164, 26, 6)
    pintar(ctx, MADERA_CLARA, 5)
    ctx.restore()


def estado_planta(t):
    """(x, y, ángulo) de la maceta antes de romperse, o None si ya se rompió."""
    if t < 11.1:
        return 670, 1140, 0.0
    if t < 11.6:
        return 670, 1140, 0.13 * math.sin((t - 11.1) * 32) * (1 - tramo(t, 11.1, 11.6) * 0.5)
    if t < 11.9:
        k = suave(tramo(t, 11.6, 11.9))
        return lerp(670, 735, k), 1140, 0.55 * k
    if t < T_CHOQUE:
        k = tramo(t, 11.9, T_CHOQUE)
        return lerp(735, 790, k), lerp(1140, 1490, k * k), lerp(0.55, 2.3, k)
    return None


def _crear_pluma(rnd):
    return dict(x=276 + rnd.uniform(-30, 30), y=1290 + rnd.uniform(-30, 30),
                vx=rnd.uniform(-520, 520), vy=rnd.uniform(-950, -150), piso=rnd.uniform(1385, 1880),
                vaiven=rnd.uniform(18, 50), ang=rnd.uniform(-0.6, 0.6), tam=rnd.uniform(0.65, 1.15))


def _crear_tierra(rnd):
    return dict(x=790 + rnd.uniform(-20, 20), y=1470, vx=rnd.uniform(-380, 380), vy=rnd.uniform(-700, -220),
                piso=rnd.uniform(1462, 1545), giro=rnd.uniform(-6, 6), tam=rnd.uniform(6, 14),
                color=TIERRA if rnd.random() < 0.7 else hx("#8A5A3A"))


def _crear_pedazo(rnd):
    return dict(x=790, y=1465, vx=rnd.uniform(-320, 320), vy=rnd.uniform(-480, -220),
                piso=rnd.uniform(1478, 1530), giro=rnd.uniform(-9, 9),
                forma=[(rnd.uniform(-30, -10), rnd.uniform(-22, -8)), (rnd.uniform(10, 30), rnd.uniform(-20, -6)),
                       (rnd.uniform(8, 26), rnd.uniform(6, 18)), (rnd.uniform(-24, -6), rnd.uniform(8, 20))])


PLUMAS = Particulas(70, T_ROMPE, DUR - T_ROMPE, 11, _crear_pluma, gravedad=320, arrastre=2.3)
TIERRA_P = Particulas(36, T_CHOQUE, DUR - T_CHOQUE, 23, _crear_tierra, gravedad=2300, arrastre=0.4)
PEDAZOS = Particulas(4, T_CHOQUE, DUR - T_CHOQUE, 5, _crear_pedazo, gravedad=2000, arrastre=0.3)


def mitades_cojin(ctx, t):
    if t < T_ROMPE:
        return
    for lado, x1, y1, a1 in ((-1, 215, 1540, -0.9), (1, 335, 1565, 0.7)):
        k = tramo(t, T_ROMPE, T_ROMPE + 0.45)
        x = lerp(276 + lado * 25, x1, k)
        y = lerp(1290, y1, k * k)
        cojin(ctx, x, y, a1 * k, 0.85, mitad=lado)


def restos_planta(ctx, t):
    if t < T_CHOQUE:
        return
    elipse(ctx, 800, 1500, 78 * sale(tramo(t, T_CHOQUE, T_CHOQUE + 0.2)), 20)
    pintar(ctx, TIERRA, 4)
    planta(ctx, 815, 1492, 1.25, rota=True)
    for p, x, y, ang, _ in PEDAZOS.estados(t):
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang)
        ctx.new_path()
        poligono(ctx, p["forma"])
        pintar(ctx, MACETA, 5)
        ctx.restore()


def tierra_volando(ctx, t):
    for p, x, y, ang, _ in TIERRA_P.estados(t):
        elipse(ctx, x, y, p["tam"], p["tam"] * 0.8, ang)
        pintar(ctx, p["color"], 0)


def plumas(ctx, t, en_el_piso):
    for p, x, y, ang, quieta in PLUMAS.estados(t):
        if quieta == en_el_piso:
            pluma(ctx, x, y, ang, p["tam"])


def boca_corriendo(x, y, d, s):
    return x + d * s * 120, y - s * 208


def papel(ctx, t):
    """Tira de papel higiénico que el perro va dejando por toda la sala."""
    if t < 15.0:
        return
    puntos = []
    tau = 15.0
    while tau <= min(t, 17.6):
        puntos.append(boca_corriendo(*recorrido_papel(tau)))
        tau += 1 / 60
    if t >= T_VUELVE:
        bx, by = boca_corriendo(*recorrido_papel(17.6))
        k = entra(tramo(t, T_VUELVE + 0.05, T_VUELVE + 0.35))
        puntos.append((bx + 30 * k, lerp(by, 1700, k)))
    if len(puntos) < 2:
        return
    ctx.new_path()
    ctx.move_to(*puntos[0])
    for p in puntos[1:]:
        ctx.line_to(*p)
    trazo(ctx, BLANCO, 30, 3, tinta=(0.72, 0.72, 0.72))
    if t >= T_VUELVE:
        rollo(ctx, puntos[-1][0], puntos[-1][1] - 20, 1.3 * tramo(t, T_VUELVE, T_VUELVE + 0.35))


def destellos(ctx, x, y, t):
    for i, (dx, dy) in enumerate(((-150, -60), (140, -110), (-120, -230), (160, 20), (40, -300))):
        k = 0.5 + 0.5 * math.sin(t * 5 + i * 1.7)
        estrella(ctx, x + dx, y + dy, 16 + 14 * k, AMARILLO, 0.4 + 0.6 * k, t * 0.8 + i)


# =============================================================== cuadro completo

def dibujar(ctx, t):
    ctx.save()
    zoom, cx, cy = 1.0, W / 2, H / 2
    if T_TRAVIESO <= t < 5.4:
        k = sale(tramo(t, T_TRAVIESO, T_TRAVIESO + 0.25))
        zoom, cx, cy = 1 + 0.3 * k, lerp(W / 2, 586, k), lerp(H / 2, 1380, k)
    elif t >= T_ZOOM:
        k = suave(tramo(t, T_ZOOM, T_ZOOM + 0.7))
        zoom, cx, cy = lerp(1, 2.0, k), lerp(W / 2, 590, k), lerp(H / 2, 1330, k)
    dx = dy = 0.0
    for t0, fuerza, dur in ((T_PORTAZO, 14, 0.25), (T_CHOQUE, 22, 0.35), (T_GRITO, 26, 0.5)):
        if t0 <= t < t0 + dur:
            dx, dy = temblor(t, fuerza * (1 - (t - t0) / dur))
    camara(ctx, zoom, cx, cy, dx, dy)

    fondo(ctx, t)
    puerta(ctx, t)
    sofa(ctx)
    if t < T_AGARRA:
        cojin(ctx, 300, 1168, 0.2)
    estado = estado_planta(t)
    if t < 11.6:
        mesa(ctx, 0.035 * math.sin((t - 11.1) * 40) if 11.1 <= t < 11.6 else 0.0)
        if estado:
            planta(ctx, *estado)
    else:
        mesa(ctx, 0.0)
        if estado:
            planta(ctx, *estado)
    luz_en_piso(ctx, t)
    restos_planta(ctx, t)
    mitades_cojin(ctx, t)
    plumas(ctx, t, en_el_piso=True)
    papel(ctx, t)

    e = estado_perro(t)
    if T_ROMPE - 1.7 < t < T_ROMPE and t > 6.5:
        hx_, hy_ = cabeza_mundo(e)
        for lado in (-1, 1):
            lineas_velocidad(ctx, hx_ + lado * 150, hy_ + 40, -lado, 0.8, 50, 3, 30)
    if e["corre"] > 0.5:
        lineas_velocidad(ctx, e["x"] - e["dir"] * 120 * e["s"], e["y"] - 150 * e["s"], e["dir"], 0.7)
    perro(ctx, t, **e)

    plumas(ctx, t, en_el_piso=False)
    tierra_volando(ctx, t)
    hx_, hy_ = cabeza_mundo(e)
    if T_VUELVE <= t < T_POSE:
        texto(ctx, "!", hx_ - 10, hy_ - 150, 130 * sale_atras(tramo(t, T_VUELVE, T_VUELVE + 0.2)),
              color=ROJO_TEXTO, con_sombra=False)
    if 12.4 <= t < 13.4:
        texto(ctx, "Ups...", hx_ + 140, hy_ - 120, 60 * sale_atras(tramo(t, 12.4, 12.65)), con_sombra=False)
    nube_polvo(ctx, 560, 1560, tramo(t, T_POSE - 0.05, T_POSE + 0.5), 1.5)
    if t >= 19.4:
        destellos(ctx, hx_, hy_, t)
    ctx.restore()

    # Efectos de pantalla
    if T_TRAVIESO <= t < 5.4:
        vineta(ctx, (0.85, 0.05, 0.05), 0.55 * (0.6 + 0.4 * math.sin((t - T_TRAVIESO) * 12)))
    destello(ctx, 0.7 * (1 - tramo(t, T_ROMPE, T_ROMPE + 0.12)) if t >= T_ROMPE else 0.0)
    if T_VUELVE <= t < T_ZOOM:
        vineta(ctx, (0, 0, 0), 0.5 * tramo(t, T_VUELVE, T_VUELVE + 0.3))

    # Subtítulos
    subtitulo(ctx, t, 0.15, 3.0, "Cuando dejas a tu perro *solo 5 minutos*...")
    subtitulo(ctx, t, T_TRAVIESO, 5.4, "Modo travieso: *ACTIVADO*", tam=88)
    subtitulo(ctx, t, 5.5, 10.0, "Minuto 1: *el cojín*")
    subtitulo(ctx, t, 10.0, 14.2, "Minuto 2: *la planta*")
    subtitulo(ctx, t, 14.9, T_VUELVE, "Minuto 3: *el papel higiénico*")
    subtitulo(ctx, t, T_GRITO, 20.9, "*¿¡QUIÉN HIZO ESTO!?*", tam=96, resalte=ROJO_TEXTO)
    subtitulo(ctx, t, 21.3, 23.5, "Yo no fui...", tam=92)
    subtitulo(ctx, t, 23.6, DUR, "¿Tu perro también es *así*?")


# =============================================================== sonido

def audio(ruta):
    b = S.pista(DUR)
    n = S.nota

    # Intro alegre de ukelele hasta el portazo
    for i, acorde in enumerate((("C4", "E4", "G4", "C5"), ("A3", "E4", "A4", "C5"), ("F3", "C4", "F4", "A4"),
                                ("G3", "D4", "G4", "B4"), ("C4", "E4", "G4", "C5"))):
        for j, nota in enumerate(acorde):
            S.poner(b, S.pulsado(n(nota), 0.4, 0.6, 7), i * 0.45 + j * 0.014, 0.22)
    for tt, nota in ((0.0, "E5"), (0.22, "G5"), (0.45, "A5"), (0.67, "G5"), (0.9, "E5"), (1.12, "C5"),
                     (1.35, "D5"), (1.57, "E5"), (1.8, "C5")):
        S.poner(b, S.pulsado(n(nota), 0.45, 0.7, 6), tt, 0.45)
    S.poner(b, S.ladrido(1.15), 0.5, 0.45)
    S.poner(b, S.portazo(), T_PORTAZO, 1.0)

    # De puntillas... y el golpe malvado
    for i, nota in enumerate(("E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3")):
        S.poner(b, S.pulsado(n(nota), 0.25, 0.5, 9), 2.95 + i * 0.14, 0.5)
    for tt in (T_TRAVIESO, T_TRAVIESO + 0.22):
        S.poner(b, S.pulsado(n("A2"), 0.9, 0.9, 3), tt, 1.0)
        S.poner(b, S.pulsado(n("D#3"), 0.9, 0.9, 3), tt, 0.8)

    # Música «a escondidas» mientras hace sus travesuras
    pulso = 60 / 140
    bajos = ["A2", "E3", "A2", "E3", "F2", "C3", "E2", "B2"]
    melodia = ["A4", None, "C5", None, "B4", "A4", "G#4", None, "A4", None, "E5", None, "D5", "C5", "B4", None]
    inicio = 4.75
    tt, i = inicio, 0
    while tt < T_VUELVE - 0.05:
        S.poner(b, S.pulsado(n(bajos[i % 8]), 0.3, 0.6, 9), tt, 0.55)
        if i % 2 == 1:
            S.poner(b, S.chasquido(), tt, 0.5)
        for j in range(2):
            nota = melodia[(i * 2 + j) % 16]
            if nota and tt + j * pulso / 2 < T_VUELVE - 0.05:
                S.poner(b, S.pulsado(n(nota) * (2 if (i // 16) % 2 else 1), 0.18, 0.8, 14), tt + j * pulso / 2, 0.32)
        S.poner(b, S.platillo(), tt + pulso / 2, 0.25)
        tt += pulso
        i += 1

    # Minuto 1: el cojín
    S.poner(b, S.ladrido(), 5.45, 0.8)
    S.poner(b, S.pasitos(8, 0.1), 5.45, 0.5)
    S.poner(b, S.boing(), 6.2, 0.45)
    S.poner(b, S.pop(), T_AGARRA, 0.4)
    S.poner(b, S.grunido(T_ROMPE - 6.5), 6.5, 0.6)
    S.poner(b, S.rasgado(), T_ROMPE, 1.0)
    S.poner(b, S.puf(), T_ROMPE + 0.05, 0.8)

    # Minuto 2: la planta
    S.poner(b, S.pasitos(8, 0.1), 10.0, 0.5)
    S.poner(b, S.zumbido(0.3), 10.8, 0.5)
    for tt in (11.12, 11.27, 11.42):
        S.poner(b, S.golpe_madera(520), tt, 0.5)
    S.poner(b, S.zumbido(0.45, 300, 2000), 11.9, 0.6)
    S.poner(b, S.choque_ceramica(), T_CHOQUE, 1.0)
    S.poner(b, S.ladrido(1.1), 13.45, 0.8)

    # Minuto 3: el papel higiénico
    S.poner(b, S.pasitos(5, 0.08), 14.2, 0.5)
    S.poner(b, S.ladrido(1.2), 14.85, 0.35)
    S.poner(b, S.pasitos(32, 0.08), 15.0, 0.5)
    S.poner(b, S.zumbido(0.6), 15.4, 0.6)
    S.poner(b, S.zumbido(0.6), 16.8, 0.6)
    S.poner(b, S.filtro(S.ruido(2.6), 2500, 8000) * 0.05, 15.0)

    # ¡¿Quién hizo esto?!
    S.poner(b, S.disco_rayado(), T_VUELVE, 0.9)
    S.poner(b, S.chirrido_puerta(), T_VUELVE + 0.02, 0.8)
    S.poner(b, S.golpe_dramatico(), T_GRITO, 0.9)
    S.poner(b, S.puf(0.4), T_POSE, 0.6)
    S.poner(b, S.brillito(), 19.4, 0.7)
    S.poner(b, S.gemido(), 20.2, 0.45)

    # Yo no fui... (cajita de música)
    for i, nota in enumerate(("C6", "E6", "G6", "E6", "F6", "A6", "G6", "E6", "D6", "C6", "D6", "E6", "C6")):
        S.poner(b, S.campana(n(nota), 1.0, 3.5), T_ZOOM + 0.1 + i * 0.34, 0.4)
    S.poner(b, S.acorde_suave([n("C4"), n("E4"), n("G4")], 2.3), T_ZOOM, 1.0)
    S.poner(b, S.acorde_suave([n("F3"), n("A3"), n("C4")], 2.3), T_ZOOM + 2.2, 1.0)
    S.poner(b, S.gemido(), 21.7, 0.6)
    S.poner(b, S.gemido(), 22.9, 0.5)

    for tt in (0.15, T_TRAVIESO, 5.5, 10.0, 14.9, 21.3, 23.6):
        S.poner(b, S.pop(), tt, 0.25)
    S.guardar(b, ruta)


def main():
    carpeta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
    os.makedirs(carpeta, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        ruta_audio = os.path.join(tmp, "perro.wav")
        audio(ruta_audio)
        renderizar(dibujar, DUR, ruta_audio, os.path.join(carpeta, "perro_travieso.mp4"))
    print("Listo: videos/perro_travieso.mp4")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:  # vista previa: python3 perro_travieso.py 4.5 9 18.5
        for t in map(float, sys.argv[1:]):
            foto(dibujar, t, f"/tmp/perro_{t:05.2f}.png")
    else:
        main()
