# NOTAS IMPORTANTES PARA EL LIBRO

## 🚨 REGLAS CRÍTICAS - NO VIOLAR

### 1. SOLO TYPESCRIPT - NUNCA PYTHON

- **IMPERATIVO**: Este libro es sobre LlamaIndex TypeScript Agent Workflows
- **PROHIBIDO**: Cualquier código Python, sintaxis Python, o referencias a Python
- **USAR SIEMPRE**:
  - `import { agent, tool } from "llamaindex"`
  - Sintaxis funcional con `agent()` y `tool()`
  - TypeScript puro con tipos explícitos
  - Streaming con `runStream()` y `for await`

### 2. AUDIENCIA: DESARROLLADORES HISPANOHABLANTES

- **USAR**: "desarrolladores que hablan español" o "desarrolladores hispanohablantes"
- **NO USAR**: "desarrolladores mexicanos" (muy específico)
- **CONTEXTO**: Mantener ejemplos culturalmente relevantes pero no limitados a un país

### 3. ENFOQUE FUNCIONAL DE LLAMAINDEX

- **ARQUITECTURA**: Programación funcional pura, NO clases ni decoradores
- **COMPONENTES**:
  - `agent()` - función principal que crea agentes
  - `tool()` - funciones puras para herramientas
  - `runStream()` - streaming en tiempo real
  - Prompts del sistema para lógica de negocio

### 4. EJEMPLOS SIEMPRE FUNCIONALES

- Taquerías, mercados, escuelas (contexto hispanohablante)
- Código ejecutable y completo
- Sin clases, sin decoradores @step, sin eventos complejos
- Funciones puras y composición simple

## ✅ SINTAXIS CORRECTA

```typescript
// ✅ CORRECTO - Enfoque funcional
import { agent, tool } from "llamaindex";

const miTool = tool(
  async ({ input }: { input: string }) => {
    return { resultado: input.toUpperCase() };
  },
  {
    name: "mi_herramienta",
    description: "Convierte texto a mayúsculas",
  }
);

const miAgent = agent({
  tools: [miTool],
  systemPrompt: "Eres un asistente útil...",
});

// Uso con streaming
const stream = await miAgent.runStream({
  message: "Hola mundo",
});

for await (const chunk of stream) {
  console.log(chunk.delta);
}
```

## ❌ SINTAXIS PROHIBIDA

```python
# ❌ PROHIBIDO - Código Python
from llamaindex import agent, tool

@tool
def mi_tool(input: str) -> str:
    return input.upper()
```

```typescript
// ❌ PROHIBIDO - Clases y decoradores (no es el enfoque de LlamaIndex TS)
class MiWorkflow extends Workflow {
  @step()
  async miPaso() {}
}
```

## 📝 RECORDATORIOS PARA CADA CAPÍTULO

1. **Verificar** que no hay código Python
2. **Confirmar** que usa sintaxis funcional de LlamaIndex TS
3. **Revisar** que dice "hispanohablantes" no "mexicanos"
4. **Validar** que todos los ejemplos son ejecutables
5. **Asegurar** que el streaming usa `runStream()` y `for await`

## 🎯 OBJETIVO DEL LIBRO

Enseñar Agent Workflows de LlamaIndex TypeScript usando:

- Enfoque funcional puro
- Ejemplos culturalmente relevantes para hispanohablantes
- Código 100% TypeScript ejecutable
- Casos de uso reales y prácticos
- Streaming y herramientas como conceptos centrales
