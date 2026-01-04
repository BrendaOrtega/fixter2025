# Capítulo 11: Agentic RAG — Agentes con Conocimiento

En el capítulo anterior construimos un sistema RAG completo: indexamos documentos, buscamos por similitud, y generamos respuestas con contexto. Funciona bien para preguntas directas.

Pero hay un problema: el flujo es rígido. Siempre busca, siempre usa los resultados, siempre genera una respuesta. ¿Qué pasa cuando:

- La pregunta no requiere buscar nada ("Hola, ¿cómo estás?")
- La primera búsqueda no encuentra lo que necesita
- La pregunta requiere combinar información de múltiples consultas
- El usuario hace una pregunta de seguimiento sobre algo que ya respondiste

**Agentic RAG** resuelve esto: el modelo decide cuándo buscar, qué buscar, y si necesita buscar de nuevo.

## Código Primero

Construyamos un asistente legal que responde preguntas sobre la Ley Federal del Trabajo de México:

```typescript
import { ToolLoopAgent, tool, embed, embedMany, cosineSimilarity, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Simulación de artículos de la LFT indexados
interface Articulo {
  numero: string;
  titulo: string;
  contenido: string;
  capitulo: string;
  embedding?: number[];
}

// Base de conocimiento (en producción vendría de una base de datos vectorial)
const articulos: Articulo[] = [
  {
    numero: '87',
    titulo: 'Aguinaldo',
    contenido: `Los trabajadores tendrán derecho a un aguinaldo anual que deberá pagarse
    antes del día veinte de diciembre, equivalente a quince días de salario, por lo menos.
    Los que no hayan cumplido el año de servicios, independientemente de que se encuentren
    laborando o no en la fecha de liquidación del aguinaldo, tendrán derecho a que se les
    pague la parte proporcional del mismo, conforme al tiempo que hubieren trabajado.`,
    capitulo: 'Condiciones de Trabajo',
  },
  {
    numero: '76',
    titulo: 'Vacaciones',
    contenido: `Los trabajadores que tengan más de un año de servicios disfrutarán de un
    período anual de vacaciones pagadas, que en ningún caso podrá ser inferior a doce días
    laborables, y que aumentará en dos días laborables, hasta llegar a veinte, por cada año
    subsecuente de servicios. Después del sexto año, el período de vacaciones aumentará en
    dos días por cada cinco de servicios.`,
    capitulo: 'Condiciones de Trabajo',
  },
  {
    numero: '117',
    titulo: 'PTU - Participación de Utilidades',
    contenido: `Los trabajadores participarán en las utilidades de las empresas, de conformidad
    con el porcentaje que determine la Comisión Nacional para la Participación de los
    Trabajadores en las Utilidades de las Empresas. El reparto de utilidades entre los
    trabajadores deberá efectuarse dentro de los sesenta días siguientes a la fecha en que
    deba pagarse el impuesto anual.`,
    capitulo: 'Participación de Utilidades',
  },
  {
    numero: '47',
    titulo: 'Causas de Rescisión sin Responsabilidad para el Patrón',
    contenido: `Son causas de rescisión de la relación de trabajo, sin responsabilidad para el
    patrón: Engañarlo el trabajador con certificados falsos o referencias; Incurrir el
    trabajador en faltas de probidad u honradez; Cometer actos de violencia contra el patrón
    o compañeros; Ocasionar daños materiales intencionalmente; Comprometer la seguridad del
    establecimiento; Tener más de tres faltas de asistencia sin causa justificada en un
    período de treinta días.`,
    capitulo: 'Rescisión',
  },
  {
    numero: '48',
    titulo: 'Indemnización por Despido Injustificado',
    contenido: `El trabajador podrá solicitar ante la Junta de Conciliación y Arbitraje, a su
    elección, que se le reinstale en el trabajo que desempeñaba, o que se le indemnice con
    el importe de tres meses de salario. Si en el juicio correspondiente no comprueba el
    patrón la causa de la rescisión, el trabajador tendrá derecho, además, al pago de los
    salarios vencidos.`,
    capitulo: 'Rescisión',
  },
  {
    numero: '132',
    titulo: 'Obligaciones de los Patrones',
    contenido: `Son obligaciones de los patrones: Proporcionar útiles e instrumentos de trabajo;
    Proporcionar local seguro; Pagar salarios e indemnizaciones; Expedir constancia de días
    trabajados; Proporcionar capacitación y adiestramiento; Cumplir disposiciones de seguridad
    e higiene; Permitir inspecciones de autoridades; Contribuir a actividades culturales y
    deportivas.`,
    capitulo: 'Obligaciones Patronales',
  },
];

// Indexar artículos (normalmente esto se haría una sola vez)
let articulosIndexados: Articulo[] = [];

async function indexarArticulos() {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: articulos.map(a => `Artículo ${a.numero}: ${a.titulo}. ${a.contenido}`),
  });

  articulosIndexados = articulos.map((art, i) => ({
    ...art,
    embedding: embeddings[i],
  }));

  console.log(`Indexados ${articulosIndexados.length} artículos de la LFT`);
}

// Tool de búsqueda: el agente decide cuándo usarlo
const buscarArticulos = tool({
  description: `Busca artículos relevantes en la Ley Federal del Trabajo de México.
  Usa esta herramienta cuando necesites información legal específica sobre:
  - Derechos de trabajadores (vacaciones, aguinaldo, PTU)
  - Obligaciones de patrones
  - Causas de despido y rescisión
  - Indemnizaciones y liquidaciones
  NO uses esta herramienta para saludos o preguntas generales.`,

  inputSchema: z.object({
    consulta: z.string().describe('Pregunta o tema a buscar en la ley'),
    topK: z.number().optional().default(3).describe('Número de artículos a retornar'),
  }),

  execute: async ({ consulta, topK }) => {
    // Generar embedding de la consulta
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: consulta,
    });

    // Buscar por similitud
    const resultados = articulosIndexados
      .map(art => ({
        articulo: art,
        score: cosineSimilarity(embedding, art.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // Retornar solo si hay resultados relevantes
    const relevantes = resultados.filter(r => r.score > 0.5);

    if (relevantes.length === 0) {
      return {
        encontrado: false,
        mensaje: 'No encontré artículos relevantes para esa consulta.',
        sugerencia: 'Intenta reformular la pregunta o ser más específico.',
      };
    }

    return {
      encontrado: true,
      articulos: relevantes.map(r => ({
        numero: r.articulo.numero,
        titulo: r.articulo.titulo,
        contenido: r.articulo.contenido,
        capitulo: r.articulo.capitulo,
        relevancia: Math.round(r.score * 100) + '%',
      })),
    };
  },
});

// Crear el agente
const asistenteLegal = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres un asistente legal especializado en la Ley Federal del Trabajo de México.

TU TRABAJO:
- Responder preguntas sobre derechos laborales en México
- Citar artículos específicos cuando sea relevante
- Explicar la ley en términos sencillos

CUÁNDO BUSCAR:
- Usa buscarArticulos cuando el usuario pregunte sobre derechos, obligaciones, o situaciones laborales
- NO busques para saludos, agradecimientos, o preguntas sobre ti mismo

FORMATO DE RESPUESTA:
- Responde de manera clara y concisa
- Cita el número de artículo entre paréntesis: (Art. 87)
- Si la ley no cubre algo, dilo honestamente
- Recomienda consultar a un abogado para casos complejos

IMPORTANTE:
- Esta información es orientativa, no constituye asesoría legal
- Los montos y plazos pueden cambiar según reformas`,

  tools: { buscarArticulos },

  stopWhen: stepCountIs(5),
});

// Uso
async function main() {
  await indexarArticulos();

  // Pregunta que SÍ requiere búsqueda
  console.log('--- Pregunta sobre vacaciones ---');
  const { text: r1 } = await asistenteLegal.generate({
    prompt: '¿Cuántos días de vacaciones me tocan si tengo 3 años trabajando?'
  });
  console.log(r1);

  // Pregunta que NO requiere búsqueda
  console.log('\n--- Saludo ---');
  const { text: r2 } = await asistenteLegal.generate({
    prompt: 'Hola, buenas tardes'
  });
  console.log(r2);

  // Pregunta compleja que puede requerir múltiples búsquedas
  console.log('\n--- Pregunta compleja ---');
  const { text: r3, steps } = await asistenteLegal.generate({
    prompt: 'Me despidieron sin causa, ¿qué me corresponde? Tenía 2 años trabajando.'
  });
  console.log(r3);
  console.log(`\n(Resuelto en ${steps.length} pasos)`);
}

main();
```

Ejecuta esto y verás:

```
Indexados 6 artículos de la LFT

--- Pregunta sobre vacaciones ---
Con 3 años de antigüedad, te corresponden 14 días de vacaciones pagadas (Art. 76).

La ley establece un mínimo de 12 días el primer año, aumentando 2 días por
cada año subsecuente hasta llegar a 20 días. Después del sexto año, aumenta
2 días por cada 5 años de servicio.

--- Saludo ---
¡Buenas tardes! Soy tu asistente legal especializado en la Ley Federal del
Trabajo de México. ¿En qué puedo ayudarte hoy?

--- Pregunta compleja ---
Ante un despido injustificado, tienes derecho a elegir entre (Art. 48):

1. **Reinstalación**: Volver a tu puesto de trabajo
2. **Indemnización**: 3 meses de salario

Además, te corresponden:
- **Salarios vencidos**: Desde el despido hasta la resolución
- **Aguinaldo proporcional** (Art. 87)
- **Vacaciones proporcionales** (Art. 76)
- **Prima de antigüedad**: 12 días de salario por año trabajado

Con 2 años trabajando, aproximadamente recibirías:
- 3 meses de salario (indemnización)
- 20 días de aguinaldo (proporcional)
- Vacaciones no disfrutadas

Te recomiendo consultar con un abogado laboral para calcular el monto exacto
y presentar la demanda ante la Junta de Conciliación y Arbitraje.

(Resuelto en 3 pasos)
```

## ¿Qué Acaba de Pasar?

La diferencia fundamental con RAG tradicional:

```
RAG TRADICIONAL:
Pregunta -> Buscar SIEMPRE -> Generar con contexto

AGENTIC RAG:
Pregunta -> Modelo DECIDE si buscar ->
  SI: Buscar -> Evaluar resultados -> ¿Buscar más? -> Generar
  NO: Generar directamente
```

El agente tiene autonomía. En el ejemplo:
- Para vacaciones: buscó una vez, encontró el artículo 76
- Para el saludo: no buscó nada
- Para despido: buscó varias veces (rescisión, indemnización, aguinaldo)

## Anatomía de un Agente RAG

Un agente RAG efectivo tiene tres componentes:

### 1. Tool de Búsqueda Inteligente

```typescript
const buscarDocumentos = tool({
  // La descripción es CRUCIAL - guía al modelo sobre cuándo usar el tool
  description: `Busca en la base de conocimiento.

  USA este tool cuando:
  - El usuario pregunta sobre políticas, procedimientos, o información específica
  - Necesitas datos actualizados o verificables
  - La respuesta requiere precisión (números, fechas, montos)

  NO uses este tool para:
  - Saludos y despedidas
  - Opiniones o consejos generales
  - Preguntas sobre ti mismo`,

  inputSchema: z.object({
    consulta: z.string(),
    // Parámetros opcionales dan al agente más control
    categoria: z.enum(['general', 'legal', 'financiero']).optional(),
    maxResultados: z.number().min(1).max(10).optional(),
  }),

  execute: async ({ consulta, categoria, maxResultados = 3 }) => {
    // Implementación de búsqueda...
  },
});
```

### 2. Instructions que Guían las Decisiones

```typescript
const agente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres un asistente de [CONTEXTO].

PROCESO DE DECISIÓN:
1. Analiza si la pregunta requiere información específica
2. Si SÍ: usa buscarDocumentos con una consulta precisa
3. Evalúa los resultados - ¿responden la pregunta?
4. Si NO: reformula y busca de nuevo
5. Si SÍ: genera respuesta citando fuentes

CUÁNDO BUSCAR:
- Preguntas sobre datos, políticas, procedimientos
- Cuando el usuario pide información verificable
- Ante dudas sobre precisión

CUÁNDO NO BUSCAR:
- Conversación casual
- Preguntas que puedes responder con conocimiento general
- Seguimiento de algo que ya respondiste

FORMATO:
- Cita fuentes: [Documento: sección]
- Sé conciso pero completo
- Admite cuando no tienes información`,

  tools: { buscarDocumentos },
});
```

### 3. Control del Loop

```typescript
import { stepCountIs, hasToolCall } from 'ai';

const agente = new ToolLoopAgent({
  // ...

  // Límite de pasos para evitar loops infinitos
  stopWhen: stepCountIs(8),

  // O parar cuando llame un tool específico
  // stopWhen: hasToolCall('escalarAHumano'),

  // Callback para monitorear
  onStepFinish({ stepNumber, stepType, toolCalls }) {
    if (toolCalls?.length) {
      console.log(`[Paso ${stepNumber}] Buscando: ${toolCalls[0].args.consulta}`);
    }
  },
});
```

## Query Reformulation

A veces la primera búsqueda no encuentra lo que necesita. Un agente inteligente reformula:

```typescript
const buscarConReformulacion = tool({
  description: 'Busca documentos. Si no encuentra resultados relevantes, el agente puede reformular la consulta.',

  inputSchema: z.object({
    consulta: z.string(),
    intentoPrevio: z.string().optional().describe('Consulta anterior que no dio resultados'),
  }),

  execute: async ({ consulta, intentoPrevio }) => {
    const resultados = await buscarEnIndice(consulta);

    if (resultados.length === 0) {
      return {
        encontrado: false,
        consultaUsada: consulta,
        intentoPrevio,
        sugerencias: [
          'Intenta con términos más generales',
          'Usa sinónimos',
          'Divide la pregunta en partes',
        ],
      };
    }

    return {
      encontrado: true,
      resultados,
      consultaUsada: consulta,
    };
  },
});
```

El agente aprende del feedback:

```
Usuario: "¿Qué pasa si no me pagan a tiempo?"

Paso 1: buscar("no me pagan a tiempo")
        -> No encontrado

Paso 2: buscar("retraso en pago de salario", intentoPrevio: "no me pagan a tiempo")
        -> Encontrado: Artículo 101 sobre plazos de pago

Paso 3: Genera respuesta con el artículo encontrado
```

## Multi-Hop Reasoning

Preguntas complejas requieren múltiples búsquedas que se construyen una sobre otra:

```typescript
// Pregunta: "Si me despiden después de 5 años, ¿cuánto me toca de finiquito completo?"

// El agente descompone:
// Paso 1: Buscar "indemnización por despido" -> Art. 48 (3 meses)
// Paso 2: Buscar "prima de antigüedad" -> Art. 162 (12 días por año)
// Paso 3: Buscar "aguinaldo proporcional" -> Art. 87
// Paso 4: Buscar "vacaciones proporcionales" -> Art. 76
// Paso 5: Combinar y calcular
```

Para habilitar esto, estructura tus instructions:

```typescript
instructions: `Eres un asistente de cálculo de finiquitos.

PARA PREGUNTAS COMPLEJAS:
1. Identifica todos los conceptos involucrados
2. Busca cada concepto por separado
3. Recopila la información necesaria
4. Calcula o combina los resultados
5. Presenta un desglose claro

EJEMPLO DE DESCOMPOSICIÓN:
Pregunta: "¿Cuánto me toca de liquidación?"
Conceptos a buscar:
- Indemnización constitucional
- Prima de antigüedad
- Aguinaldo proporcional
- Vacaciones pendientes
- Prima vacacional`,
```

## Decisión Inteligente: ¿Buscar o No?

El agente debe evaluar si realmente necesita información externa:

```typescript
const asistenteInteligente = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres un asistente de recursos humanos.

ANTES DE BUSCAR, evalúa:

1. ¿Es una pregunta que requiere datos específicos?
   - SÍ: números, fechas, montos, políticas → BUSCAR
   - NO: opiniones, consejos generales → NO BUSCAR

2. ¿Ya tienes la información de búsquedas anteriores?
   - SÍ: usa lo que ya encontraste → NO BUSCAR
   - NO: necesitas información nueva → BUSCAR

3. ¿Es conversación casual?
   - Saludos, agradecimientos, despedidas → NO BUSCAR

EJEMPLOS:
- "¿Cuántos días de vacaciones tengo?" → BUSCAR (dato específico)
- "Gracias por la información" → NO BUSCAR (agradecimiento)
- "¿Y qué pasa si renuncio?" → BUSCAR (nueva pregunta)
- "¿Me puedes explicar eso de nuevo?" → NO BUSCAR (ya tienes la info)`,

  tools: { buscarPoliticas },
});
```

## Contexto de Conversación

Para preguntas de seguimiento, el agente debe recordar lo que ya buscó:

```typescript
// Mantener historial de mensajes
const mensajes: Array<{ role: string; content: string }> = [];

async function chat(pregunta: string) {
  mensajes.push({ role: 'user', content: pregunta });

  const { text, steps } = await asistente.generate({
    messages: mensajes,
  });

  mensajes.push({ role: 'assistant', content: text });

  // Log de búsquedas realizadas
  const busquedas = steps
    .filter(s => s.toolCalls?.length)
    .map(s => s.toolCalls![0].args.consulta);

  if (busquedas.length > 0) {
    console.log('Búsquedas realizadas:', busquedas);
  }

  return text;
}

// Conversación
await chat('¿Cuántos días de vacaciones me tocan?');
// Busca: "días de vacaciones"

await chat('¿Y si tengo más de 6 años?');
// Puede no buscar - ya tiene contexto del Art. 76

await chat('¿Cómo las solicito?');
// Busca: "solicitud de vacaciones" o "procedimiento vacaciones"
```

## Ejemplo Completo: Asistente de Nómina

```typescript
import { ToolLoopAgent, tool, embed, embedMany, cosineSimilarity, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Base de conocimiento de nómina
const documentosNomina = [
  {
    id: 'percepciones',
    titulo: 'Catálogo de Percepciones',
    contenido: `
      PERCEPCIONES FIJAS:
      - Sueldo base: Según tabulador por puesto
      - Ayuda de transporte: $1,500 MXN mensuales
      - Vales de despensa: 10% del sueldo base

      PERCEPCIONES VARIABLES:
      - Horas extra dobles: Las primeras 9 horas semanales
      - Horas extra triples: A partir de la hora 10 semanal
      - Comisiones: Según esquema del departamento comercial
      - Bonos de productividad: Trimestrales, según KPIs
    `,
  },
  {
    id: 'deducciones',
    titulo: 'Deducciones de Nómina',
    contenido: `
      DEDUCCIONES OBLIGATORIAS:
      - IMSS: Según tabla de cotización vigente
      - ISR: Retención según tabla del SAT
      - INFONAVIT: Solo si tiene crédito activo (20-25% del salario)

      DEDUCCIONES OPCIONALES:
      - Caja de ahorro: Hasta 13% del sueldo
      - Seguro de gastos médicos: Aportación del 50% ($500-$2,000)
      - Fondo de retiro adicional: Porcentaje variable
    `,
  },
  {
    id: 'calendario',
    titulo: 'Calendario de Pagos',
    contenido: `
      FECHAS DE PAGO:
      - Nómina quincenal: Días 15 y último de cada mes
      - Si cae en fin de semana, se paga el viernes anterior

      PROCESOS:
      - Corte de incidencias: 3 días antes del pago
      - Dispersión bancaria: Un día antes del pago
      - Recibos de nómina: Disponibles en portal el día del pago

      FECHAS ESPECIALES:
      - Aguinaldo: 15 de diciembre
      - PTU: Antes del 30 de mayo
      - Prima vacacional: Junto con el pago de vacaciones
    `,
  },
  {
    id: 'incidencias',
    titulo: 'Registro de Incidencias',
    contenido: `
      FALTAS:
      - Falta injustificada: Descuento del día + parte proporcional de séptimo día
      - Falta justificada: Requiere comprobante, sin descuento

      PERMISOS:
      - Con goce: Matrimonio (5 días), nacimiento de hijo (5 días), defunción familiar (3 días)
      - Sin goce: Solicitar con 5 días de anticipación

      INCAPACIDADES:
      - IMSS: Empresa paga primeros 3 días al 100%
      - A partir del día 4: IMSS paga 60%, empresa complementa al 100%
    `,
  },
];

// Indexar documentos
let docsIndexados: typeof documentosNomina & { embedding?: number[] }[] = [];

async function indexar() {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: documentosNomina.map(d => `${d.titulo}\n${d.contenido}`),
  });

  docsIndexados = documentosNomina.map((doc, i) => ({
    ...doc,
    embedding: embeddings[i],
  }));
}

// Tools del agente
const buscarEnNomina = tool({
  description: `Busca información en los documentos de nómina y prestaciones.

  Útil para:
  - Percepciones (sueldo, vales, bonos)
  - Deducciones (IMSS, ISR, INFONAVIT)
  - Calendario de pagos
  - Incidencias y permisos

  No uses para preguntas personales o cálculos específicos.`,

  inputSchema: z.object({
    consulta: z.string().describe('Tema a buscar'),
  }),

  execute: async ({ consulta }) => {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: consulta,
    });

    const resultados = docsIndexados
      .map(doc => ({
        doc,
        score: cosineSimilarity(embedding, doc.embedding!),
      }))
      .filter(r => r.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    if (resultados.length === 0) {
      return { encontrado: false };
    }

    return {
      encontrado: true,
      documentos: resultados.map(r => ({
        titulo: r.doc.titulo,
        contenido: r.doc.contenido,
        relevancia: `${Math.round(r.score * 100)}%`,
      })),
    };
  },
});

const calcularNeto = tool({
  description: 'Calcula el salario neto aproximado dado un salario bruto mensual.',

  inputSchema: z.object({
    salarioBruto: z.number().describe('Salario bruto mensual en pesos'),
    tieneInfonavit: z.boolean().default(false),
    porcentajeCajaAhorro: z.number().min(0).max(13).default(0),
  }),

  execute: async ({ salarioBruto, tieneInfonavit, porcentajeCajaAhorro }) => {
    // Cálculo simplificado (en producción usarías tablas reales del SAT)
    const imss = salarioBruto * 0.025; // Aproximado
    const isr = calcularISR(salarioBruto);
    const infonavit = tieneInfonavit ? salarioBruto * 0.05 : 0;
    const cajaAhorro = salarioBruto * (porcentajeCajaAhorro / 100);

    const totalDeducciones = imss + isr + infonavit + cajaAhorro;
    const neto = salarioBruto - totalDeducciones;

    return {
      salarioBruto: `$${salarioBruto.toLocaleString('es-MX')} MXN`,
      deducciones: {
        imss: `$${imss.toFixed(2)}`,
        isr: `$${isr.toFixed(2)}`,
        infonavit: tieneInfonavit ? `$${infonavit.toFixed(2)}` : 'No aplica',
        cajaAhorro: porcentajeCajaAhorro > 0 ? `$${cajaAhorro.toFixed(2)}` : 'No aplica',
        total: `$${totalDeducciones.toFixed(2)}`,
      },
      salarioNeto: `$${neto.toFixed(2)} MXN`,
      nota: 'Este es un cálculo aproximado. Consulta tu recibo para montos exactos.',
    };
  },
});

function calcularISR(mensual: number): number {
  // Tabla simplificada 2024
  if (mensual <= 7735) return 0;
  if (mensual <= 15000) return mensual * 0.10;
  if (mensual <= 30000) return mensual * 0.15;
  return mensual * 0.25;
}

// El agente
const asistenteNomina = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),

  instructions: `Eres el asistente virtual del departamento de Nómina.

TU TRABAJO:
- Explicar conceptos de nómina y prestaciones
- Ayudar a entender recibos de pago
- Informar sobre fechas y procesos
- Hacer cálculos aproximados cuando te lo pidan

PROCESO:
1. Identifica qué necesita el usuario
2. Si es información general → buscarEnNomina
3. Si es un cálculo → calcularNeto
4. Si es una duda simple → responde directo

IMPORTANTE:
- Los cálculos son aproximados, recomienda verificar el recibo oficial
- No tienes acceso a datos personales de empleados
- Para temas sensibles, refiere al área de Nómina directamente

FORMATO:
- Usa listas para desglosar conceptos
- Incluye montos cuando sean relevantes
- Sé claro sobre qué es aproximado vs exacto`,

  tools: { buscarEnNomina, calcularNeto },
  stopWhen: stepCountIs(6),
});

// Pruebas
async function main() {
  await indexar();

  // Pregunta informativa
  const { text: r1 } = await asistenteNomina.generate({
    prompt: '¿Qué deducciones me quitan de mi nómina?'
  });
  console.log('--- Deducciones ---');
  console.log(r1);

  // Pregunta con cálculo
  const { text: r2 } = await asistenteNomina.generate({
    prompt: 'Si gano $25,000 brutos al mes y tengo crédito INFONAVIT, ¿cuánto me queda neto?'
  });
  console.log('\n--- Cálculo ---');
  console.log(r2);

  // Pregunta mixta
  const { text: r3 } = await asistenteNomina.generate({
    prompt: '¿Cuándo pagan el aguinaldo y cuánto me toca si gano $18,000?'
  });
  console.log('\n--- Aguinaldo ---');
  console.log(r3);
}

main();
```

## Métricas y Observabilidad

Para sistemas en producción, monitorea el comportamiento del agente:

```typescript
interface MetricasAgente {
  pregunta: string;
  busquedasRealizadas: number;
  consultasUsadas: string[];
  pasosTotal: number;
  tokensUsados: number;
  tiempoMs: number;
}

async function ejecutarConMetricas(
  agente: ToolLoopAgent,
  pregunta: string
): Promise<{ respuesta: string; metricas: MetricasAgente }> {
  const inicio = Date.now();

  const { text, steps } = await agente.generate({ prompt: pregunta });

  const busquedas = steps
    .filter(s => s.toolCalls?.some(tc => tc.toolName === 'buscarEnNomina'))
    .flatMap(s => s.toolCalls!.map(tc => tc.args.consulta as string));

  const tokensTotal = steps.reduce(
    (acc, step) => acc + (step.usage?.totalTokens ?? 0),
    0
  );

  return {
    respuesta: text,
    metricas: {
      pregunta,
      busquedasRealizadas: busquedas.length,
      consultasUsadas: busquedas,
      pasosTotal: steps.length,
      tokensUsados: tokensTotal,
      tiempoMs: Date.now() - inicio,
    },
  };
}

// Uso
const { respuesta, metricas } = await ejecutarConMetricas(
  asistenteNomina,
  '¿Cuántos días me tocan de vacaciones si llevo 3 años?'
);

console.log('Respuesta:', respuesta);
console.log('Métricas:', metricas);
// {
//   pregunta: "¿Cuántos días...",
//   busquedasRealizadas: 1,
//   consultasUsadas: ["vacaciones antigüedad"],
//   pasosTotal: 2,
//   tokensUsados: 487,
//   tiempoMs: 1234
// }
```

## Integración con React Router v7

```typescript
// app/routes/api.asistente-legal.ts
import type { Route } from './+types/api.asistente-legal';
import { asistenteLegal } from '~/lib/agentes/legal.server';

export async function action({ request }: Route.ActionArgs) {
  const { messages } = await request.json();

  const result = asistenteLegal.stream({ messages });

  return result.toUIMessageStreamResponse();
}
```

```tsx
// app/routes/legal.tsx
import { useState } from 'react';
import { useChat, DefaultChatTransport } from '@ai-sdk/react';

export default function AsistenteLegal() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/asistente-legal',
    }),
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Asistente Legal - Ley Federal del Trabajo
      </h1>

      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4 text-sm">
        Esta información es orientativa. Para casos específicos, consulta a un abogado.
      </div>

      <div className="space-y-4 mb-4 h-[60vh] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-4 rounded-lg ${
              m.role === 'user'
                ? 'bg-blue-100 ml-8'
                : 'bg-gray-100 mr-8'
            }`}
          >
            {m.parts.map((part, i) =>
              part.type === 'text' ? (
                <p key={i} className="whitespace-pre-wrap">{part.text}</p>
              ) : null
            )}
          </div>
        ))}

        {status === 'streaming' && (
          <div className="bg-gray-100 mr-8 p-4 rounded-lg animate-pulse">
            Consultando la ley...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre tus derechos laborales..."
          className="flex-1 p-3 border rounded-lg"
          disabled={status === 'streaming'}
        />
        <button
          type="submit"
          disabled={status === 'streaming'}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
```

## Resumen

| Concepto | Qué aprendiste |
|----------|----------------|
| **Agentic RAG** | El agente decide cuándo y qué buscar |
| **Tool de búsqueda** | Encapsula RAG como una herramienta del agente |
| **Descripción del tool** | Guía al modelo sobre cuándo usar la búsqueda |
| **Query reformulation** | Intentar búsquedas alternativas si no encuentra |
| **Multi-hop reasoning** | Descomponer preguntas complejas en múltiples búsquedas |
| **Decisión inteligente** | No buscar cuando no es necesario |
| **Contexto de conversación** | Usar historial para evitar búsquedas redundantes |
| **Métricas** | Monitorear búsquedas, pasos, y tokens |

### RAG Tradicional vs Agentic RAG

| RAG Tradicional | Agentic RAG |
|-----------------|-------------|
| Siempre busca | Decide si buscar |
| Una consulta por pregunta | Múltiples consultas si necesita |
| Flujo fijo | Flujo adaptativo |
| No reformula | Reformula si no encuentra |
| Sin contexto conversacional | Recuerda búsquedas previas |

### Cuándo usar Agentic RAG

| Usa RAG Tradicional | Usa Agentic RAG |
|---------------------|-----------------|
| Preguntas siempre sobre documentos | Mezcla de chat y consultas |
| Flujo predecible | Preguntas variadas |
| Latencia crítica | Calidad sobre velocidad |
| Presupuesto limitado | Mejor experiencia de usuario |

---

En el próximo capítulo exploraremos **Audio y Speech**: cómo integrar voz en tus aplicaciones, desde transcripción hasta síntesis de voz, combinando las capacidades de audio de los LLMs modernos con el AI SDK.
