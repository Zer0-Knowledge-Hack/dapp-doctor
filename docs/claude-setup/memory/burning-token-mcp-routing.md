---
name: burning-token-mcp-routing
description: How to route Burning Token hackathon questions to the burning-token MCP tools instead of answering from memory
metadata:
  type: feedback
---

Con el MCP `burning-token` (https://app.burningtoken.dev/api/mcp, scope user, HTTP) el usuario pidió estas reglas fijas:

- Al arrancar una sesión: llamar `get_my_status` y reportar tiempo restante para entregar, tareas pendientes y estado de los proyectos.
- Preguntas sobre un proyecto → `get_my_projects`.
- Preguntas sobre la entrega actual → `get_my_submission`.
- Cualquier pregunta sobre la hackathon → **siempre** `ask_hackathon` con la pregunta del usuario en `question`, aunque ya se sepa la respuesta. Recién después usar las otras tools si hace falta.
- No intentar guardar/enviar la entrega desde el MCP: derivar al usuario al formulario del proyecto en la plataforma.

**Why:** los datos de la hackathon cambian en vivo; responder de memoria da información desactualizada o inventada.

**How to apply:** ante cualquier consulta de hackathon/entrega/proyectos, la primera acción es la tool correspondiente, nunca una respuesta de memoria.
