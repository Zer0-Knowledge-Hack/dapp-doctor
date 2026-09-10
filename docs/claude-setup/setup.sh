#!/usr/bin/env bash
# Restaura el entorno de Claude Code para Burning Token.
# Funciona en cualquier bash: Git Bash (Windows), WSL, Linux, macOS.
#
#   bash setup.sh            -> instala en la carpeta padre de claude-setup/
#   bash setup.sh /ruta/proy -> instala en esa carpeta

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="${1:-$(dirname "$SRC")}"
MCP_NAME="burning-token"
MCP_URL="https://app.burningtoken.dev/api/mcp"

echo "==> Proyecto destino: $PROJECT"
mkdir -p "$PROJECT"

# 1. Chequear que el CLI exista
if ! command -v claude >/dev/null 2>&1; then
  echo "!! No encontré el comando 'claude' en el PATH."
  echo "   Instalalo con:  npm install -g @anthropic-ai/claude-code"
  echo "   y volvé a correr este script."
  exit 1
fi
echo "==> claude: $(command -v claude) ($(claude --version 2>/dev/null || echo '?'))"

# 2. Registrar el MCP en scope user (idempotente)
if claude mcp get "$MCP_NAME" >/dev/null 2>&1; then
  echo "==> MCP '$MCP_NAME' ya estaba registrado; lo re-registro para asegurar la URL."
  claude mcp remove --scope user "$MCP_NAME" >/dev/null 2>&1 || true
fi
claude mcp add --scope user --transport http "$MCP_NAME" "$MCP_URL"

# 3. Copiar CLAUDE.md al proyecto (se carga solo en cada sesión)
cp "$SRC/CLAUDE.md" "$PROJECT/CLAUDE.md"
echo "==> CLAUDE.md copiado a $PROJECT/CLAUDE.md"

# 4. Copiar la memoria persistente al slug del proyecto
#    Claude Code deriva la carpeta reemplazando todo lo no alfanumérico por '-'.
SLUG="$(printf '%s' "$PROJECT" | sed 's/[^a-zA-Z0-9]/-/g')"
MEM_DIR="$HOME/.claude/projects/$SLUG/memory"
mkdir -p "$MEM_DIR"
cp "$SRC/memory/"*.md "$MEM_DIR/"
echo "==> Memoria copiada a $MEM_DIR"

cat <<EOF

------------------------------------------------------------
Listo. Ahora:

  1) cd "$PROJECT"
  2) claude
  3) Escribí  /mcp  -> elegí '$MCP_NAME' -> Authenticate
     (se abre el navegador; iniciás sesión en Burning Token)
  4) Pedile:  "llamá get_my_status"

Si /mcp no lista el server, verificá con:  claude mcp list
------------------------------------------------------------
EOF
