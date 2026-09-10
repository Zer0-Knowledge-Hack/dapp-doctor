# Burning Token — reglas de sesión

MCP: `burning-token` → `https://app.burningtoken.dev/api/mcp` (HTTP, scope user).

## Ruteo obligatorio de tools

Nunca respondas de memoria sobre la hackathon, la entrega o los proyectos. Los datos
cambian en vivo; siempre llamá la tool.

- **Al arrancar la sesión:** llamar `get_my_status` y reportar:
  1. tiempo que queda para entregar
  2. tareas pendientes
  3. estado de los proyectos
- **Pregunta sobre un proyecto** → `get_my_projects`
- **Pregunta sobre la entrega actual** → `get_my_submission`
- **Cualquier pregunta sobre la hackathon** → **siempre** `ask_hackathon` con la pregunta
  textual del usuario en `question`, aunque ya sepas la respuesta. Recién después usá
  las otras tools si hace falta.

## Prohibido

- No intentar guardar/enviar la entrega desde el MCP. Derivar al usuario al **formulario
  del proyecto en la plataforma**.
