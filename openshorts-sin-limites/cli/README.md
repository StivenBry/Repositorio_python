# CLI de OpenShorts Sin Límites

Recorta vídeos largos en shorts verticales 9:16 desde la terminal. Sin
dependencias; usa la misma API que el panel, el servidor MCP y los webhooks.

Instálalo desde esta carpeta (el paquete `openshorts` de PyPI es el original y
apunta al servicio de pago):

```bash
pip install ./cli             # desde openshorts-sin-limites/

# Por defecto habla con tu servidor local (http://localhost:8000), sin clave.
openshorts process "https://youtube.com/watch?v=..." --wait
openshorts process "https://youtube.com/watch?v=..." --clips 30 --max-seconds 300 --wait
openshorts clips <job_id>
openshorts publish <job_id> 0 --platforms tiktok,youtube
```

¿El servidor está en otra máquina? Cambia la dirección:

```bash
export OPENSHORTS_API_URL=http://mi-servidor:8000
```

Para automatizaciones, mejor el webhook que `--wait`: pasa `--webhook` y
`--webhook-secret` y el servidor hace un único POST (firmado con HMAC,
`X-OpenShorts-Signature: sha256=<hex>`) cuando el trabajo termina, con los
títulos de los clips y enlaces de descarga.

Esta copia no tiene cuota de minutos ni marca de agua: `openshorts quota`
responde que no hay cuota.
