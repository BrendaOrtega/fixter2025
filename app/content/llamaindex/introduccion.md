# Introducción

## El poder de los Agent Workflows

Imagina que pudieras crear un asistente digital que no solo entienda lo que necesitas, sino que también pueda ejecutar una serie de tareas complejas de manera autónoma. Un sistema que pueda:

- Recibir un pedido por WhatsApp en tu taquería
- Verificar el inventario disponible
- Calcular precios y tiempos de preparación
- Notificar al cliente cuando esté listo
- Actualizar el inventario automáticamente

Esto no es ciencia ficción. Es exactamente lo que puedes lograr con **Agent Workflows de LlamaIndex TypeScript**.

## ¿Qué son los Agent Workflows?

Los Agent Workflows son una forma estructurada de crear sistemas inteligentes que pueden:

1. **Razonar** sobre problemas complejos
2. **Tomar decisiones** basadas en datos
3. **Ejecutar acciones** en el mundo real
4. **Aprender** de los resultados

Piénsalo como crear un empleado digital que nunca se cansa, nunca se equivoca en los cálculos, y siempre sigue los procedimientos correctos.

## ¿Por qué TypeScript?

TypeScript nos da superpoderes para crear workflows robustos:

- **Seguridad de tipos**: Evita errores antes de que ocurran
- **Autocompletado inteligente**: Desarrollo más rápido y preciso
- **Refactoring seguro**: Cambios sin miedo a romper el código
- **Documentación viva**: El código se autodocumenta

## La diferencia de LlamaIndex

LlamaIndex no es solo otra biblioteca de IA. Es un framework completo que:

- **Simplifica** la creación de workflows complejos
- **Integra** fácilmente con APIs y servicios externos
- **Maneja** el estado y la comunicación entre pasos
- **Escala** desde prototipos hasta sistemas de producción

## Casos de uso reales

### 🌮 Sector Alimentario

- Automatización de pedidos en restaurantes
- Gestión de inventario en tiempo real
- Optimización de rutas de entrega
- Análisis de preferencias de clientes

### 🏪 Comercio Local

- Sistemas de punto de venta inteligentes
- Gestión automática de proveedores
- Análisis de tendencias de ventas
- Atención al cliente 24/7

### 🎓 Educación

- Sistemas de calificaciones automatizados
- Generación de reportes para padres
- Análisis de rendimiento estudiantil
- Recomendaciones personalizadas de estudio

### 🏥 Servicios de Salud

- Gestión de citas médicas
- Seguimiento de tratamientos
- Análisis de síntomas
- Recordatorios de medicamentos

## El enfoque de este libro

### Aprendizaje progresivo

Comenzaremos con conceptos simples y construiremos gradualmente hacia sistemas más complejos:

```
Workflow básico → Steps y eventos → Múltiples pasos → Streaming → Integración → Patrones avanzados
```

### Ejemplos prácticos

Cada concepto se ilustra con ejemplos que puedes usar inmediatamente:

- **Taquería**: Para entender workflows básicos
- **Mercado**: Para aprender sobre gestión de estado
- **Escuela**: Para dominar cálculos complejos

### Código real y funcional

Todos los ejemplos son:

- ✅ **Ejecutables**: Los puedes correr en tu computadora
- ✅ **Completos**: No hay partes faltantes
- ✅ **Comentados**: Cada línea está explicada
- ✅ **Adaptables**: Los puedes modificar para tus necesidades

## Preparando el entorno

Antes de comenzar, asegúrate de tener:

### Software necesario

- **Node.js 18+**: Para ejecutar TypeScript
- **npm o yarn**: Para gestionar paquetes
- **Editor de código**: VS Code recomendado
- **Terminal**: Para ejecutar comandos

### Conocimientos previos

- **JavaScript básico**: Variables, funciones, objetos
- **TypeScript básico**: Tipos, interfaces, async/await
- **Conceptos de programación**: Loops, condicionales, funciones

### Mentalidad correcta

- **Curiosidad**: Pregúntate "¿cómo puedo usar esto?"
- **Paciencia**: Los workflows complejos toman tiempo
- **Creatividad**: Piensa en problemas reales que puedes resolver

## Tu primer vistazo

Aquí tienes un ejemplo súper simple de lo que construiremos:

```typescript
import { tool } from "llamaindex";
import { agent } from "@llamaindex/workflow";
import { openai } from "@llamaindex/openai";

// Definir una herramienta simple
const saludoTool = tool(
  ({ nombre }: { nombre: string }) =>
    `¡Hola ${nombre}! Bienvenido a los Agent Workflows`,
  {
    name: "saludar",
    description: "Saluda a una persona por su nombre",
    parameters: {
      type: "object",
      properties: {
        nombre: {
          type: "string",
          description: "El nombre de la persona a saludar"
        }
      },
      required: ["nombre"]
    }
  }
);

// Crear el agent workflow
const saludoAgent = agent({
  tools: [saludoTool],
  llm: openai({ model: "gpt-4o-mini" }),
});

// Usar el agent workflow
const main = async () => {
  const resultado = await saludoAgent.run("Saluda a María");
  console.log(resultado); // El agente usará la herramienta para saludar
};

main();
```

Simple, ¿verdad? Pero este patrón básico es la base para sistemas increíblemente poderosos.

## Lo que viene

En el siguiente capítulo, crearemos tu primer workflow real: un sistema básico para una taquería que puede procesar pedidos automáticamente.

Prepárate para descubrir cómo la inteligencia artificial puede transformar la manera en que resolvemos problemas cotidianos.

¡Vamos a empezar!
