# OpenShorts Sin Límites como Agent Skill

`SKILL.md` y `reference.md` forman una
[Agent Skill](https://github.com/agentskills/agentskills), un estándar abierto
que funciona sin cambios en Claude Code, OpenClaw, Hermes, Codex, Gemini CLI,
Cursor y VS Code.

Le enseña a un agente a convertir un vídeo largo en clips verticales 9:16 a
través de tu servidor: qué opciones dan buenos clips, qué respuestas parecen
errores sin serlo y cuándo parar y preguntar.

## Configuración

Arranca el servidor (`docker compose up --build` en `openshorts-sin-limites/`).
No hace falta clave de API: el agente habla con `http://localhost:8000`. Para
publicar en redes necesitas tu propia cuenta de
[Upload-Post](https://www.upload-post.com/).

Si el agente usa MCP, añade el servidor para que tenga herramientas tipadas:

```bash
claude mcp add --transport http openshorts http://localhost:8000/mcp
# o, sin servidor web, por stdio:
claude mcp add openshorts -- python mcp_stdio.py
```

La skill funciona de las dos formas: con MCP usa las herramientas y sin él usa
la API REST documentada en `reference.md`.

## Instalación

**Claude Code.** Copia la carpeta en `~/.claude/skills/` (todos los proyectos)
o en `.claude/skills/` de un proyecto:

```bash
cp -r skills/openshorts ~/.claude/skills/
```

**Otros agentes.** Copia la carpeta donde ese agente lea sus skills.

## Relacionado

- `cli/`: la misma API desde la terminal (`pip install ./cli`).
- `examples/n8n/`: el mismo flujo como workflows importables de n8n.
- `http://localhost:8000/docs`: documentación completa de la API en tu servidor.
