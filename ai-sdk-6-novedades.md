# AI SDK 6: Lo Que Necesitas Saber

![Inteligencia Artificial y Código](https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200)
*Foto de [Tara Winstead](https://www.pexels.com/@tara-winstead/) en Pexels*

Vercel acaba de lanzar la versión 6 de AI SDK, el toolkit de TypeScript más popular para construir aplicaciones con inteligencia artificial. Con más de 20 millones de descargas mensuales, esta actualización trae cambios importantes que vale la pena conocer.

## ¿Qué es AI SDK?

AI SDK es una librería que simplifica la integración de modelos de lenguaje (como GPT, Claude o Gemini) en aplicaciones TypeScript y JavaScript. Te permite hacer streaming de respuestas, llamar herramientas y generar contenido estructurado con pocas líneas de código.

## Las 5 Novedades Más Importantes

### 1. Agentes Reutilizables

![Programación y desarrollo](https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800)
*Foto de [Luis Gomes](https://www.pexels.com/@luis-gomes-166706/) en Pexels*

La novedad estrella. Ahora puedes definir agentes con su modelo, instrucciones y herramientas en un solo lugar:

```typescript
const agent = new Agent({
  model: openai('gpt-4o'),
  instructions: 'Eres un asistente de ventas...',
  tools: [buscarProducto, crearCotizacion]
});
```

Esto hace que tu código sea más organizado y los agentes sean reutilizables en toda tu aplicación.

### 2. Aprobación Humana para Herramientas

Nuevo flag `needsApproval` que pausa la ejecución hasta que un humano apruebe. Ideal para operaciones sensibles como pagos o eliminación de datos.

```typescript
const herramienta = tool({
  name: 'eliminarUsuario',
  needsApproval: true,  // Requiere confirmación
  execute: async (params) => { /* ... */ }
});
```

### 3. DevTools de Depuración

![Desarrollador trabajando](https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800)
*Foto de [Christina Morillo](https://www.pexels.com/@divinetechygirl/) en Pexels*

Nueva herramienta visual que muestra exactamente qué está pasando: parámetros enviados, tokens consumidos, respuestas del modelo y datos raw. Muy útil para optimizar costos y depurar comportamientos extraños.

### 4. Reranking Nativo

Función `rerank` integrada para reordenar resultados de búsqueda por relevancia. Si trabajas con RAG (Retrieval Augmented Generation), esto mejora significativamente la calidad de las respuestas.

### 5. Soporte MCP Completo

Model Context Protocol ahora incluye autenticación OAuth, recursos y prompts. Esto facilita conectar tus agentes con herramientas externas de forma segura.

## Herramientas Específicas por Proveedor

Cada proveedor ahora ofrece herramientas nativas:

| Proveedor | Herramientas |
|-----------|--------------|
| **Anthropic** | Memoria, búsqueda, ejecución de código |
| **OpenAI** | Shell, patches, MCP |
| **Google** | Maps, RAG Store, búsqueda de archivos |
| **xAI** | Búsqueda web, búsqueda en X |

## Cómo Migrar

La migración es sencilla para la mayoría de proyectos. Ejecuta el codemod oficial:

```bash
npx @ai-sdk/codemod upgrade v6
```

Este comando actualiza automáticamente tu código a la nueva sintaxis.

## Conclusión

![Robot e inteligencia artificial](https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=800)
*Foto de [Tara Winstead](https://www.pexels.com/@tara-winstead/) en Pexels*

AI SDK 6 representa un paso importante hacia agentes más sofisticados y mantenibles. Las abstracciones de agentes y la aprobación humana son especialmente útiles para aplicaciones en producción donde el control y la seguridad son prioritarios.

Si ya usas AI SDK, la migración vale la pena. Si estás empezando, es el mejor momento para adoptarlo.

---

*Fuente: [Vercel Blog - AI SDK 6](https://vercel.com/blog/ai-sdk-6)*
