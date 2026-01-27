# Plan: Clonar y Probar Plugin Pix para Claude Code

## Resumen

Este documento contiene toda la información necesaria para:
1. Entender la Chrome Extension de Claude
2. Clonar el plugin Pix en un repositorio propio
3. Probarlo y modificarlo

---

## Parte 1: Claude in Chrome Extension

### ¿Qué es?

La extensión "Claude in Chrome" permite que Claude Code controle tu navegador Chrome directamente desde la terminal. Puede:

- Navegar páginas
- Hacer clic en elementos
- Llenar formularios
- Leer console logs y network requests
- Tomar screenshots
- Grabar GIFs
- Manejar múltiples tabs

### Requisitos

| Componente | Versión mínima |
|------------|----------------|
| Google Chrome | Última versión |
| Claude in Chrome Extension | 1.0.36+ |
| Claude Code CLI | 2.0.73+ |
| Plan de Claude | Pro, Team, o Enterprise |

### Instalación

1. **Instalar la extensión**:
   - Ir a [Chrome Web Store - Claude](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
   - Click en "Add to Chrome"
   - Reiniciar Chrome después de instalar

2. **Verificar versión de Claude Code**:
   ```bash
   claude --version
   # Debe ser 2.0.73 o superior
   ```

3. **Actualizar Claude Code si es necesario**:
   ```bash
   claude update
   ```

4. **Iniciar con Chrome habilitado**:
   ```bash
   claude --chrome
   ```

5. **Verificar conexión**:
   ```
   /chrome
   ```

### Cómo funciona internamente

```
┌─────────────┐    Native Messaging API    ┌─────────────────┐
│ Claude Code │ ◄────────────────────────► │ Chrome Extension│
│   (CLI)     │                            │  (Browser)      │
└─────────────┘                            └─────────────────┘
       │                                           │
       │ Comandos                                  │ Ejecuta
       ▼                                           ▼
  "click button"  ─────────────────────►  [Hace clic real]
  "take screenshot" ◄───────────────────  [Captura pantalla]
```

- Claude Code envía comandos via Native Messaging API
- La extensión ejecuta las acciones en el navegador real
- No hay modo headless - ves todo en tiempo real
- Comparte el estado de login de tu Chrome

### Capacidades disponibles

Ver todas las herramientas con `/mcp` → `claude-in-chrome`:

| Herramienta | Descripción |
|-------------|-------------|
| `navigate` | Ir a una URL |
| `click` | Hacer clic en elementos |
| `type` | Escribir texto |
| `scroll` | Hacer scroll |
| `screenshot` | Capturar pantalla |
| `read_console` | Leer console logs |
| `read_network` | Ver network requests |
| `manage_tabs` | Crear/cerrar tabs |
| `resize_window` | Cambiar tamaño ventana |
| `record_gif` | Grabar interacciones |

### Habilitar por defecto

```
/chrome
→ Seleccionar "Enabled by default"
```

> **Nota**: Esto aumenta el uso de contexto porque las herramientas de Chrome siempre están cargadas.

---

## Parte 2: Anatomía del Plugin Pix

### Estructura del repositorio

```
pix/
├── .claude-plugin/
│   └── plugin.json        # Metadatos del plugin
├── skills/
│   └── pix/
│       └── SKILL.md       # El "cerebro" - instrucciones para Claude
└── README.md
```

### Archivo `plugin.json`

```json
{
  "name": "pix",
  "description": "Build frontend on autopilot. Pixel-perfect Figma-to-code.",
  "version": "1.0.0",
  "author": {
    "name": "skobak"
  },
  "homepage": "https://github.com/skobak/pix",
  "repository": "https://github.com/skobak/pix",
  "license": "MIT",
  "keywords": ["figma", "frontend", "pixel-perfect", "mcp"]
}
```

### Archivo `SKILL.md` - Frontmatter

```yaml
---
name: pix
description: Launches an autonomous, pixel-perfect UI implementation loop
allowed-tools: [Bash, Read, Glob, Grep, Edit, Write]
---
```

### El algoritmo (en prosa)

El SKILL.md contiene ~400 líneas de instrucciones detalladas en 4 fases:

1. **Phase 0: Project Discovery**
   - Detectar package manager (npm/yarn/pnpm/bun)
   - Detectar dev server y puerto
   - Detectar design system (Tailwind/CSS-in-JS/etc)
   - Detectar icon library
   - Verificar MCP y Chrome

2. **Phase 1: Context Gathering**
   - Abrir Chrome en localhost
   - Pedir link de Figma al usuario

3. **Phase 2: Deep Execution**
   - Extraer datos de Figma via MCP
   - Verificar TODAS las propiedades (font, spacing, colors, etc)
   - Sincronizar con design system
   - Implementar código
   - Loop de comparación screenshot vs screenshot

4. **Phase 3: Recursive Refinement**
   - Si hay diferencia (incluso 1px), corregir y repetir

5. **Phase 4: User Review**
   - Mostrar resultado y pedir feedback

---

## Parte 3: Plan de Implementación

### Paso 1: Crear el repositorio

```bash
# Crear directorio
mkdir ~/mi-plugin-pix
cd ~/mi-plugin-pix

# Inicializar git
git init

# Crear estructura
mkdir -p .claude-plugin
mkdir -p skills/pix
```

### Paso 2: Crear `plugin.json`

```bash
cat > .claude-plugin/plugin.json << 'EOF'
{
  "name": "mi-pix",
  "description": "Mi versión del plugin Pix - Figma to code pixel-perfect",
  "version": "0.1.0",
  "author": {
    "name": "tu-usuario"
  },
  "homepage": "https://github.com/tu-usuario/mi-pix",
  "repository": "https://github.com/tu-usuario/mi-pix",
  "license": "MIT",
  "keywords": [
    "figma",
    "frontend",
    "pixel-perfect",
    "mcp",
    "chrome"
  ]
}
EOF
```

### Paso 3: Crear `SKILL.md`

```bash
cat > skills/pix/SKILL.md << 'EOF'
---
name: pix
description: Launches an autonomous, pixel-perfect UI implementation loop using Figma MCP and Chrome.
allowed-tools: [Bash, Read, Glob, Grep, Edit, Write]
---

# /pix: The Pixel-Perfect Autonomous Loop

> **Note**: This skill requires Figma MCP and Claude Chrome extension.

## Phase 0: Project Discovery

### 1. Package Manager Detection
Check which lockfile exists:
- `package-lock.json` → npm
- `yarn.lock` → yarn
- `pnpm-lock.yaml` → pnpm
- `bun.lockb` → bun

### 2. Dev Server Detection
Read `package.json` scripts. Check for port in:
- `vite.config.*`
- `next.config.*`
- `.env*`
- Default: 5173 (Vite), 3000 (Next), 8080 (Vue)

### 3. Design System Detection
Scan `package.json` for:
- **Tailwind**: `tailwindcss`
- **CSS-in-JS**: `styled-components`, `@emotion/*`
- **Component Libraries**: `@chakra-ui/*`, `@mui/*`

### 4. System Verification
1. Call Figma MCP `whoami` to verify auth
2. Check Chrome extension is connected
3. Start dev server if not running

## Phase 1: Context Gathering

Open Chrome at `localhost:<PORT>`.

**Ask user**: "Paste the Figma link to the component you want to build"

## Phase 2: Deep Execution

### 1. Extract from Figma MCP
- `get_metadata` → component hierarchy
- `get_design_context` → layout, spacing, styles
- `get_variable_defs` → colors, tokens
- `get_code_connect_map` → existing component mappings

### 2. Verify ALL Properties
**Text**: font-family, font-size, font-weight, line-height, letter-spacing, color
**Container**: width, height, padding, margin, background-color, border-radius, box-shadow
**Icon**: size, fill, stroke (independent from text color!)

### 3. Implement & Compare
1. Write the code
2. Screenshot the app (Chrome)
3. Screenshot Figma (`get_screenshot`)
4. Compare pixel-by-pixel
5. Fix any differences

## Phase 3: Recursive Refinement

If ANY discrepancy (even 1px):
1. Explain what's wrong
2. Fix the code
3. Repeat Phase 2 Step 3

**Success**: Only done when screenshots are indistinguishable.

## Phase 4: User Review

Ask: "Here's the final result. Are you happy with it?"

If user provides new link → re-run Phase 2 for that specific area.

**ULTRA-THINK MODE**: Take your time. Perfection over speed.
EOF
```

### Paso 4: Crear README

```bash
cat > README.md << 'EOF'
# Mi Plugin Pix

Fork personal del plugin Pix para experimentación.

## Instalación

```bash
claude plugin install github:tu-usuario/mi-pix
```

## Requisitos

- Claude Code v2.0.73+
- Claude in Chrome extension v1.0.36+
- Figma MCP configurado
- Plan Pro/Team/Enterprise

## Uso

```bash
claude --chrome
```

Luego:
```
/pix
```
EOF
```

### Paso 5: Subir a GitHub

```bash
git add .
git commit -m "Initial commit: Mi plugin Pix"
gh repo create mi-pix --public --source=. --push
```

### Paso 6: Instalar y probar

```bash
# Instalar desde tu repo
claude plugin install github:tu-usuario/mi-pix

# Iniciar Claude Code con Chrome
claude --chrome

# Probar el skill
/pix
```

---

## Parte 4: Configurar Figma MCP (Prerrequisito)

Para que el plugin funcione, necesitas Figma MCP configurado.

### Opción A: Usar el MCP oficial de Figma

Seguir la [guía oficial de Figma MCP](https://help.figma.com/hc/en-us/articles/32132100833559).

### Opción B: Verificar configuración existente

```bash
# En Claude Code
/mcp
```

Buscar herramientas que empiecen con `figma__` o `mcp__figma__`.

### Herramientas requeridas del Figma MCP

| Herramienta | Propósito |
|-------------|-----------|
| `whoami` | Verificar autenticación |
| `get_metadata` | Estructura de componentes |
| `get_design_context` | Especificaciones de diseño |
| `get_variable_defs` | Design tokens |
| `get_code_connect_map` | Mapeo a componentes existentes |
| `get_screenshot` | Captura de Figma |

---

## Parte 5: Ideas de Personalización

Una vez que tengas el plugin funcionando, puedes personalizarlo:

### 5.1 Agregar soporte para más frameworks

```markdown
### Framework Detection
- `angular.json` → Angular
- `svelte.config.js` → SvelteKit
- `astro.config.mjs` → Astro
```

### 5.2 Agregar validación de accesibilidad

```markdown
### Accessibility Check
After implementation, verify:
- All images have alt text
- Buttons have accessible names
- Color contrast meets WCAG AA
```

### 5.3 Crear skill para solo extraer tokens

```yaml
---
name: figma-tokens
description: Extract design tokens from Figma and sync to project
allowed-tools: [Bash, Read, Write, Edit]
---
```

### 5.4 Crear skill para comparación visual sin Figma

```yaml
---
name: visual-diff
description: Compare two URLs and report visual differences
allowed-tools: [Bash, Read, Write]
---
```

---

## Parte 6: Troubleshooting

### "Chrome extension not detected"

1. Verificar extensión instalada (v1.0.36+)
2. Verificar Claude Code actualizado (v2.0.73+)
3. Reiniciar Chrome
4. Ejecutar `/chrome` → "Reconnect extension"

### "Figma MCP not connected"

1. Ejecutar `/mcp` y verificar que Figma esté listado
2. Seguir guía de configuración de Figma MCP
3. Verificar token de Figma válido

### El skill no aparece

1. Verificar que el plugin esté instalado: `claude plugin list`
2. Verificar estructura de archivos correcta
3. Verificar YAML frontmatter válido en SKILL.md

### Screenshots no coinciden

El plugin es muy estricto. Verificar:
- Zoom del navegador al 100%
- No hay extensiones que modifiquen el DOM
- El viewport size coincide

---

## Parte 7: Recursos

- [Documentación Chrome Integration](https://code.claude.com/docs/en/chrome)
- [Chrome Extension en Web Store](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
- [Repositorio original Pix](https://github.com/skobak/pix)
- [Figma MCP Setup Guide](https://help.figma.com/hc/en-us/articles/32132100833559)
- [Claude Code Docs](https://code.claude.com/docs)

---

## Checklist Rápido

- [ ] Chrome instalado
- [ ] Claude in Chrome extension instalada (v1.0.36+)
- [ ] Claude Code actualizado (v2.0.73+)
- [ ] Plan Pro/Team/Enterprise activo
- [ ] Figma MCP configurado
- [ ] Repositorio creado con estructura correcta
- [ ] Plugin instalado: `claude plugin install github:tu-usuario/mi-pix`
- [ ] Probado con `claude --chrome` → `/pix`

---

*Documento generado el 26 de Enero 2026*
