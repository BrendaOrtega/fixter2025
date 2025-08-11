# Subagentes - FixterGeek

Este directorio contiene subagentes especializados que pueden ser utilizados con Claude Code's Task tool para automatizar tareas específicas del proyecto.

## Subagentes Disponibles

### 📚 epub-generator

Subagente especializado para generar archivos EPUB del libro "Dominando Claude Code".

**Funciones principales:**
- ✅ Verificar si los capítulos han sido modificados desde la última generación
- ✅ Generar archivo EPUB usando el script Python existente
- ✅ Validar la integridad del archivo EPUB generado
- ✅ Devolver información detallada sobre el resultado (ruta, tamaño, capítulos procesados)

**Uso directo:**
```bash
cd app/subagents
node epub-generator.ts
```

**Opciones:**
- `--force, -f`: Forzar regeneración incluso si no hay cambios
- `--help, -h`: Mostrar ayuda

**Uso con Task tool:**
```typescript
// En Claude Code, puedes usar el Task tool con este comando:
// Task: ejecutar subagente epub-generator para regenerar el libro
```

**Salida estructurada:**
El subagente devuelve un objeto JSON con la siguiente estructura:
```typescript
{
  success: boolean;
  message: string;
  epubPath?: string;           // Ruta del archivo EPUB generado
  fileSize?: number;           // Tamaño en bytes
  generatedAt?: string;        // Timestamp ISO de generación
  chaptersProcessed?: number;  // Número de capítulos procesados
  error?: string;             // Descripción del error si falló
}
```

## Convenciones para Subagentes

### Estructura de Archivos
- Cada subagente debe ser un archivo TypeScript independiente
- Nombre del archivo: `nombre-subagente.ts`
- Debe exportar una clase principal y tipos relevantes
- Debe incluir interfaz CLI para uso directo

### Interfaz de CLI
- Soporte para `--help` o `-h`
- Salida estructurada en JSON para integración con Task tool
- Exit code: 0 para éxito, 1 para error
- Logging claro durante la ejecución

### Salida Estructurada
Todos los subagentes deben devolver un resultado con al menos:
```typescript
{
  success: boolean;
  message: string;
  error?: string;
}
```

### Documentación
- Comentarios JSDoc en funciones principales
- README.md con ejemplos de uso
- Descripción clara de funciones y propósito

## Desarrollo de Nuevos Subagentes

Para crear un nuevo subagente:

1. **Crear archivo**: `app/subagents/mi-subagente.ts`
2. **Implementar estructura básica**:
   ```typescript
   class MiSubagente {
     async run(): Promise<ResultType> {
       // Implementación
     }
   }
   
   // CLI Interface
   async function main() {
     // Manejo de argumentos
     // Ejecutar subagente
     // Salida estructurada
   }
   ```
3. **Documentar en README.md**
4. **Probar con Task tool**

## Integración con Claude Code

Los subagentes están diseñados para ser utilizados principalmente con el Task tool de Claude Code, proporcionando automatización especializada para tareas repetitivas o complejas del proyecto.

Ejemplo de uso en Claude Code:
```
"Task: usar el subagente epub-generator para regenerar el libro con los cambios más recientes"
```

El Task tool ejecutará automáticamente el subagente y procesará la salida estructurada para proporcionar feedback detallado sobre el resultado.