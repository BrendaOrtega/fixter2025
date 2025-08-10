# Capítulo 5: Slash Commands Completos - Control de Sesión Avanzado

## La Revolución del Control Granular

Los slash commands de Claude Code representan una evolución fundamental en cómo controlamos sistemas inteligentes durante sesiones interactivas. No son simplemente comandos adicionales; son la interface que te permite moldear, dirigir, y optimizar la experiencia conversacional de desarrollo según las necesidades específicas de cada momento y contexto.

Mientras que los comandos CLI te permiten iniciar y configurar sesiones, los slash commands te dan control granular sobre el comportamiento de Claude Code una vez que estás dentro de una conversación activa. Esta dualidad—broad control através de CLI, fine-grained control através de slash commands—crea un ecosystem de interacción que es tanto poderoso como intuitivo.

La maestría de los slash commands transforma tu relación con Claude Code desde user-tool a verdadera colaboración, donde puedes adaptar dinámicamente la personalidad, focus, y capabilities del sistema para alinear perfectamente con tu flujo de thinking y trabajo.

## Comandos de Control Fundamental

### `/clear` - Limpieza Estratégica de Contexto

El comando más directo pero también uno de los más estratégicamente importantes:

```bash
/clear
# Borra toda la historia de la conversación actual
```

**Cuándo Usar `/clear`**:
- **Context overload**: Cuando el contexto se vuelve demasiado amplio o confuso
- **Topic switching**: Al cambiar completamente de tipo de trabajo
- **Fresh perspective**: Cuando necesitas que Claude Code evalúe algo sin bias de discusiones previas
- **Performance optimization**: Para mantener sesiones responsive y focused

**Patrones Efectivos**:
```bash
# Pattern 1: Explicit context reset
/clear
claude "# NUEVO CONTEXTO: Análisis de performance
Este proyecto React tiene problemas de rendering lento..."

# Pattern 2: Strategic topic separation
# ... trabajo extenso en feature A ...
/clear  
# Ahora trabajar en feature B completamente diferente

# Pattern 3: Fresh evaluation
/clear
claude "Evalúa este código sin conocimiento previo - ¿qué piensas?"
```

### `/help` - Información Contextual Inteligente

```bash
/help
# Muestra comandos disponibles y información contextual
```

El sistema de ayuda de Claude Code es intelligente y adaptivo:
- **Context-aware**: Muestra información relevante al estado actual
- **Dynamic**: Se actualiza según las capabilities disponibles
- **Learning-oriented**: Proporciona not just what, sino when y why

### `/model` - Switching de Capacidades en Tiempo Real

Cambio dinámico de modelos durante conversación activa:

```bash
/model sonnet-3.5
# Cambia a Sonnet para análisis balanceado

/model haiku-3  
# Switch a Haiku para respuestas rápidas

/model opus-3
# Upgrade a Opus para análisis profundo
```

**Estrategias de Model Switching**:
```bash
# Pattern: Progressive complexity
/model haiku-3
"¿hay errores de sintaxis obvios en este código?"

/model sonnet-3.5  
"Ahora analiza la arquitectura y sugiere mejoras"

/model opus-3
"Finalmente, haz un security audit completo"
```

### `/add-dir` - Expansión Dinámica de Contexto

```bash
/add-dir /path/to/additional/code
# Incluye directorio adicional en contexto actual
```

**Casos de Uso Avanzados**:
```bash
# Progressive context building
/add-dir ./src/components
"Analiza estos components..."

/add-dir ./src/hooks  
"Ahora considera también estos custom hooks..."

/add-dir ./tests
"Incluye los tests para análisis completo..."
```

## Comandos de Especialización

### `/review` - Modo de Revisión de Código

```bash
/review
# Activa perspectiva especializada en code review
```

En modo review, Claude Code aplica:
- **Quality standards**: Mejores prácticas de código
- **Security focus**: Identificación de vulnerabilities  
- **Performance analysis**: Bottlenecks y optimizations
- **Maintainability assessment**: Code readability y structure

### `/vim` - Modo de Edición Avanzada

```bash
/vim
# Activa modo Vim para entrada de texto
```

**Capabilities del Modo Vim**:
- **Navigation**: `h/j/k/l` para movimiento
- **Editing**: `dd`, `x`, `i/a/o` para modifications
- **Modes**: Normal e Insert mode completos
- **Efficiency**: Rapid text manipulation para power users

### `/terminal-setup` - Configuración de Terminal

```bash
/terminal-setup
# Optimiza configuración para tu terminal específico
```

Ajusta:
- **Multiline input**: `Shift+Enter` functionality
- **Key bindings**: Terminal-specific shortcuts
- **Display optimization**: Formatting for your terminal

## Comandos de Gestión y Configuración

### `/config` - Configuración de Sesión

```bash
/config
# Accede a configuración de sesión actual
```

Permite modificar:
- **Response style**: Verbosity, tone, format
- **Default behaviors**: Auto-analysis, suggestion levels  
- **Context preferences**: Memory management, focus areas

### `/status` - Estado del Sistema

```bash
/status  
# Muestra estado actual del sistema y sesión
```

**Información Disponible**:
- **Session state**: Contexto activo, memory usage
- **Model information**: Current model, token usage
- **Connection status**: MCP servers, integrations
- **Performance metrics**: Response times, efficiency stats

### `/cost` - Monitoreo de Costos

```bash
/cost
# Muestra información de usage y costos
```

**Métricas Incluidas**:
- **Token usage**: Input y output tokens por sesión
- **Cost breakdown**: Por modelo y operación
- **Usage trends**: Patterns over time
- **Optimization suggestions**: Ways to reduce costs

### `/memory` - Gestión de Memoria

```bash
/memory
# Controla qué se mantiene en memory y qué se olvida
```

**Memory Management**:
```bash
/memory save "Esta decisión arquitectónica es importante para el futuro"
/memory forget "contexto específico que ya no es relevante" 
/memory list "muestra qué está guardado en memory persistente"
```

## Comandos de Integración y Extensibilidad

### `/init` - Inicialización de Proyecto

```bash
/init
# Inicializa configuración específica para el proyecto actual
```

Automatically:
- **Detects project type**: Framework, dependencies, structure
- **Sets up context**: Relevant patterns, constraints, best practices
- **Configures tooling**: Appropriate analysis modes y suggestions

### `/mcp` - Model Context Protocol

```bash
/mcp
# Gestiona conexiones y configuración MCP
```

**MCP Operations**:
```bash
/mcp list     # Muestra servers disponibles
/mcp connect github-server  # Conecta a specific server
/mcp disconnect service-name # Desconecta service
```

### `/agents` - Gestión de Subagentes

```bash
/agents
# Lista y manage subagentes especializados
```

**Agent Management**:
```bash
/agents list                    # Show available agents
/agents use security-reviewer   # Switch to security expert
/agents custom my-reviewer      # Use custom agent
```

## Comandos de Desarrollo y Debugging

### `/doctor` - Diagnóstico del Sistema

```bash
/doctor
# Ejecuta diagnósticos comprehensivos del sistema
```

**Health Checks**:
- **Configuration validity**: Settings y connections
- **Performance status**: Response times, bottlenecks
- **Integration status**: MCP servers, external tools
- **Recommendations**: Optimizations y improvements

### `/bug` - Reporte de Issues

```bash
/bug
# Facilita reporting de bugs o unexpected behavior
```

**Automated Bug Reporting**:
- **Context capture**: Current session state, inputs
- **Error details**: Stack traces, error messages  
- **Environment info**: OS, version, configuration
- **Reproduction steps**: What led to the issue

### `/permissions` - Control de Acceso

```bash
/permissions
# Gestiona permissions para file access y operations
```

**Security Controls**:
```bash
/permissions grant read ./src     # Allow reading source
/permissions deny write ./config  # Prevent config changes
/permissions list                 # Show current permissions
```

## Comandos de Revisión y Calidad

### `/pr_comments` - Comentarios de Pull Request

```bash
/pr_comments
# Genera comentarios structured para PRs
```

**PR Comment Generation**:
- **Structured feedback**: Organized by category y priority
- **Actionable suggestions**: Specific improvements with code examples
- **Standards compliance**: Alignment con team conventions
- **Constructive tone**: Helpful rather than critical

### `/compact` - Respuestas Concisas

```bash
/compact
# Switch to concise response mode
```

**Compact Mode Benefits**:
- **Efficiency**: Faster reading y processing  
- **Focus**: Essential information only
- **Clarity**: Reduced cognitive load
- **Speed**: Quicker iterations y feedback

## Comandos de Autenticación y Configuración

### `/login` y `/logout` - Gestión de Sesión

```bash
/login
# Autentica o re-autentica sesión

/logout  
# Cierra sesión y clear credentials
```

**Session Management**:
- **Secure authentication**: Token-based, time-limited
- **Context preservation**: Maintain session state appropriately
- **Clean termination**: Proper cleanup on logout

## Slash Commands Personalizados

### Creación de Commands Específicos

Los slash commands más poderosos son los que creates para tu workflow específico:

**Ubicaciones**:
- `.claude/commands/` (específico del proyecto)
- `~/.claude/commands/` (personal, global)

### Ejemplo: Command de Performance Analysis

```markdown
# /analyze-performance

Analiza el rendimiento del código actual enfocándose en:

- Complejidad algorítmica y optimizaciones potenciales
- Memory usage y potential leaks  
- Database query efficiency y N+1 problems
- Frontend bundle size y rendering optimization
- Network request patterns y caching opportunities

## Arguments

- `--deep`: Incluye profiling detallado y benchmarks
- `--focus=area`: Concentra análisis en área específica
- `--report`: Genera reporte estructurado en markdown

## Examples

```bash
/analyze-performance
/analyze-performance --deep --focus=database
/analyze-performance --report > performance-analysis.md
```
```

### Ejemplo: Command de Security Audit

```markdown
# /security-audit

Ejecuta audit de seguridad comprehensivo incluyendo:

- Vulnerability scanning en dependencies
- Code analysis para security antipatterns  
- Configuration review para security misconfigurations
- Authentication y authorization flow analysis
- Data handling y privacy compliance check

## Usage

```bash
/security-audit            # Full audit
/security-audit --quick    # Fast scan only
/security-audit --severe   # Only high-severity issues
```
```

## Patterns Avanzados de Slash Commands

### Combinaciones Estratégicas

```bash
# Pattern: Progressive analysis
/clear
/init
"Establecer contexto para proyecto React e-commerce..."

/add-dir ./src/components
/review
"Revisar quality de estos components..."

/model opus-3
/security-audit
"Deep security analysis..."

/compact
/pr_comments  
"Generate concise PR feedback..."
```

### Context Management Workflows

```bash
# Pattern: Focused work sessions
/clear
/memory save "Working on checkout flow optimization"

# Work session...

/memory save "Key decision: usando Stripe Elements para PCI compliance"
/add-dir ./src/checkout

# More work...

/status
# Check current session state before break
```

### Quality Assurance Pipelines

```bash
# Pattern: Comprehensive QA
/init
/add-dir ./src ./tests ./docs

/review
"Code quality check..."

/model haiku-3  
"Quick syntax verification..."

/model sonnet-3.5
"Architecture analysis..."  

/security-audit
"Security assessment..."

/pr_comments
"Generate final feedback..."
```

## MCP Slash Commands Dinámicos

Cuando tienes MCP servers configurados, commands adicionales están disponibles dinámicamente:

### GitHub Integration Commands

```bash
/github-issues              # Lista issues del repo
/github-pr                  # Gestiona pull requests  
/github-actions            # Verifica CI/CD status
/github-releases           # Manage releases
```

### Database Integration Commands  

```bash
/db-schema                 # Muestra database schema
/db-query                  # Ejecuta safe queries
/db-migrate               # Manage migrations
/db-backup                # Database backup operations
```

### Deployment Commands

```bash
/deploy-status            # Check deployment state
/deploy-logs             # Retrieve deployment logs
/deploy-rollback         # Rollback to previous version
```

## Best Practices para Slash Commands

### Session Hygiene

```bash
# Start with clean context for complex tasks
/clear
/init

# Establish rich context
/add-dir ./relevant/paths
"Context establishment..."

# Work efficiently  
/compact  # When you need speed
/model haiku-3  # For simple tasks

# Document important decisions
/memory save "Key architectural decision made here"
```

### Performance Optimization

```bash
# Use appropriate model complexity
/model haiku-3    # Simple questions
/model sonnet-3.5  # Balanced analysis  
/model opus-3     # Complex reasoning

# Manage context size
/clear            # When context gets unwieldy
/compact          # For faster responses
```

### Collaborative Workflows

```bash
# Prepare for handoffs
/pr_comments      # Document feedback clearly
/memory save      # Preserve important context
/status          # Check session state before sharing
```

## Troubleshooting Slash Commands

### Common Issues y Solutions

**Problem**: Command not recognized
```bash
/help            # List available commands
/doctor          # Check system status  
/mcp list        # Verify MCP integrations
```

**Problem**: Unexpected behavior
```bash
/clear           # Reset context if confused
/config          # Check session configuration
/permissions     # Verify access rights
```

**Problem**: Performance issues  
```bash
/status          # Check system resources
/compact         # Reduce response complexity
/model haiku-3   # Use faster model
```

## El Futuro de los Slash Commands

### Evolución Anticipada

Los slash commands están evolucionando hacia:
- **Predictive suggestions**: Commands sugeridos basándose en context
- **Natural language parsing**: `/do something complex` interpretado intelligentemente
- **Collaborative commands**: Commands que coordinate multiple agents
- **Learning commands**: Commands que se adaptan a tu usage patterns

### Preparing for Advanced Capabilities  

La maestría actual de slash commands te prepara para:
- **Voice-activated commands**: Slash commands através de voice interface
- **Gesture-based control**: Visual interfaces para command selection
- **AI-suggested workflows**: System recommendations para command sequences
- **Cross-session command memory**: Commands que persisten conhecimento across sessions

## Dominando el Control Granular

Los slash commands de Claude Code te dan unprecedented control sobre tu development experience. No son simplemente features adicionales; son la interface que transforma Claude Code from a tool you use to a collaborator you direct. La maestría de estos commands significa developing intuition sobre cuándo aplicar qué level de control, cómo combinar commands para workflows sofisticados, y cómo adaptar la experience dinámicamente según your changing needs.

Cada slash command representa un dimension de control que puedes exercise. Combined with the CLI foundation del previous capítulo, tienes un toolkit completo para orchestrating intelligent development conversations que se adaptan precisely a your thinking y working style.

En el próximo capítulo, exploraremos cómo aplicar estos foundational skills a GitHub MCP integrations, donde the combination de CLI commands y slash commands enables sophisticated collaborative workflows que transform how teams develop software together.

---

*Los slash commands no solo controlan Claude Code; they unlock tu potential para direct intelligent systems con precision, creating development experiences که are uniquely tuned a tu approach y objectives.*