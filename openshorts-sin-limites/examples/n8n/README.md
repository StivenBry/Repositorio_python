# OpenShorts Sin Límites + n8n

Dos workflows importables, ya apuntando a tu servidor (`http://localhost:8000`).
Si n8n corre en Docker, cambia esa dirección en los nodos HTTP por
`http://host.docker.internal:8000` (o la IP de tu servidor).

| Workflow | Qué hace |
|---|---|
| `openshorts-clip-and-notify.json` | Entra una URL por un formulario y los clips vuelven por un webhook firmado. Sin sondeos. |
| `openshorts-content-machine.json` | Tu canal de YouTube en piloto automático: un vídeo al día, botones de aprobación en Telegram, publicación escalonada y resumen semanal de estadísticas. |

## Configuración común

1. En n8n: **Workflows → Import from file** y elige el workflow.
2. Los nodos usan una credencial **Header Auth** llamada `OpenShorts API key`.
   Tu servidor no pide clave: crea esa credencial con cualquier valor (por
   ejemplo `Authorization` / `Bearer local`).
3. Abre el nodo **Clips ready (webhook)**, copia su URL de producción y pégala
   como `webhook_url` en el cuerpo del nodo **Start OpenShorts job**.
4. Opcional: cambia `webhook_secret`. El servidor firma el cuerpo con
   HMAC-SHA256 en `X-OpenShorts-Signature: sha256=<hex>`; verifícalo en un nodo
   Code con:

   ```javascript
   const crypto = require('crypto');
   const expected = 'sha256=' + crypto
     .createHmac('sha256', 'change-me')
     .update(JSON.stringify($json.body))
     .digest('hex');
   ```

## Publicar desde n8n (Content Machine)

La publicación usa tu cuenta de [Upload-Post](https://www.upload-post.com/):

- Pon `UPLOAD_POST_API_KEY=...` en el `.env` del servidor.
- En el cuerpo del nodo **Schedule social post** añade
  `"user_id": "<tu perfil de Upload-Post>"`.
- En los nodos que leen la cola y las estadísticas (`/api/social/scheduled`,
  `/api/social/analytics/...`) añade el parámetro `?user=<tu perfil>`.

Y para Telegram: crea un bot con [@BotFather](https://t.me/BotFather), añade la
credencial `Telegram bot` y cambia `YOUR_TELEGRAM_CHAT_ID` en los nodos de aviso.
Pon el id de tu canal en el nodo **Channel RSS feed**.

El workflow recuerda qué vídeos ya procesó en los datos estáticos de n8n, que
solo se guardan en ejecuciones de **producción** (las pruebas en el editor no
avanzan).

## Carga del webhook

```json
{
  "event": "job.completed",
  "job_id": "…",
  "status": "completed",
  "clips": [
    { "index": 0, "title": "…", "video_url": "…", "download_url": "…" }
  ]
}
```

Los trabajos fallidos disparan el mismo webhook con `"event": "job.failed"` y un
campo `error`, así el flujo nunca se queda esperando.

Referencia completa de la API: `http://localhost:8000/docs` en tu servidor.
