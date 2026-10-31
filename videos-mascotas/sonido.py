"""Sintetizador sencillo con numpy: música y efectos de sonido de los videos.

Todo el audio se genera aquí (no hay grabaciones): instrumentos hechos con
sumas de senos y ruido filtrado, mezclados en una pista mono a 44.1 kHz.
"""
import wave

import numpy as np

SR = 44100
TAU = 2 * np.pi
_azar = np.random.default_rng(7)

_SEMITONOS = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
              "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def nota(nombre):
    """'A4' -> 440.0 Hz."""
    letra, octava = nombre[:-1], int(nombre[-1])
    return 440.0 * 2 ** ((12 * (octava + 1) + _SEMITONOS[letra] - 69) / 12)


# ---------------------------------------------------------------- pista

def pista(duracion):
    return np.zeros(int(duracion * SR), dtype=np.float64)


def poner(buf, sonido, t, vol=1.0):
    """Suma `sonido` a la pista a partir del segundo t."""
    i = int(t * SR)
    if i >= len(buf) or i + len(sonido) <= 0:
        return
    s = sonido[max(0, -i):]
    i = max(0, i)
    fin = min(len(buf), i + len(s))
    buf[i:fin] += s[:fin - i] * vol


def guardar(buf, ruta):
    """Sube el volumen a un nivel parejo, limita los picos con saturación suave
    y guarda un WAV estéreo de 16 bits."""
    rms = np.sqrt(np.mean(buf ** 2))
    buf = buf * (10 ** (-15 / 20) / max(rms, 1e-9))
    buf = np.tanh(buf * 1.1) * 0.95
    n = int(SR * 0.02)
    buf[:n] *= np.linspace(0, 1, n)
    buf[-n * 10:] *= np.linspace(1, 0, n * 10)
    datos = (buf * 32767).astype(np.int16)
    estereo = np.repeat(datos[:, None], 2, axis=1)
    with wave.open(ruta, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(estereo.tobytes())


# ---------------------------------------------------------------- utilidades

def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _env(t, ataque=0.005, decaida=4.0):
    return np.minimum(1.0, t / ataque) * np.exp(-decaida * t)


def _cierre(y, ms=10):
    n = min(len(y), int(SR * ms / 1000))
    if n:
        y[-n:] *= np.linspace(1, 0, n)
    return y


def ruido(dur):
    return _azar.standard_normal(int(dur * SR))


def filtro(x, bajo=None, alto=None):
    """Filtro pasa-banda por FFT (bordes suaves): deja pasar entre `bajo` y `alto` Hz."""
    if len(x) == 0:
        return x
    espectro = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if bajo:
        m *= 1 / (1 + (bajo / np.maximum(f, 1.0)) ** 4)
    if alto:
        m *= 1 / (1 + (f / alto) ** 4)
    return np.fft.irfft(espectro * m, len(x))


def _fase(frecuencias):
    return TAU * np.cumsum(frecuencias) / SR


def _norm(y, pico=1.0):
    return y / max(1e-9, np.max(np.abs(y))) * pico


# ---------------------------------------------------------------- instrumentos

def pulsado(f, dur=0.5, brillo=0.8, decaida=5.0):
    """Cuerda pulsada (ukelele / pizzicato)."""
    t = _t(dur)
    y = np.zeros_like(t)
    for k in range(1, 10):
        if f * k > 12000:
            break
        y += brillo ** (k - 1) / k * np.sin(TAU * f * k * t) * np.exp(-decaida * (1 + 0.5 * (k - 1)) * t)
    return _cierre(y * np.minimum(1, t / 0.003) * 0.6)


def campana(f, dur=1.2, decaida=3.0):
    """Cajita de música / campanita."""
    t = _t(dur)
    y = (np.sin(TAU * f * t)
         + 0.35 * np.sin(TAU * 2 * f * t) * np.exp(-2 * t)
         + 0.15 * np.sin(TAU * 3.01 * f * t) * np.exp(-4 * t)
         + 0.08 * np.sin(TAU * 5.4 * f * t) * np.exp(-8 * t))
    return _cierre(y * _env(t, 0.002, decaida) * 0.5)


def piano_electrico(f, dur=1.8):
    t = _t(dur)
    y = np.sin(TAU * f * t + 0.7 * np.sin(TAU * f * t) * np.exp(-3 * t))
    y *= 1 + 0.15 * np.sin(TAU * 4.5 * t)
    return _cierre(y * _env(t, 0.012, 1.6) * 0.32)


def bajo(f, dur=0.6, decaida=3.0):
    t = _t(dur)
    y = np.sin(TAU * f * t) + 0.25 * np.sin(TAU * 2 * f * t)
    return _cierre(y * _env(t, 0.01, decaida) * 0.6)


def acorde_suave(frecuencias, dur=2.0):
    """Colchón de cuerdas suave (senos con ataque lento)."""
    t = _t(dur)
    y = np.zeros_like(t)
    for f in frecuencias:
        y += np.sin(TAU * f * t + 0.3 * np.sin(TAU * 5 * t)) + 0.2 * np.sin(TAU * 2 * f * t)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.5)
    return y * env * 0.12


def bombo(dur=0.35):
    t = _t(dur)
    y = np.sin(_fase(48 + 95 * np.exp(-t * 28))) * np.exp(-t * 9)
    return _cierre(y * 0.9)


def caja(dur=0.2):
    t = _t(dur)
    y = filtro(ruido(dur), 1500, 6000) * np.exp(-t * 22) * 0.5 + 0.4 * np.sin(TAU * 190 * t) * np.exp(-t * 30)
    return _cierre(y)


def platillo(dur=0.07):
    t = _t(dur)
    return _cierre(filtro(ruido(dur), 7000) * np.exp(-t * 70) * 0.35)


def chasquido(dur=0.08):
    """Chasquido de dedos para la música 'a escondidas'."""
    t = _t(dur)
    y = filtro(ruido(dur), 1800, 6500) * np.exp(-t * 60) + 0.3 * np.sin(TAU * 1700 * t) * np.exp(-t * 80)
    return _cierre(y * 0.6)


def crepitar_vinilo(dur):
    """Siseo + clics de disco viejo para el lo-fi."""
    y = filtro(ruido(dur), 2000, 8000) * 0.012
    n = int(dur * 9)
    for pos in _azar.integers(0, len(y) - 200, n):
        y[pos:pos + 60] += _azar.standard_normal(60) * np.exp(-np.arange(60) / 8) * _azar.uniform(0.05, 0.2)
    return y


# ---------------------------------------------------------------- efectos

def pop(tono=1.0):
    t = _t(0.07)
    return _cierre(np.sin(_fase(tono * (500 + 900 * t / 0.07))) * _env(t, 0.003, 30) * 0.5)


def silbido(f0, f1, dur, vibrato=7.0):
    """Silbato de émbolo (slide whistle): sube o baja de f0 a f1."""
    t = _t(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.02 * np.sin(TAU * vibrato * t))
    y = np.sin(_fase(f)) + 0.15 * np.sin(2 * _fase(f))
    env = np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.08)
    return y * env * 0.4


def zumbido(dur=0.5, bajo_hz=400, alto_hz=3000):
    """'Fiuuu' de aire (whoosh)."""
    t = _t(dur)
    return filtro(ruido(dur), bajo_hz, alto_hz) * np.sin(np.pi * t / dur) ** 2 * 0.35


def boing(dur=0.6):
    t = _t(dur)
    f = (160 + 260 * (1 - np.exp(-t * 5))) * (1 + 0.12 * np.sin(TAU * 16 * t) * np.exp(-t * 3))
    return _cierre(np.sin(_fase(f)) * _env(t, 0.005, 4.5) * 0.5)


def brillito():
    """Arpegio de campanitas (aparece la aureola, algo tierno)."""
    y = np.zeros(int(0.9 * SR))
    for i, n in enumerate(["C6", "E6", "G6", "C7", "E7"]):
        poner(y, campana(nota(n), 0.6, 6), i * 0.06, 0.6)
    return y


def pasitos(n, intervalo=0.09, tono=1.0):
    y = np.zeros(int((n * intervalo + 0.1) * SR))
    t = _t(0.05)
    golpe = filtro(ruido(0.05), 1200 * tono, 5000 * tono) * np.exp(-t * 140) * 0.5
    for i in range(n):
        poner(y, golpe, i * intervalo, 0.6 + 0.4 * (i % 2))
    return y


def puf(dur=0.6):
    t = _t(dur)
    return filtro(ruido(dur), 120, 1400) * _env(t, 0.01, 7) * 0.9


def portazo():
    t = _t(0.6)
    y = (np.sin(TAU * 62 * t) + 0.5 * np.sin(TAU * 124 * t)) * np.exp(-t * 11)
    y += filtro(ruido(0.6), 60, 500) * np.exp(-t * 25) * 0.9
    y += filtro(ruido(0.6), 2500) * np.exp(-t * 180) * 0.6
    return _cierre(y * 0.8)


def chirrido_puerta(dur=0.7):
    """Bisagra que rechina: tren de pulsos irregular que hace resonar un filtro."""
    t = _t(dur)
    f = 55 + 45 * np.sin(TAU * 1.4 * t) + 15 * np.sin(TAU * 7.3 * t)
    fase = np.cumsum(f) / SR
    pulsos = np.zeros_like(t)
    pulsos[np.nonzero(np.diff(np.floor(fase)))[0]] = 1.0
    k = np.arange(int(0.012 * SR)) / SR
    nucleo = np.sin(TAU * 1300 * k) * np.exp(-k * 350) + 0.6 * np.sin(TAU * 2350 * k) * np.exp(-k * 500)
    y = np.convolve(pulsos, nucleo)[:len(t)]
    return _cierre(_norm(y, 0.5) * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.1))


def disco_rayado():
    y = np.zeros(int(0.45 * SR))
    for ini, d, f0, f1 in ((0.0, 0.16, 900, 160), (0.17, 0.14, 200, 1000)):
        t = _t(d)
        f = f0 * (f1 / f0) ** (t / d)
        tono = np.sin(_fase(f)) * 0.3 + filtro(ruido(d), 300, 3000) * 0.6
        poner(y, tono * np.sin(np.pi * t / d), ini)
    return y


def golpe_dramatico():
    """Tres golpes de orquesta 'tan, tan, TAAAN'."""
    y = np.zeros(int(3.0 * SR))
    for i, (ini, dur) in enumerate(((0.0, 0.3), (0.32, 0.3), (0.64, 2.2))):
        t = _t(dur)
        sonido = np.zeros_like(t)
        for n in ("C2", "G2", "C3", "Eb3", "G3"):
            f = nota(n) * (2 ** (-1 / 12) if i == 1 else 1)
            for k in range(1, 12):
                sonido += np.sin(TAU * f * k * t) / k * np.exp(-t * (1.5 + 0.4 * k))
        sonido *= np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05)
        poner(y, sonido * 0.18, ini)
        tt = _t(1.2)
        poner(y, np.sin(TAU * 58 * tt) * np.exp(-tt * 4) * 0.8, ini)
    return y


def ladrido(tono=1.0):
    """'¡Guau!' de dibujo animado: tono que cae, con formantes y algo de ruido."""
    dur = 0.24
    t = _t(dur)
    f0 = tono * (270 + 330 * np.exp(-t * 13))
    fase = _fase(f0)
    formante = 500 + 650 * (1 - np.exp(-t * 55))
    y = np.zeros_like(t)
    for k in range(1, 28):
        fk = k * f0
        a = np.exp(-((fk - formante) / 420) ** 2) + 0.35 * np.exp(-((fk - 2400) / 700) ** 2) + 0.12 / k
        y += a * np.sin(k * fase)
    y += filtro(ruido(dur), 400, 3000) * np.exp(-t * 30) * 0.6
    y *= np.minimum(1, t / 0.004) * np.exp(-t * 7) * np.minimum(1, (dur - t) / 0.03)
    return _norm(np.tanh(_norm(y) * 2.0), 0.8)


def grunido(dur=1.6):
    """Gruñido juguetón mientras sacude el cojín."""
    t = _t(dur)
    f0 = 95 + 12 * np.sin(TAU * 3.3 * t)
    fase = _fase(f0)
    y = sum(np.sin(k * fase) / k for k in range(1, 40))
    y *= 0.6 + 0.4 * np.sin(TAU * 27 * t)
    y = filtro(y, 150, 1600)
    return _norm(y, 0.5) * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15)


def gemido():
    """Gemidito tierno de perro ('iiiih')."""
    dur = 0.6
    t = _t(dur)
    f = (1000 - 380 * t / dur) * (1 + 0.025 * np.sin(TAU * 7 * t))
    y = np.sin(_fase(f)) + 0.3 * np.sin(2 * _fase(f))
    y *= np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.2)
    return filtro(y, 400, 4000) * 0.35


def rasgado(dur=0.45):
    """Tela que se rompe: ráfagas de crujidos."""
    t = _t(dur)
    impulsos = np.zeros_like(t)
    pos = _azar.integers(0, len(t), int(dur * 380))
    impulsos[pos] = _azar.uniform(0.3, 1.0, len(pos))
    k = np.arange(int(0.004 * SR)) / SR
    y = np.convolve(impulsos * _azar.choice([-1, 1], len(t)), np.exp(-k * 900))[:len(t)]
    y = filtro(y + ruido(dur) * 0.15, 900, 7000)
    return _norm(y, 0.8) * np.minimum(1, t / 0.02) * (1 - t / dur) ** 0.5


def choque_ceramica():
    y = np.zeros(int(1.4 * SR))
    for ini, vol in ((0.0, 1.0), (0.11, 0.45), (0.23, 0.3)):
        t = _t(0.9)
        s = filtro(ruido(0.9), 2000) * np.exp(-t * 16) * 0.6
        for f in _azar.uniform(2300, 7000, 8):
            s += np.sin(TAU * f * t) * np.exp(-t * _azar.uniform(6, 16)) * 0.12
        if ini == 0.0:
            s += np.sin(TAU * 85 * t) * np.exp(-t * 16) * 0.9
        poner(y, s * vol, ini)
    return y


def golpe_madera(f=700):
    t = _t(0.18)
    return _cierre((np.sin(TAU * f * t) + 0.5 * np.sin(TAU * f * 1.73 * t)) * np.exp(-t * 35) * 0.6)


def alarma(dur=1.8):
    """Campanas metálicas del despertador sonando muy rápido."""
    t = _t(dur)
    golpeteo = 0.55 + 0.45 * np.sign(np.sin(TAU * 22 * t))
    y = sum(np.sin(TAU * f * t) * a for f, a in ((2150, 1.0), (3170, 0.6), (4630, 0.35), (1080, 0.3)))
    y *= golpeteo * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.03)
    return y * 0.22


def ronquido(dur=2.4):
    """Un ciclo de ronquido: inhala rasposo y exhala con silbidito."""
    y = np.zeros(int(dur * SR))
    t = _t(dur * 0.5)
    inhala = filtro(ruido(dur * 0.5), 60, 650)
    inhala *= 0.6 + 0.4 * np.sin(TAU * 38 * t)
    inhala *= np.sin(np.pi * t / (dur * 0.5)) ** 1.5
    poner(y, inhala * 0.55, 0.0)
    t2 = _t(dur * 0.4)
    exhala = np.sin(_fase(900 - 250 * t2 / (dur * 0.4))) * np.sin(np.pi * t2 / (dur * 0.4)) ** 2 * 0.12
    exhala += filtro(ruido(dur * 0.4), 800, 3000) * np.sin(np.pi * t2 / (dur * 0.4)) ** 2 * 0.08
    poner(y, exhala, dur * 0.52)
    return y


def maullido(dur=0.9, tono=1.0, flojo=False):
    """'Miau' sintetizado: el tono sube y baja mientras el formante pasa de 'i' a 'au'."""
    t = _t(dur)
    x = t / dur
    f0 = tono * (330 + 260 * np.sin(np.pi * np.minimum(1, x * 1.3)) - (60 if flojo else 0) * x)
    fase = _fase(f0)
    formante = 700 + 900 * np.sin(np.pi * np.minimum(1, x * 1.6)) ** 2
    y = np.zeros_like(t)
    for k in range(1, 24):
        fk = k * f0
        a = np.exp(-((fk - formante) / 380) ** 2) + 0.25 * np.exp(-((fk - 2800) / 600) ** 2) + 0.05 / k
        y += a * np.sin(k * fase)
    y *= np.minimum(1, t / 0.06) * np.minimum(1, (dur - t) / 0.25)
    return _norm(y, 0.5)


def chillido_raton():
    y = np.zeros(int(0.35 * SR))
    for i in range(2):
        t = _t(0.07)
        f = 2600 + 1200 * np.sin(np.pi * t / 0.07)
        poner(y, np.sin(_fase(f)) * np.sin(np.pi * t / 0.07) * 0.35, i * 0.11)
    return y


def croquetas(dur=0.6):
    """Croquetas cayendo en el plato."""
    y = np.zeros(int((dur + 0.3) * SR))
    t = _t(0.04)
    for ini in np.sort(_azar.uniform(0, dur, int(dur * 45))):
        f = _azar.uniform(2500, 5000)
        poner(y, np.sin(TAU * f * t) * np.exp(-t * 120) * _azar.uniform(0.1, 0.3), ini)
    t = _t(0.8)
    tintineo = (np.sin(TAU * 1850 * t) + 0.6 * np.sin(TAU * 2770 * t)) * np.exp(-t * 6) * 0.25
    poner(y, tintineo, 0.0)
    return y


def olfateo():
    y = np.zeros(int(0.5 * SR))
    t = _t(0.08)
    for i in range(3):
        poner(y, filtro(ruido(0.08), 2500, 7000) * np.sin(np.pi * t / 0.08) * 0.35, i * 0.13)
    return y


def crujido():
    """Un 'ñam' crujiente."""
    t = _t(0.12)
    y = filtro(ruido(0.12), 900, 5000) * np.exp(-t * 30) * 0.5
    y += np.sin(TAU * 140 * t) * np.exp(-t * 40) * 0.3
    return y


def laser(dur=0.14):
    t = _t(dur)
    f = 3200 * (900 / 3200) ** (t / dur)
    return np.sin(_fase(f)) * _env(t, 0.003, 18) * 0.25


def bostezo():
    """Bostezo largo de gato: maullido flojo y lento."""
    return maullido(1.3, tono=0.8, flojo=True) * 0.9
