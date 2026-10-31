# Videos de mascotas (shorts verticales 9:16)

Dos shorts animados de unos 25 segundos (1080×1920, 30 fps, con música, efectos de sonido y subtítulos en español). Todo se genera con código: los dibujos con cairo, el sonido sintetizado con numpy y el video final con ffmpeg.

| Video | Historia |
| --- | --- |
| [`videos/perro_travieso.mp4`](videos/perro_travieso.mp4) | «Cuando dejas a tu perro solo 5 minutos…»: el perro activa el modo travieso, destroza un cojín, tira la planta y llena la sala de papel higiénico. Cuando el dueño vuelve, pone carita de «yo no fui» con aureola incluida. |
| [`videos/gato_holgazan.mp4`](videos/gato_holgazan.mp4) | «Mi gato un lunes a las 7:00 a.m.»: apaga el despertador de un manotazo sin levantarse, deja pasar al ratón, estira la pata hasta el plato para no caminar, «juega» con el láser moviendo solo los ojos y termina escurriéndose del sofá con la batería al 1 %. |

## Volver a generarlos

Requisitos: Python 3, `ffmpeg` y las librerías de `requirements.txt`.

```bash
pip install -r requirements.txt
python3 perro_travieso.py
python3 gato_holgazan.py
```

Para revisar cuadros sueltos sin generar todo el video, pasa los segundos que quieras ver; se guardan como PNG en `/tmp`:

```bash
python3 gato_holgazan.py 11.5 19.1
```

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `animacion.py` | Motor de animación: curvas de movimiento, figuras con contorno, subtítulos, partículas, cámara y render con ffmpeg. |
| `sonido.py` | Sintetizador: instrumentos (ukelele, piano eléctrico, campanitas, batería) y efectos (ladrido, maullido, ronquido, alarma, etc.). |
| `perro_travieso.py` | Personaje, escenario, guion y sonido del video del perro. |
| `gato_holgazan.py` | Personaje, escenario, guion y sonido del video del gato. |
