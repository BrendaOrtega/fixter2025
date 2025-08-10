# Capítulo 4: Comandos CLI Básicos - El Punto de Entrada

## La Revolución de la Interfaz de Terminal

Los comandos CLI de Claude Code representan tu primera interacción con esta nueva forma de desarrollo conversacional. No son simplemente otra herramienta de línea de comandos; son la puerta de entrada a un ecosistema donde la intención se traduce directamente en acción, donde la complejidad se abstrae sin sacrificar control, y donde la productividad se amplifica attraverso de la inteligencia contextual.

Esta revolución comienza en el lugar más familiar para cualquier desarrollador: la terminal. Desde ahí, Claude Code extiende naturalmente tu flujo de trabajo existente, integrándose seamlessly con tus herramientas actuales mientras introduce capacidades que transforman fundamentalmente cómo abordas los problemas de desarrollo.

La maestría de los comandos CLI no radica en memorizar flags y opciones, sino en desarrollar una comprensión intuitiva de cuándo y cómo usar cada modalidad de interacción para maximizar tu efectividad según el contexto específico de cada situación.

## El Comando Base: `claude`

### Entrada al Mundo Conversacional

El comando `claude` sin argumentos es la puerta más directa al desarrollo conversacional. Te lleva al modo interactivo donde puedes mantener diálogos extendidos, explorar problemas complejos paso a paso, y recibir asistencia contextual que evoluciona con tu trabajo.

```bash
claude
# Inicia modo interactivo completo
```

Esta simplicidad esconde una sofisticación profunda. El modo interactivo mantiene contexto de proyecto, aprende de tus patrones de trabajo, y se adapta a tu estilo específico de desarrollo. No es un simple prompt; es un colaborador inteligente que comprende tu proyecto y puede razonar sobre él de manera sofisticada.

### Consultas Directas y Análisis Puntuales

Para tareas específicas que no requieren sesión extendida, puedes expresar tu intención directamente como argumento:

```bash
claude "analiza la estructura de este proyecto React y sugiere mejoras arquitectónicas"
claude "¿qué tecnologías usa este repositorio y cómo están organizadas?"
claude "revisa el código en src/ y identifica posibles problemas de rendimiento"
claude "explica qué hace esta función y cómo podría optimizarse"
```

Esta modalidad es invaluable para:
- **Análisis rápidos**: Evaluación inmediata de código o arquitectura
- **Consultas específicas**: Preguntas que pueden resolverse en una interacción
- **Integración con scripts**: Incorporación en workflows automatizados
- **Verificaciones puntuales**: Validación rápida de approaches o decisiones

## Flags de Control Fundamental

### `--print` / `-p`: Scripting y Automatización

La flag `--print` transforma Claude Code en una poderosa herramienta de scripting que puede integrarse en pipelines, workflows de CI/CD, y scripts de automatización:

```bash
# Análisis para scripting
claude -p "genera un resumen de los cambios en el último commit"
claude --print "verifica que todos los tests pasen y reporta cualquier fallo"
claude -p "evalúa la complejidad de este módulo en escala 1-10"

# Integración en pipelines
ANALYSIS=$(claude -p "analiza la calidad del código y dame un score numérico")
if [[ $ANALYSIS =~ "score: [89]|score: 10" ]]; then
    echo "✅ Código aprobado para merge"
else
    echo "❌ Código requiere mejoras antes del merge"
    exit 1
fi

# Generación de reports
claude -p "genera reporte de cobertura de tests en formato JSON" > coverage-report.json
```

**Características Clave**:
- **Output limpio**: Solo la respuesta, sin interfaz interactiva
- **Scriptable**: Perfecto para capturar output en variables
- **CI/CD friendly**: Ideal para integraciones automatizadas
- **Format agnóstico**: Puede generar cualquier formato requerido

### `--continue` / `-c`: Continuidad de Contexto

Una de las capacidades más poderosas: reanudar conversaciones previas con todo el contexto intact:

```bash
claude --continue
# Reanuda la conversación más reciente

claude -c  
# Forma abreviada del comando anterior
```

**Potencia de la Continuidad**:
- **Memoria de proyecto**: Recuerda análisis previos y decisiones tomadas
- **Contexto evolutivo**: Entiende cómo ha cambiado tu proyecto over time
- **Workflows extendidos**: Permite tareas que se desarrollan a lo largo de múltiples sesiones
- **Aprendizaje acumulativo**: Cada sesión informa las siguientes

**Casos de Uso Típicos**:
```bash
# Sesión 1: Análisis inicial
claude "analiza la arquitectura de este proyecto de e-commerce"

# Sesión 2: Continuación al día siguiente  
claude -c "basándote en el análisis de ayer, implementa optimizaciones de performance"

# Sesión 3: Una semana después
claude -c "¿cómo han afectado los cambios recientes a las optimizaciones que implementamos?"
```

### `--model`: Selección Estratégica de Capacidades

Diferentes modelos ofrecen diferentes balances entre velocidad, profundidad, y especialización:

```bash
claude --model sonnet-3.5 "análisis arquitectónico profundo de este sistema complejo"
claude --model haiku-3 "verificación rápida de sintaxis en este archivo"
claude --model opus-3 "revisión exhaustiva de seguridad y code review completo"
```

**Estrategias de Selección**:
- **Sonnet**: Balance óptimo para la mayoría de tareas de desarrollo
- **Haiku**: Respuestas rápidas para consultas simples y verificaciones
- **Opus**: Análisis profundos y tareas que requieren razonamiento complejo

### `--add-dir`: Expansión de Contexto

Para proyectos que abarcan múltiples directorios o cuando necesitas incluir contexto específico:

```bash
claude --add-dir /path/to/frontend --add-dir /path/to/backend "analiza la integración completa"
claude --add-dir ./docs --add-dir ./tests "verifica que la documentación esté actualizada con los tests"
```

Esta capacidad es crucial para:
- **Proyectos monorepo**: Analizando múltiples packages simultáneamente
- **Arquitecturas distribuidas**: Frontend, backend, y servicios relacionados
- **Context expansion**: Incluyendo documentación, tests, o configuraciones específicas

### `--output-format`: Control de Formato

Diferentes formatos para diferentes necesidades de integración:

```bash
# JSON estructurado para processing programático
claude --output-format json "analiza este código y estructura la respuesta"

# Text plano para legibilidad humana
claude --output-format text "dame un resumen simple de los cambios"  

# Streaming JSON para resultados en tiempo real
claude --output-format stream-json "análisis detallado con resultados progresivos"
```

**Aplicaciones por Formato**:
- **JSON**: Integración con otras herramientas, processing automatizado
- **Text**: Output limpio para usuarios, documentación
- **Stream-JSON**: Interfaces en tiempo real, feedback progresivo

## Comandos de Mantenimiento y Configuración

### `claude update`: Evolución Continua

```bash
claude update
# Actualiza a la versión más reciente con nuevas capacidades
```

Mantener Claude Code actualizado es crucial porque:
- **Nuevos modelos**: Acceso a capacidades mejoradas
- **Bug fixes**: Resolución de problemas conocidos  
- **Features**: Nuevas funcionalidades y integraciones
- **Performance**: Optimizaciones de velocidad y eficiencia

### `claude mcp`: Gestión de Integraciones

```bash
claude mcp
# Accede al sistema de configuración de Model Context Protocol
```

MCP permite integraciones sofisticadas con:
- **Servicios externos**: APIs, databases, herramientas especializadas
- **Custom tools**: Herramientas desarrolladas específicamente para tu workflow
- **Team integrations**: Servicios compartidos del equipo

## Patrones de Uso Efectivo

### Workflows Cotidianos

```bash
# Inicio del día: Context refresh
claude -c "¿en qué estábamos trabajando y cuáles son los próximos pasos?"

# Análisis rápido antes de empezar trabajo
claude "revisa el estado actual del proyecto y sugiere prioridades para hoy"

# Verificación antes de commit
claude -p "revisa estos cambios y verifica que estén listos para commit" | tee commit-review.txt

# End of day: Progress summary
claude "resume el progreso de hoy y prepara context para mañana"
```

### Integración con Git Workflows

```bash
# Pre-commit analysis
claude -p "analiza los archivos en staging, busca problemas potenciales"

# Commit message generation  
COMMIT_MSG=$(claude -p "genera un mensaje de commit descriptivo para estos cambios")
git commit -m "$COMMIT_MSG"

# Post-merge analysis
claude "analiza el resultado del merge y identifica potential integration issues"
```

### Debugging y Troubleshooting

```bash
# Error analysis
claude "analiza este error y sugiere soluciones: $(cat error.log)"

# Performance investigation
claude --model sonnet-3.5 "investiga estos performance issues en detalle" --add-dir ./profiling

# Verbose diagnostic mode  
claude --verbose "¿por qué está fallando este deployment?" > diagnostic-report.md
```

## Combinando Comandos para Workflows Sofisticados

### Pipeline de Code Review

```bash
#!/bin/bash
# Comprehensive code review pipeline

echo "🔍 Iniciando review automatizado..."

# Quick syntax and style check
claude -p "verificación rápida de sintaxis y estilo" --model haiku-3

# Deep architectural analysis  
claude -p "análisis arquitectónico profundo" --model sonnet-3.5 > arch-review.md

# Security audit
claude -p "audit de seguridad exhaustivo" --model opus-3 > security-review.md

# Generate summary report
claude -p "consolida estos reports en un summary ejecutivo" \
  --add-dir ./arch-review.md --add-dir ./security-review.md > final-review.md

echo "✅ Review completo disponible en final-review.md"
```

### Development Session Orchestration

```bash
# Smart development session startup
function dev-session() {
    local project_context=$(claude -c "resume el contexto actual del proyecto")
    echo "📋 Context: $project_context"
    
    local priorities=$(claude -p "basándote en el estado actual, ¿cuáles son las 3 prioridades principales para hoy?")
    echo "🎯 Prioridades: $priorities"
    
    # Start interactive session with full context
    claude -c
}
```

## Best Practices para CLI Usage

### Context Management

```bash
# Establish rich context at session start
claude "# PROYECTO: E-commerce Platform
Stack: React 18, Node.js, MongoDB, Stripe
Estado actual: Implementando checkout flow
Constraints: Must maintain PCI compliance"

# Maintain context continuity
claude --continue "continuando con checkout implementation..."
```

### Performance Optimization

```bash
# Use appropriate model for task complexity
claude --model haiku-3 "simple syntax check"           # Fast
claude --model sonnet-3.5 "architectural analysis"     # Balanced  
claude --model opus-3 "comprehensive security audit"   # Thorough
```

### Output Management

```bash
# Structured output for further processing
claude -p --output-format json "analiza dependencies y list outdated packages" | jq '.packages[]'

# Clean text for documentation
claude -p --output-format text "genera user documentation para esta API" > api-docs.md
```

## El Futuro de la CLI Conversacional

### Evolución de las Interfaces

Los comandos CLI de Claude Code representan la primera generación de interfaces conversacionales para desarrollo. Las futuras evoluciones probablemente incluirán:

- **Predictive commands**: Sugerencias automáticas basadas en context y patterns
- **Cross-session intelligence**: Memory persistente que evoluciona con tu proyecto
- **Adaptive interfaces**: CLI que se adapta a tu estilo específico de trabajo
- **Integrated workflows**: Coordination seamless con todas las herramientas de desarrollo

### Preparándose para el Futuro

La maestría de los comandos CLI actuales proporciona la foundation para aprovechar futuras capabilities. Los principios fundamentales—expresión clara de intenciones, context management efectivo, y integration thoughtful con workflows existentes—permanecerán relevantes incluso mientras las interfaces específicas evolucionan.

## Dominando la Base

Los comandos CLI de Claude Code son tu foundation para todo lo que sigue. No son simplemente una forma de invocar funcionalidades; son la interface fundamental entre tu intención y la ejecución inteligente. Dominar estos comandos significa desarrollar intuición sobre cuándo usar cada modalidad, cómo combinarlas efectivamente, y cómo integrarlas seamlessly en tu workflow de desarrollo actual.

Cada comando CLI que hemos explorado aquí se convierte en más poderoso cuando se combina con los slash commands que exploraremos en el próximo capítulo, donde descubrirás cómo controlar granularmente el comportamiento de Claude Code durante sesiones interactivas.

---

*La CLI de Claude Code no es solo una herramienta; es el primer paso hacia un new paradigm de desarrollo donde la conversación con sistemas inteligentes se convierte en parte natural del creative process.*