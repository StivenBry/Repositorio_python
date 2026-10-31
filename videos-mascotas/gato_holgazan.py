"""Short vertical (9:16): «Mi gato un lunes a las 7:00 a.m.».

Un gato naranja tan flojo que apaga el despertador sin levantarse, deja
pasar al ratón, estira la pata hasta el plato para no caminar, «juega» con
el láser moviendo solo los ojos y termina escurriéndose del sofá.

Uso:  python3 gato_holgazan.py   ->  videos/gato_holgazan.mp4
"""
import math
import os
import tempfile

import cairo

import sonido as S
from animacion import (
    BLANCO, H, TINTA, W, camara, elipse, entra, estrella, foto, fotogramas, hx, lerp, linea,
    lineas_velocidad, pintar, poligono, rect_redondo, renderizar, sale, sale_atras, sombra,
    subtitulo, suave, temblor, texto, tramo, trazo, zzz,
)

DUR = 25.5

# Colores de la sala
PARED, PARED_RAYA = hx("#DCE8EF"), hx("#D1E0EA")
ZOCALO, PISO, PISO_LINEA = hx("#FFFFFF"), hx("#C9976A"), hx("#B07F55")
ALFOMBRA, ALFOMBRA_2 = hx("#E9A8A2"), hx("#F4C9C4")
SOFA, SOFA_OSC, SOFA_CLARO = hx("#3E8E8F"), hx("#2E6D6E"), hx("#58A8A9")
MADERA, MADERA_CLARA = hx("#8F5A32"), hx("#B97A47")
CIELO_ARRIBA, CIELO_ABAJO, SOL = hx("#86C8F2"), hx("#FFC690"), hx("#FFE27A")
CORTINA, CORTINA_OSC = hx("#9C7CC9"), hx("#7D5DAA")
RELOJ, CAMPANA = hx("#E04848"), hx("#F4C430")
PLATO, PLATO_OSC, CROQUETA = hx("#4A90D9"), hx("#2F6BAA"), hx("#9C5B2E")
BOLSA = hx("#7B4FA0")
RATON, RATON_OSC, RATON_CLARO = hx("#A3A9B3"), hx("#7E858F"), hx("#CDD2D8")
ROJO = hx("#FF4D4D")

# Colores del gato
NARANJA, NARANJA_OSC, CREMA = hx("#F3A24B"), hx("#D0742A"), hx("#FFF3E2")
ROSA, OJO, NARIZ, BOCA = hx("#F6A5B4"), hx("#B9D66B"), hx("#F07C93"), hx("#8A2B3C")

# Dónde están las cosas
GATO_SOFA = (330, 1238)
GATO_S = 1.2
RELOJ_POS = (850, 1180)
PLATO_PISO = (930, 1680)
PLATO_SOFA = (620, 1258)

# Momentos clave (segundos)
T_ALARMA, T_MANOTAZO = 0.8, 2.55
T_PATA, T_JALA, T_COME = 10.8, 12.6, 13.6
T_LASER, T_BOOP = 15.65, 19.0
T_BOSTEZO, T_RESBALA, T_CAE, T_PLOP = 20.0, 20.9, 22.0, 22.45


# =============================================================== gato

def _mirar(ojo_x, ojo_y, objetivo, maximo=8.0):
    """Desplazamiento de la pupila para mirar hacia `objetivo` (coordenadas locales)."""
    if objetivo is None:
        return 0.0, 0.0
    dx, dy = objetivo[0] - ojo_x, objetivo[1] - ojo_y
    d = math.hypot(dx, dy)
    if d < 1e-6:
        return 0.0, 0.0
    k = min(1.0, d / 50) * maximo / d
    return dx * k, dy * k


def cabeza_gato(ctx, t, ojos, objetivo, boca, pupila, oreja, inclinacion, bostezo):
    ctx.save()
    ctx.translate(175, -120)
    ctx.rotate(inclinacion)
    if objetivo is not None:  # pasar el objetivo al sistema de la cabeza
        objetivo = (objetivo[0] - 175, objetivo[1] + 120)

    for lado in (-1, 1):
        ctx.save()
        if lado == 1 and oreja:
            ctx.translate(48, -70)
            ctx.rotate(oreja)
            ctx.translate(-48, 70)
        ctx.new_path()
        poligono(ctx, [(lado * 80, -26), (lado * 66, -124), (lado * 16, -68)])
        pintar(ctx, NARANJA)
        ctx.new_path()
        poligono(ctx, [(lado * 66, -42), (lado * 61, -104), (lado * 32, -66)])
        pintar(ctx, ROSA, 0)
        ctx.restore()

    elipse(ctx, 0, 0, 90, 78)
    pintar(ctx, NARANJA, 0)
    ctx.save()
    elipse(ctx, 0, 0, 90, 78)
    ctx.clip()
    for x0, x1 in ((-20, -13), (0, 0), (20, 13)):
        linea(ctx, [(x0, -80), (x1, -50)], 10, NARANJA_OSC)
    for lado in (-1, 1):
        for dy in (-6, 12):
            linea(ctx, [(lado * 92, dy), (lado * 66, dy + 4)], 9, NARANJA_OSC)
    ctx.restore()
    elipse(ctx, 0, 0, 90, 78)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()

    # Hocico
    for lado in (-1, 1):
        elipse(ctx, lado * 18, 24, 24, 18)
        pintar(ctx, CREMA, 0)
    if bostezo > 0:
        elipse(ctx, 0, 40, 26, 34 * bostezo)
        pintar(ctx, BOCA, 5)
        ctx.save()
        elipse(ctx, 0, 40, 26, 34 * bostezo)
        ctx.clip()
        elipse(ctx, 0, 40 + 26 * bostezo, 18, 14 * bostezo)
        pintar(ctx, ROSA, 0)
        ctx.restore()
        for lado in (-1, 1):
            ctx.new_path()
            poligono(ctx, [(lado * 16, 40 - 30 * bostezo), (lado * 8, 40 - 30 * bostezo), (lado * 12, 40 - 18 * bostezo)])
            pintar(ctx, BLANCO, 2)
    elif boca == "masticar":
        abre = abs(math.sin(t * 12))
        elipse(ctx, 0, 30, 12, 4 + 7 * abre)
        pintar(ctx, BOCA, 4)
    else:
        linea(ctx, [(0, 16), (0, 22)], 4.5)
        ctx.new_path()
        ctx.arc(-9, 22, 9, 0, math.pi)
        ctx.new_sub_path()
        ctx.arc(9, 22, 9, 0, math.pi)
        ctx.set_source_rgb(*TINTA)
        ctx.set_line_width(4.5)
        ctx.stroke()

    # Nariz
    ctx.new_path()
    poligono(ctx, [(-11, 5), (11, 5), (0, 16)])
    pintar(ctx, NARIZ, 4)

    # Bigotes
    for lado in (-1, 1):
        for (x0, y0), (x1, y1) in (((40, 16), (114, 0)), ((42, 25), (118, 26)), ((40, 33), (110, 50))):
            linea(ctx, [(lado * x0, y0), (lado * x1, y1)], 3.5)

    # Ojos (apertura 0 = dormido, 1 = bien abierto)
    for i, lado in enumerate((-1, 1)):
        a = 0.0 if bostezo > 0 else ojos[i]
        ex, ey = lado * 34, -12
        if a < 0.08:
            ctx.new_path()
            ctx.arc(ex, ey - 8, 17, 0.2 * math.pi, 0.8 * math.pi)
            ctx.set_source_rgb(*TINTA)
            ctx.set_line_width(6)
            ctx.stroke()
            continue
        rx, ry = 22, 24
        ctx.save()
        elipse(ctx, ex, ey, rx, ry)
        ctx.clip()
        elipse(ctx, ex, ey, rx, ry)
        pintar(ctx, CREMA, 0)
        dx, dy = _mirar(ex, ey, objetivo)
        elipse(ctx, ex + dx, ey + dy, 16, 19)
        pintar(ctx, OJO, 0)
        if pupila == "redonda":
            elipse(ctx, ex + dx, ey + dy, 11, 13)
        else:
            elipse(ctx, ex + dx, ey + dy, 4.5, 14)
        pintar(ctx, TINTA, 0)
        elipse(ctx, ex + dx - 6, ey + dy - 8, 4.5, 4.5)
        pintar(ctx, BLANCO, 0)
        parpado = ey - ry + 2 * ry * (1 - a)
        ctx.rectangle(ex - rx - 4, ey - ry - 6, 2 * rx + 8, parpado - (ey - ry - 6))
        ctx.set_source_rgb(*NARANJA)
        ctx.fill()
        if a < 0.97:
            linea(ctx, [(ex - rx, parpado), (ex + rx, parpado)], 6)
        ctx.restore()
        elipse(ctx, ex, ey, rx, ry)
        ctx.set_source_rgb(*TINTA)
        ctx.set_line_width(5)
        ctx.stroke()
    ctx.restore()


def gato(ctx, t, x, y, s=1.0, ojos=(0.0, 0.0), mirada=None, boca="w", pata=None, pupila="rendija",
         sx=1.0, sy=1.0, rot=0.0, oreja=0.0, inclinacion=0.0, bostezo=0.0):
    """Gato acostado boca abajo, con la panza en (x, y) y la cabeza hacia la derecha.

    ojos: apertura (izquierdo, derecho). mirada/pata: punto de la pantalla al que
    mira o al que estira la pata delantera (None = nada / pata en reposo).
    """
    def a_local(p):
        return None if p is None else ((p[0] - x) / (s * sx), (p[1] - y) / (s * sy))

    sombra(ctx, x + 20 * s, y, 190 * s * sx, 16 * s)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(s * sx, s * sy)

    # Cola con rayas
    ctx.save()
    ctx.translate(-150, -55)
    ctx.rotate(0.12 * math.sin(t * 1.3))
    ctx.new_path()
    ctx.move_to(0, 0)
    ctx.curve_to(-90, -5, -120, -90, -70, -135)
    trazo(ctx, NARANJA, 32, 5)
    ctx.move_to(0, 0)
    ctx.curve_to(-90, -5, -120, -90, -70, -135)
    ctx.set_line_cap(cairo.LINE_CAP_BUTT)
    ctx.set_dash([12, 20], 6)
    ctx.set_source_rgb(*NARANJA_OSC)
    ctx.set_line_width(32)
    ctx.stroke()
    ctx.restore()

    # Cuerpo (respira despacio)
    ry = 80 * (1 + 0.03 * math.sin(t * math.tau / 2.6))
    cy = -ry + 2
    elipse(ctx, 0, cy, 168, ry)
    pintar(ctx, NARANJA, 0)
    ctx.save()
    elipse(ctx, 0, cy, 168, ry)
    ctx.clip()
    elipse(ctx, 25, -6, 140, 30)
    ctx.set_source_rgb(*CREMA)
    ctx.fill()
    for rx in (-100, -55, -10, 35):
        ctx.new_path()
        ctx.move_to(rx, cy - ry - 5)
        ctx.curve_to(rx + 18, cy - ry * 0.5, rx - 6, cy - ry * 0.2, rx + 12, cy + ry * 0.05)
        ctx.set_source_rgb(*NARANJA_OSC)
        ctx.set_line_width(14)
        ctx.stroke()
    ctx.restore()
    elipse(ctx, 0, cy, 168, ry)
    ctx.set_source_rgb(*TINTA)
    ctx.set_line_width(6)
    ctx.stroke()

    # Pata trasera y pata delantera lejana
    elipse(ctx, -100, -60, 68, 55, 0.25)
    pintar(ctx, NARANJA)
    ctx.save()
    elipse(ctx, -100, -60, 68, 55, 0.25)
    ctx.clip()
    for r in (30, 48):
        ctx.new_path()
        ctx.arc(-100, -60, r, -2.5, -1.3)
        ctx.set_source_rgb(*NARANJA_OSC)
        ctx.set_line_width(10)
        ctx.stroke()
    ctx.restore()
    elipse(ctx, -48, -14, 42, 15)
    pintar(ctx, CREMA, 5)
    elipse(ctx, 238, -14, 32, 15)
    pintar(ctx, CREMA, 5)

    cabeza_gato(ctx, t, ojos, a_local(mirada), boca, pupila, oreja, inclinacion, bostezo)

    # Pata delantera cercana (la que se estira)
    hombro = (150, -30)
    destino = a_local(pata) or (205, -12)
    largo_x, largo_y = destino[0] - hombro[0], destino[1] - hombro[1]
    ctx.new_path()
    ctx.move_to(*hombro)
    ctx.curve_to(hombro[0] + largo_x * 0.45, hombro[1] + 10,
                 destino[0] - largo_x * 0.1, destino[1] - largo_y * 0.4,
                 *destino)
    trazo(ctx, NARANJA, 34, 5)
    ang = math.atan2(largo_y * 0.4, largo_x * 0.1) if pata else 0.0
    ctx.save()
    ctx.translate(*destino)
    ctx.rotate(ang * 0.5)
    elipse(ctx, 0, 0, 34, 17)
    pintar(ctx, CREMA, 5)
    for dx in (-10, 4, 18):
        linea(ctx, [(dx, 4), (dx, 14)], 3.5)
    ctx.restore()
    ctx.restore()


def cabeza_gato_mundo(e):
    return e["x"] + 175 * e["s"] * e.get("sx", 1.0), e["y"] - 120 * e["s"] * e.get("sy", 1.0)


# =============================================================== otros personajes y cosas

def raton(ctx, t, x, y, dir=1, fase=0.0, corre=0.0, brazos=0.0, mira_arriba=0.0, salto=0.0, s=1.8):
    sombra(ctx, x, y, 48 * s, 8 * s)
    ctx.save()
    ctx.translate(x, y - salto)
    ctx.scale(s * dir, s)
    ctx.new_path()
    ctx.move_to(-30, -18)
    ctx.curve_to(-70, -20, -80, -50, -110, -30 + 6 * math.sin(t * 6))
    trazo(ctx, ROSA, 5, 2.5)
    for i, lado in enumerate((-1, 1)):
        elipse(ctx, lado * 14 + 10 * math.sin(fase + i * math.pi) * corre, -4, 11, 6)
        pintar(ctx, ROSA, 3)
    elipse(ctx, 0, -28, 36, 24)
    pintar(ctx, RATON, 5)
    elipse(ctx, 8, -16, 20, 9)
    pintar(ctx, RATON_CLARO, 0)
    ctx.save()
    ctx.translate(30, -44)
    ctx.rotate(-0.5 * mira_arriba)
    elipse(ctx, -8, -22, 16, 16)
    pintar(ctx, RATON, 4)
    elipse(ctx, -8, -22, 9, 9)
    pintar(ctx, ROSA, 0)
    elipse(ctx, 0, 0, 24, 19)
    pintar(ctx, RATON, 5)
    elipse(ctx, 23, 2, 6, 5)
    pintar(ctx, ROSA, 2.5)
    elipse(ctx, 6, -5, 4.5, 5.5)
    pintar(ctx, TINTA, 0)
    elipse(ctx, 5, -7, 1.6, 1.6)
    pintar(ctx, BLANCO, 0)
    for y1 in (-4, 8):
        linea(ctx, [(20, 4), (40, y1)], 2)
    ctx.restore()
    if brazos:  # saluda con los bracitos en alto para llamar la atención del gato
        for lado in (-1, 1):
            mano = (6 + lado * 16 + 5 * math.sin(t * 20 + lado), -36 - 44 * brazos)
            linea(ctx, [(10, -30), mano], 6, RATON_OSC)
            elipse(ctx, mano[0], mano[1], 5, 5)
            pintar(ctx, ROSA, 2)
    ctx.restore()


def estado_raton(t):
    """Parámetros del ratón, o None si no está en pantalla."""
    if t < 4.7 or t > 9.5:
        return None
    if t < 5.7:
        return dict(x=lerp(-90, 600, tramo(t, 4.7, 5.7)), y=1615, fase=t * 30, corre=1.0)
    if t < 7.6:
        brinco = 26 * abs(math.sin((t - 5.8) * 7)) if 5.8 < t < 7.1 else 0.0
        return dict(x=600, y=1615, dir=-1, mira_arriba=1.0, brazos=1.0 if t > 6.25 else 0.0, salto=brinco)
    if t < 8.3:
        return dict(x=600, y=1615, dir=-1, mira_arriba=0.2)
    return dict(x=lerp(600, 1180, tramo(t, 8.3, 9.5)), y=1615, fase=t * 14, corre=0.6)


def despertador(ctx, x, y, ang=0.0, t=0.0, sonando=False):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    for lado in (-1, 1):
        linea(ctx, [(lado * 28, -12), (lado * 40, 4)], 9)
        ctx.save()
        ctx.translate(lado * 34, -96)
        ctx.rotate(lado * 0.5)
        ctx.new_path()
        ctx.arc(0, 0, 24, math.pi, 2 * math.pi)
        ctx.close_path()
        pintar(ctx, CAMPANA, 5)
        ctx.restore()
    linea(ctx, [(0, -100), (0, -116)], 6)
    elipse(ctx, 0, -118, 9, 7)
    pintar(ctx, CAMPANA, 4)
    elipse(ctx, 0, -55, 52, 52)
    pintar(ctx, RELOJ)
    elipse(ctx, 0, -55, 40, 40)
    pintar(ctx, BLANCO, 4)
    for i in range(12):
        a = i * math.tau / 12
        linea(ctx, [(math.cos(a) * 32, -55 + math.sin(a) * 32), (math.cos(a) * 36, -55 + math.sin(a) * 36)], 3)
    linea(ctx, [(0, -55), (0, -84)], 5)
    linea(ctx, [(0, -55), (-14, -40)], 6)
    ctx.restore()
    if sonando:
        for lado in (-1, 1):
            for k in (1, 2):
                ctx.new_path()
                centro = math.pi if lado < 0 else 0.0
                ctx.arc(x, y - 60, 66 + 22 * k, centro - 0.45, centro + 0.45)
                ctx.set_source_rgba(*TINTA, 0.5 + 0.5 * math.sin(t * 40 + k))
                ctx.set_line_width(6)
                ctx.stroke()


def estado_despertador(t):
    """(x, y, ángulo, sonando) del despertador."""
    x, y = RELOJ_POS
    if t < T_ALARMA:
        return x, y, 0.0, False
    if t < T_MANOTAZO:
        return x, y - 6 * abs(math.sin(t * 35)), 0.15 * math.sin(t * 70), True
    tau = t - T_MANOTAZO
    return x + 950 * tau, y - 650 * tau + 1700 * tau * tau, 13 * tau, False


def mesita(ctx):
    rect_redondo(ctx, 770, 1180, 160, 205, 8)
    pintar(ctx, MADERA_CLARA)
    for yy in (1205, 1290):
        rect_redondo(ctx, 788, yy, 124, 66, 6)
        pintar(ctx, MADERA, 4)
        elipse(ctx, 850, yy + 33, 8, 8)
        pintar(ctx, hx("#F4C430"), 3)
    for x in (782, 900):
        ctx.rectangle(x, 1385, 18, 20)
        pintar(ctx, MADERA, 4)


def plato(ctx, x, y, lleno=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.new_path()
    poligono(ctx, [(-82, -50), (82, -50), (64, 0), (-64, 0)])
    pintar(ctx, PLATO)
    elipse(ctx, 0, -50, 82, 18)
    pintar(ctx, PLATO_OSC, 5)
    if lleno > 0:
        ctx.save()
        elipse(ctx, 0, -50, 78, 15)
        ctx.clip()
        for i, (dx, dy) in enumerate(((-50, 4), (-30, -2), (-10, 2), (10, -4), (30, 2), (50, 0), (-40, -8), (-18, -10),
                                       (2, -12), (22, -10), (42, -8), (-26, -18), (-6, -20), (14, -18), (32, -16))):
            if i / 15 < lleno:
                elipse(ctx, dx, -50 + dy + 6, 11, 8)
                pintar(ctx, CROQUETA, 2.5)
        ctx.restore()
    texto(ctx, "MICHI", 0, -24, 26, con_sombra=False, grosor=0.28)
    ctx.restore()


def bolsa(ctx, x, y, ang):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    rect_redondo(ctx, -70, -110, 140, 220, 14)
    pintar(ctx, BOLSA)
    rect_redondo(ctx, -52, -40, 104, 80, 10)
    pintar(ctx, BLANCO, 4)
    elipse(ctx, -6, 0, 26, 15)
    pintar(ctx, hx("#F3A24B"), 3)
    ctx.new_path()
    poligono(ctx, [(16, 0), (34, -14), (34, 14)])
    pintar(ctx, hx("#F3A24B"), 3)
    for yy in (-96, -84):
        linea(ctx, [(-60, yy), (60, yy)], 4, hx("#5C3880"))
    ctx.restore()


def boca_bolsa(x, y, ang):
    return x + 110 * math.sin(ang), y - 110 * math.cos(ang)


def estado_bolsa(t):
    """(x, y, ángulo) de la bolsa de croquetas, o None si no se ve."""
    if t < 9.45 or t > 10.7:
        return None
    entra_k = sale(tramo(t, 9.45, 9.75))
    sale_k = entra(tramo(t, 10.35, 10.7))
    return 1010 + 300 * (1 - entra_k) + 340 * sale_k, 1450 - 40 * entra_k, lerp(-1.2, -2.3, entra_k)


def lleno_plato(t):
    return tramo(t, 9.85, 10.3)


def estado_plato(t):
    """Posición del plato: en el piso, arrastrado por la pata o ya en el sofá."""
    if t < T_JALA:
        return PLATO_PISO
    k = suave(tramo(t, T_JALA, T_COME - 0.1))
    x = lerp(PLATO_PISO[0], PLATO_SOFA[0], k)
    y = lerp(PLATO_PISO[1], PLATO_SOFA[1], k) - 140 * math.sin(math.pi * k)
    return x, y


LASER = [(15.6, 120, 1720), (15.9, 820, 1760), (16.15, 940, 1520), (16.4, 260, 1560), (16.7, 700, 820),
         (16.95, 160, 760), (17.2, 960, 980), (17.5, 520, 1800), (17.8, 100, 1620), (18.1, 860, 1450),
         (18.4, 300, 1300), (18.7, 700, 1180), (T_BOOP, 540, 1107), (19.4, 540, 1107), (19.7, 1300, 700)]


def punto_laser(t):
    if t < LASER[0][0] or t > LASER[-1][0]:
        return None
    return fotogramas(t, LASER)


def dibujar_laser(ctx, x, y, t):
    brillo = 0.8 + 0.2 * math.sin(t * 40)
    grad = cairo.RadialGradient(x, y, 0, x, y, 50)
    grad.add_color_stop_rgba(0, 1, 0.25, 0.25, 0.9 * brillo)
    grad.add_color_stop_rgba(0.3, 1, 0, 0, 0.35 * brillo)
    grad.add_color_stop_rgba(1, 1, 0, 0, 0)
    ctx.new_path()
    ctx.arc(x, y, 50, 0, math.tau)
    ctx.set_source(grad)
    ctx.fill()
    elipse(ctx, x, y, 9, 9)
    ctx.set_source_rgb(1, 0.88, 0.88)
    ctx.fill()


def bateria(ctx, x, y, k, t):
    if k <= 0:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(k, k)
    rect_redondo(ctx, -80, -38, 150, 76, 14)
    pintar(ctx, BLANCO, 7)
    rect_redondo(ctx, 70, -16, 16, 32, 4)
    pintar(ctx, TINTA, 0)
    if (t * 2.5) % 1 < 0.6:
        rect_redondo(ctx, -68, -26, 16, 52, 4)
        pintar(ctx, ROJO, 0)
    texto(ctx, "1%", 0, 82, 54, color=ROJO, con_sombra=False)
    ctx.restore()


# =============================================================== guion del gato

def estado_gato(t):
    e = dict(x=GATO_SOFA[0], y=GATO_SOFA[1], s=GATO_S, ojos=(0.0, 0.0), mirada=None, boca="w", pata=None,
             pupila="rendija", sx=1.0, sy=1.0, rot=0.0, oreja=0.0, inclinacion=0.0, bostezo=0.0)
    reposo = (GATO_SOFA[0] + 205 * GATO_S, GATO_SOFA[1] - 12 * GATO_S)
    reloj = (RELOJ_POS[0] - 10, RELOJ_POS[1] - 60)

    if t < 4.5:  # La alarma
        if 1.5 < t < 1.85:
            e["oreja"] = 0.3 * math.sin(t * 40)
        if 1.8 < t < 3.1:
            abre = 0.35 * tramo(t, 1.8, 1.95) * (1 - tramo(t, 2.8, 3.1))
            e.update(ojos=(0.0, abre), mirada=reloj)
        if 2.0 < t < 3.3:
            ida = sale_atras(tramo(t, 2.0, T_MANOTAZO), 1.2)
            vuelta = suave(tramo(t, 2.75, 3.3))
            k = ida * (1 - vuelta)
            e["pata"] = (lerp(reposo[0], reloj[0] - 10, k), lerp(reposo[1], reloj[1], k))

    elif t < 9.5:  # El ratón
        if 6.0 < t < 7.6:
            abre = 0.42 * tramo(t, 6.0, 6.2) * (1 - tramo(t, 7.3, 7.6))
            raton_e = estado_raton(t)
            e.update(ojos=(abre, 0.0), mirada=(raton_e["x"], raton_e["y"] - 40))

    elif t < 15.5:  # La comida
        plato_xy = estado_plato(t)
        borde = (plato_xy[0] - 30, plato_xy[1] - 62)
        if 10.1 < t < 10.6:
            e["inclinacion"] = 0.05 * math.sin(t * 40)
        if 10.5 < t < T_COME:
            e.update(ojos=(0.28, 0.28), mirada=plato_xy)
        if T_PATA <= t < T_JALA:
            k = sale_atras(tramo(t, T_PATA, T_PATA + 1.5), 1.1)
            e["pata"] = (lerp(reposo[0], borde[0], k), lerp(reposo[1], borde[1], k))
        elif T_JALA <= t < T_COME:
            e["pata"] = borde
        elif t >= T_COME:
            e.update(boca="masticar", inclinacion=0.25 * tramo(t, T_COME, T_COME + 0.2))
            e["pata"] = (lerp(PLATO_SOFA[0] - 40, reposo[0], tramo(t, T_COME, T_COME + 0.3)), reposo[1])

    elif t < T_BOSTEZO:  # El láser
        punto = punto_laser(t)
        abre = tramo(t, 15.6, 15.8) * (1 - tramo(t, 19.55, 19.95))
        e.update(ojos=(abre, abre), mirada=punto, pupila="redonda")
        if T_BOOP <= t < 19.4:
            e["oreja"] = 0.15 * math.sin(t * 30)

    else:  # Bostezo y se escurre del sofá
        if t < T_RESBALA:
            e["bostezo"] = math.sin(math.pi * tramo(t, T_BOSTEZO, T_RESBALA))
            e["inclinacion"] = -0.15 * e["bostezo"]
        elif t < T_CAE:
            k = suave(tramo(t, T_RESBALA, T_CAE))
            e.update(x=lerp(330, 400, k), y=lerp(1238, 1330, k), sy=lerp(1, 1.25, k), sx=lerp(1, 0.92, k), rot=0.1 * k)
        elif t < T_PLOP:
            k = entra(tramo(t, T_CAE, T_PLOP))
            e.update(x=400, y=lerp(1330, 1660, k), s=lerp(GATO_S, 1.3, k), sy=lerp(1.25, 1.05, k), sx=0.95,
                     rot=0.1 * (1 - k))
        else:
            tau = t - T_PLOP
            q = 0.3 * math.exp(-6 * tau) * math.cos(14 * tau)
            e.update(x=400, y=1660, s=1.3, sy=1 - q, sx=1 + 0.8 * q)
    return e


# =============================================================== escenario

def fondo(ctx, t):
    ctx.rectangle(-300, -300, W + 600, 1650)
    ctx.set_source_rgb(*PARED)
    ctx.fill()
    for x in range(-270, W + 300, 100):
        ctx.rectangle(x, -300, 50, 1650)
        ctx.set_source_rgb(*PARED_RAYA)
        ctx.fill()

    # Ventana con el amanecer
    x0, y0, x1, y1 = 330, 520, 750, 900
    grad = cairo.LinearGradient(0, y0, 0, y1)
    grad.add_color_stop_rgb(0, *CIELO_ARRIBA)
    grad.add_color_stop_rgb(1, *CIELO_ABAJO)
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
    ctx.set_source(grad)
    ctx.fill()
    ctx.save()
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
    ctx.clip()
    elipse(ctx, 650, 870, 105, 105)
    ctx.set_source_rgba(*SOL, 0.35)
    ctx.fill()
    elipse(ctx, 650, 870, 70, 70)
    ctx.set_source_rgb(*SOL)
    ctx.fill()
    for i, (nx, ny) in enumerate(((430, 610), (620, 690))):
        xx = nx + 18 * math.sin(t * 0.3 + i)
        for dx, dy, r in ((-36, 6, 26), (0, 0, 34), (36, 8, 24)):
            elipse(ctx, xx + dx, ny + dy, r * 1.3, r)
            ctx.set_source_rgba(1, 0.95, 0.93, 0.9)
            ctx.fill()
    ctx.restore()
    for ancho, color in ((24, TINTA), (13, BLANCO)):
        rect_redondo(ctx, x0, y0, x1 - x0, y1 - y0, 6)
        ctx.set_source_rgb(*color)
        ctx.set_line_width(ancho)
        ctx.stroke()
    linea(ctx, [(540, y0), (540, y1)], 11, BLANCO)
    linea(ctx, [(x0, 710), (x1, 710)], 11, BLANCO)
    rect_redondo(ctx, x0 - 25, y1, x1 - x0 + 50, 28, 8)
    pintar(ctx, BLANCO, 5)
    for lado, x in ((-1, 315), (1, 765)):
        ctx.new_path()
        ctx.move_to(x - 42, 500)
        ctx.line_to(x + 42, 500)
        ctx.curve_to(x + 30 - lado * 20, 680, x + 42, 820, x + 36 + lado * 10, 950)
        ctx.line_to(x - 36 + lado * 10, 950)
        ctx.curve_to(x - 42, 820, x - 30 - lado * 20, 680, x - 42, 500)
        pintar(ctx, CORTINA, 5)
        linea(ctx, [(x, 520), (x + lado * 6, 930)], 4, CORTINA_OSC)
    rect_redondo(ctx, 260, 488, 560, 20, 10)
    pintar(ctx, MADERA, 5)

    # Cuadro con un pescado
    rect_redondo(ctx, 70, 620, 170, 140, 6)
    pintar(ctx, hx("#FFE9B8"), 0)
    elipse(ctx, 145, 690, 44, 24)
    pintar(ctx, hx("#4A90D9"), 5)
    ctx.new_path()
    poligono(ctx, [(186, 690), (214, 668), (214, 712)])
    pintar(ctx, hx("#4A90D9"), 5)
    elipse(ctx, 124, 684, 5, 5)
    pintar(ctx, TINTA, 0)
    for ancho, color in ((20, TINTA), (11, MADERA_CLARA)):
        rect_redondo(ctx, 70, 620, 170, 140, 6)
        ctx.set_source_rgb(*color)
        ctx.set_line_width(ancho)
        ctx.stroke()

    # Reloj de pared marcando las 7:00
    elipse(ctx, 930, 690, 74, 74)
    pintar(ctx, BLANCO, 8)
    for i in range(12):
        a = i * math.tau / 12
        linea(ctx, [(930 + math.cos(a) * 58, 690 + math.sin(a) * 58), (930 + math.cos(a) * 66, 690 + math.sin(a) * 66)], 5)
    linea(ctx, [(930, 690), (930, 634)], 6)
    a = math.radians(90 + 60)  # manecilla de la hora en el 7
    linea(ctx, [(930, 690), (930 + math.cos(a) * 38, 690 + math.sin(a) * 38)], 8)
    elipse(ctx, 930, 690, 7, 7)
    pintar(ctx, TINTA, 0)

    # Piso
    ctx.rectangle(-300, 1350, W + 600, H)
    ctx.set_source_rgb(*PISO)
    ctx.fill()
    y, alto, fila = 1365, 42, 0
    while y < H + 600:
        linea(ctx, [(-300, y), (W + 300, y)], 4, PISO_LINEA)
        desfase = (fila * 170) % 340
        for x in range(-desfase - 340, W + 300, 340):
            linea(ctx, [(x, y), (x, y + alto)], 4, PISO_LINEA)
        y += alto
        alto += 9
        fila += 1
    rect_redondo(ctx, -310, 1325, W + 620, 40, 4)
    pintar(ctx, ZOCALO, 5)
    elipse(ctx, 540, 1720, 450, 125)
    pintar(ctx, ALFOMBRA, 6)
    elipse(ctx, 540, 1720, 380, 98)
    ctx.set_source_rgb(*ALFOMBRA_2)
    ctx.set_line_width(14)
    ctx.stroke()


def sofa(ctx):
    rect_redondo(ctx, 75, 990, 610, 260, 50)
    pintar(ctx, SOFA)
    for x in (100, 390):
        rect_redondo(ctx, x, 1015, 270, 190, 34)
        pintar(ctx, SOFA_CLARO, 5)
    rect_redondo(ctx, 60, 1205, 640, 60, 24)
    pintar(ctx, SOFA)
    rect_redondo(ctx, 60, 1250, 640, 95, 22)
    pintar(ctx, SOFA_OSC)
    for x in (30, 635):
        rect_redondo(ctx, x, 1110, 100, 235, 36)
        pintar(ctx, SOFA)
    for x in (75, 680):
        ctx.rectangle(x, 1345, 22, 24)
        pintar(ctx, MADERA, 4)


def rayos_de_sol(ctx, t):
    for i, (a, b, c, d) in enumerate(((430, 600, 330, 40), (630, 730, 640, 400))):
        ctx.new_path()
        poligono(ctx, [(a, 900), (b, 900), (c, 1900), (d, 1900)])
        ctx.set_source_rgba(1, 0.92, 0.6, 0.14 + 0.03 * math.sin(t * 1.5 + i))
        ctx.fill()


# =============================================================== cuadro completo

def dibujar(ctx, t):
    ctx.save()
    dx = dy = 0.0
    if T_MANOTAZO <= t < T_MANOTAZO + 0.25:
        dx, dy = temblor(t, 12 * (1 - (t - T_MANOTAZO) / 0.25))
    if T_PLOP <= t < T_PLOP + 0.3:
        dx, dy = temblor(t, 16 * (1 - (t - T_PLOP) / 0.3))
    zoom, cx, cy = 1.0, W / 2, H / 2
    if T_LASER <= t < T_BOSTEZO:  # Acercamiento suave para ver bien los ojos
        k = suave(tramo(t, 17.7, 18.2)) * (1 - suave(tramo(t, 19.6, 20.0)))
        zoom, cx, cy = lerp(1, 1.3, k), lerp(W / 2, 480, k), lerp(H / 2, 1200, k)
    camara(ctx, zoom, cx, cy, dx, dy)

    fondo(ctx, t)
    sofa(ctx)
    mesita(ctx)
    rx, ry, ra, sonando = estado_despertador(t)
    despertador(ctx, rx, ry, ra, t, sonando)
    rayos_de_sol(ctx, t)

    plato_xy = estado_plato(t)
    bolsa_e = estado_bolsa(t)
    if bolsa_e and 9.8 < t < 10.35:  # chorro de croquetas
        bx, by = boca_bolsa(*bolsa_e)
        for i in range(10):
            f = (t * 3.2 + i / 10) % 1
            elipse(ctx, lerp(bx, plato_xy[0], f) + 6 * math.sin(i * 7), lerp(by, plato_xy[1] - 55, f), 9, 7, i)
            pintar(ctx, CROQUETA, 2.5)
    plato_delante = T_JALA <= t < T_RESBALA
    if not plato_delante:
        plato(ctx, *plato_xy, lleno_plato(t) if t < T_JALA else 0.4)
    if bolsa_e:
        bolsa(ctx, *bolsa_e)

    raton_e = estado_raton(t)
    if raton_e:
        raton(ctx, t, **raton_e)

    e = estado_gato(t)
    gato(ctx, t, **e)
    if plato_delante:  # el plato va por delante del gato mientras lo arrastra y come
        plato(ctx, *plato_xy, 1.0 - 0.6 * tramo(t, T_COME, 15.5))

    hx_, hy_ = cabeza_gato_mundo(e)
    duerme = (t < 1.8 or 3.3 < t < 6.0 or 7.6 < t < 10.4 or t > T_PLOP + 0.3) and not 2.0 < t < 3.3
    if duerme:
        zzz(ctx, hx_ + 70 * e["s"], hy_ - 90 * e["s"], t, e["s"], 1.0)

    # Detalles de cada escena
    if sonando:
        texto(ctx, "¡RIIING!", rx, ry - 190 + 6 * math.sin(t * 50), 64, color=ROJO, rot=0.08 * math.sin(t * 30))
    if T_MANOTAZO <= t < T_MANOTAZO + 0.3:
        estrella(ctx, RELOJ_POS[0] - 20, RELOJ_POS[1] - 70, 70 * sale(tramo(t, T_MANOTAZO, T_MANOTAZO + 0.12)),
                 (1, 1, 1), 1 - tramo(t, T_MANOTAZO + 0.1, T_MANOTAZO + 0.3))
    if raton_e and 7.6 <= t < 8.4:
        texto(ctx, "...", raton_e["x"], raton_e["y"] - 130, 70 * sale_atras(tramo(t, 7.6, 7.8)), con_sombra=False)
    if raton_e and 5.75 <= t < 6.25:
        texto(ctx, "!", raton_e["x"], raton_e["y"] - 140, 90 * sale_atras(tramo(t, 5.75, 5.9)), color=ROJO,
              con_sombra=False)
    if T_PATA <= t < T_JALA:
        hombro_x = e["x"] + 150
        lineas_velocidad(ctx, hombro_x + 200, e["y"] + 80, -1, 0.6 * (1 - tramo(t, 11.6, T_JALA)))
    if T_COME + 0.1 <= t < 15.5:
        k = sale_atras(tramo(t, T_COME + 0.1, T_COME + 0.35))
        texto(ctx, "ÑAM ÑAM", hx_ + 150, hy_ - 150 + 8 * math.sin(t * 12), 58 * k, rot=-0.12, con_sombra=False)
    punto = punto_laser(t)
    if punto:
        dibujar_laser(ctx, *punto, t)
    if 19.0 <= t < 19.4:
        texto(ctx, "boop", hx_ + 120, hy_ - 130, 56 * sale_atras(tramo(t, 19.0, 19.15)), con_sombra=False)
    bateria(ctx, 330, 1385, sale_atras(tramo(t, 23.0, 23.3)), t)
    ctx.restore()

    # Subtítulos
    subtitulo(ctx, t, 0.1, 2.7, "Mi gato un lunes a las *7:00 a.m.*")
    subtitulo(ctx, t, 2.75, 4.5, "Posponer alarma: *nivel experto*")
    subtitulo(ctx, t, 4.6, 7.0, "Un ratón... ¿cazarlo?")
    subtitulo(ctx, t, 7.0, 9.5, "Que lo atrape *otro.*")
    subtitulo(ctx, t, 9.55, 12.6, "¿Comida? *Sin levantarse.*")
    subtitulo(ctx, t, 12.6, 15.5, "Cero pasos. *Cero esfuerzo.*")
    subtitulo(ctx, t, 15.6, 17.75, "¡Hora de jugar con el *láser*!")
    subtitulo(ctx, t, 17.8, 20.0, "Cardio de hoy: *solo los ojos*")
    subtitulo(ctx, t, 20.0, 23.3, "Fin del día: *agotado.*")
    subtitulo(ctx, t, 23.4, DUR, "¿Tu gato también es *así*?")


# =============================================================== sonido

def lofi(b, inicio, fin):
    """Base lo-fi relajada (75 BPM): piano eléctrico, bajo, batería suave y vinilo."""
    n = S.nota
    pulso = 0.8
    acordes = [("F3", "A3", "C4", "E4"), ("E3", "G3", "B3", "D4"), ("D3", "F3", "A3", "C4"), ("C3", "E3", "G3", "B3")]
    raices = ["F2", "E2", "D2", "C2"]
    melodias = [[(0, "E5"), (1.5, "C5"), (3, "A4")], [(0.5, "D5"), (1.5, "B4"), (2.5, "G4")],
                [(0, "C5"), (2, "A4"), (3, "F4")], [(0.5, "G4"), (1.5, "E4"), (3, "B4")]]
    bateria = S.pista(len(b) / S.SR)
    tt, compas = inicio, 0
    while tt < fin:
        acorde = acordes[compas % 4]
        for j, nota in enumerate(acorde):
            S.poner(b, S.piano_electrico(n(nota), 2.6), tt + j * 0.025, 0.5)
            S.poner(b, S.piano_electrico(n(nota), 1.0), tt + 2.5 * pulso + j * 0.025, 0.22)
        S.poner(b, S.bajo(n(raices[compas % 4]), 1.3), tt, 0.75)
        S.poner(b, S.bajo(n(raices[compas % 4]), 0.6), tt + 2.5 * pulso, 0.5)
        for beat, nota in melodias[compas % 4]:
            S.poner(b, S.campana(n(nota), 1.4, 2.5), tt + beat * pulso, 0.16)
        for beat in (0, 2.5):
            S.poner(bateria, S.bombo(), tt + beat * pulso, 0.8)
        for beat in (1, 3):
            S.poner(bateria, S.caja(), tt + beat * pulso, 0.45)
        for k in range(8):
            columpio = 0.07 * pulso if k % 2 else 0.0
            S.poner(bateria, S.platillo(), tt + k * pulso / 2 + columpio, 0.35 if k % 2 else 0.6)
        tt += 4 * pulso
        compas += 1
    b += S.filtro(bateria, None, 4500) * 0.8
    S.poner(b, S.crepitar_vinilo(fin - inicio), inicio)


def audio(ruta):
    b = S.pista(DUR)

    # La alarma
    S.poner(b, S.ronquido(2.4), 0.0, 0.8)
    S.poner(b, S.alarma(T_MANOTAZO - T_ALARMA), T_ALARMA, 0.75)
    S.poner(b, S.maullido(0.5, 0.75), 1.85, 0.35)
    S.poner(b, S.zumbido(0.4), 2.1, 0.5)
    S.poner(b, S.golpe_madera(420), T_MANOTAZO, 1.0)
    S.poner(b, S.boing(), T_MANOTAZO + 0.03, 0.5)
    S.poner(b, S.zumbido(0.5, 600, 4000), T_MANOTAZO + 0.05, 0.5)
    S.poner(b, S.golpe_madera(260), 3.15, 0.5)
    lofi(b, 3.0, DUR)
    S.poner(b, S.ronquido(2.4), 3.4, 0.5)

    # El ratón
    S.poner(b, S.pasitos(14, 0.07, 1.6), 4.7, 0.45)
    for tt in (5.8, 6.3, 6.75, 7.1):
        S.poner(b, S.chillido_raton(), tt, 0.5)
    S.poner(b, S.silbido(800, 480, 0.4), 7.65, 0.35)
    S.poner(b, S.pasitos(12, 0.1, 1.6), 8.3, 0.35)

    # La comida
    S.poner(b, S.zumbido(0.35), 9.45, 0.4)
    S.poner(b, S.croquetas(0.5), 9.85, 0.6)
    S.poner(b, S.olfateo(), 10.1, 0.6)
    S.poner(b, S.silbido(350, 1400, 1.6), T_PATA + 0.05, 0.5)
    S.poner(b, S.pop(), T_JALA, 0.5)
    S.poner(b, S.silbido(1300, 420, 0.9), T_JALA + 0.05, 0.45)
    S.poner(b, S.golpe_madera(900), T_COME - 0.1, 0.4)
    for i in range(6):
        S.poner(b, S.crujido(), T_COME + 0.15 + i * 0.3, 0.7)

    # El láser
    for tt, _, _ in LASER[:-3]:
        S.poner(b, S.laser(), tt, 0.5)
    S.poner(b, S.laser(), 19.4, 0.5)
    S.poner(b, S.pop(1.6), T_BOOP, 0.5)

    # Bostezo, se escurre y ¡plop!
    S.poner(b, S.bostezo(), T_BOSTEZO, 0.7)
    S.poner(b, S.silbido(900, 300, T_CAE - T_RESBALA + 0.4), T_RESBALA, 0.4)
    S.poner(b, S.zumbido(0.4), T_CAE, 0.4)
    S.poner(b, S.bombo(), T_PLOP, 0.8)
    S.poner(b, S.puf(0.4), T_PLOP, 0.5)
    S.poner(b, S.ronquido(2.4), 23.0, 0.6)

    for tt in (0.1, 2.75, 4.6, 7.0, 9.55, 12.6, 15.6, 17.8, 20.0, 23.4):
        S.poner(b, S.pop(), tt, 0.25)
    S.guardar(b, ruta)


def main():
    carpeta = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
    os.makedirs(carpeta, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        ruta_audio = os.path.join(tmp, "gato.wav")
        audio(ruta_audio)
        renderizar(dibujar, DUR, ruta_audio, os.path.join(carpeta, "gato_holgazan.mp4"))
    print("Listo: videos/gato_holgazan.mp4")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:  # vista previa: python3 gato_holgazan.py 1.0 11.5 19.1
        for t in map(float, sys.argv[1:]):
            foto(dibujar, t, f"/tmp/gato_{t:05.2f}.png")
    else:
        main()
