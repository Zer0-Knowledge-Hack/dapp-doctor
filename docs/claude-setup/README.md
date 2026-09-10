# Claude Code — setup portátil de Burning Token

Todo lo necesario para levantar Claude Code con el MCP de Burning Token **desde bash**,
sin depender de WSL2 / Hyper-V.

Esta carpeta vive en el disco de Windows (`C:\Burning token\claude-setup`), así que
sobrevive a que apagues Hyper-V.

---

## Qué pasa al deshabilitar Hyper-V

WSL2 corre sobre el hipervisor de Hyper-V. Si lo apagás:

- **WSL2 deja de arrancar.** Tu `/home/william` (y con él `~/.claude.json` y
  `~/.claude/`) queda dentro del disco virtual y no se puede montar hasta reactivarlo.
- **No se pierden datos**: el `ext4.vhdx` sigue en disco. Volvés a tenerlo si más
  adelante reactivás Virtual Machine Platform.
- **WSL1 sí funciona** sin Hyper-V, por si preferís convertir la distro
  (`wsl --set-version <distro> 1`) en vez de migrar a Windows nativo.

Por eso este script reconstruye la config desde cero en el bash que uses.

---

## Requisitos

1. **Node.js** en Windows → https://nodejs.org (LTS)
2. **Claude Code**:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
3. Un **bash**: Git Bash (viene con https://git-scm.com/download/win) sirve perfecto.

---

## Instalación

Abrí **Git Bash** y corré:

```bash
cd "/c/Burning token/claude-setup"
bash setup.sh
```

El script:

1. Verifica que `claude` esté en el PATH.
2. Registra el MCP `burning-token` en scope **user** (queda para todos tus proyectos).
3. Copia `CLAUDE.md` a `C:\Burning token\` — son las reglas de ruteo de tools.
4. Copia la memoria persistente a `~/.claude/projects/<slug>/memory/`.

Para instalar en otra carpeta:

```bash
bash setup.sh "/c/otra/carpeta"
```

---

## Autenticación

El OAuth lo tenés que aprobar vos en el navegador; no se puede scriptear.

```bash
cd "/c/Burning token"
claude
```

Dentro de Claude: escribí `/mcp` → elegí **burning-token** → **Authenticate**.

Verificá con:

```bash
claude mcp list
# burning-token: https://app.burningtoken.dev/api/mcp (HTTP) - ✔ Connected
```

---

## Contenido

| Archivo | Para qué |
|---|---|
| `setup.sh` | Instalador idempotente. Ejecutable las veces que quieras. |
| `CLAUDE.md` | Reglas de ruteo de tools. Se copia al proyecto y se carga en cada sesión. |
| `memory/` | Memoria persistente (mismo contenido, formato de auto-memory). |
| `mcp-burning-token.json` | Fragmento de config, por si preferís pegarlo a mano en `~/.claude.json`. |

---

## Alta manual (sin el script)

```bash
claude mcp add --scope user --transport http burning-token https://app.burningtoken.dev/api/mcp
```

---

## Reglas de trabajo que quedan cargadas

- Al arrancar → `get_my_status` (tiempo para entregar, tareas pendientes, estado de proyectos).
- Proyectos → `get_my_projects`
- Entrega actual → `get_my_submission`
- **Cualquier** pregunta de hackathon → **siempre** `ask_hackathon` con la pregunta en `question`,
  aunque la respuesta ya se sepa. Nunca de memoria.
- La entrega **no** se guarda desde el MCP → se manda al formulario del proyecto en la plataforma.
