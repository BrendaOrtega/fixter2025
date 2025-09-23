# LlamaIndex TypeScript - Functional Patterns and Best Practices

## Overview

LlamaIndex TypeScript follows functional programming principles, emphasizing pure functions, immutable data, and function composition. This document outlines the correct patterns and best practices for building workflows in the functional style.

## Core Functional Principles

### 1. Pure Functions

Functions that always return the same output for the same input and have no side effects.

```typescript
// Pure function - predictable and testable
async function extractText(input: DocumentInput): Promise<ExtractedText> {
  return {
    text: input.content.trim().replace(/\s+/g, " "),
    wordCount: input.content.split(/\s+/).length,
    characterCount: input.content.length,
  };
}
```

### 2. Immutable Data Structures

Data that cannot be changed after creation, preventing unexpected mutations.

```typescript
interface DocumentState {
  readonly content: string;
  readonly metadata: Readonly<Record<string, any>>;
  readonly processed?: Readonly<ProcessedData>;
}
```

### 3. Function Composition

Building complex operations by combining simpler functions.

```typescript
const documentPipeline = compose(
  analyzeContent,
  generateEmbeddings,
  chunkText,
  extractText
);
```

## Functional Workflow Patterns

### 1. Sequential Processing Pattern

**Use Case**: Step-by-step data transformation
**Implementation**: Chain async functions with proper error handling

```typescript
async function sequentialWorkflow(
  input: DocumentInput
): Promise<ProcessedDocument> {
  try {
    const step1 = await extractText(input);
    const step2 = await chunkText(step1);
    const step3 = await generateEmbeddings(step2);
    const step4 = await analyzeContent(step3);

    return createResult(input, step4);
  } catch (error) {
    throw new WorkflowError(`Sequential processing failed: ${error.message}`);
  }
}
```

**Best Practices**:

- Each function handles one transformation
- Use proper TypeScript types for each step
- Handle errors at appropriate boundaries
- Keep intermediate results immutable

### 2. Parallel Processing Pattern

**Use Case**: Independent operations that can run concurrently
**Implementation**: Use Promise.all for concurrent execution

```typescript
async function parallelWorkflow(
  inputs: readonly DocumentInput[]
): Promise<readonly ProcessedDocument[]> {
  const processingPromises = inputs.map((input) =>
    sequentialWorkflow(input).catch((error) => ({
      error: error.message,
      input: input.content.substring(0, 50),
    }))
  );

  return Promise.all(processingPromises);
}
```

**Best Practices**:

- Use Promise.all for truly independent operations
- Handle partial failures gracefully
- Consider resource limits for large parallel operations
- Implement proper timeout handling

### 3. Streaming Pattern

**Use Case**: Processing large datasets with real-time feedback
**Implementation**: Use async generators for streaming results

```typescript
async function* streamingWorkflow(
  input: DocumentInput
): AsyncGenerator<ProgressUpdate, ProcessedDocument> {
  yield { step: "starting", progress: 0 };

  const extracted = await extractText(input);
  yield { step: "extracted", progress: 0.25, data: extracted };

  const chunks = await chunkText(extracted);
  yield { step: "chunked", progress: 0.5, data: chunks };

  const embeddings = await generateEmbeddings(chunks);
  yield { step: "embedded", progress: 0.75, data: embeddings };

  const result = await analyzeContent(embeddings);
  return createResult(input, result);
}
```

**Best Practices**:

- Yield meaningful progress updates
- Include relevant data in progress updates
- Handle backpressure in streaming scenarios
- Provide cancellation mechanisms

### 4. Conditional Processing Pattern

**Use Case**: Different processing paths based on input characteristics
**Implementation**: Use functional branching with type guards

```typescript
async function conditionalWorkflow(
  input: DocumentInput
): Promise<ProcessedDocument> {
  if (isTextDocument(input)) {
    return await textProcessingPipeline(input);
  } else if (isImageDocument(input)) {
    return await imageProcessingPipeline(input);
  } else {
    return await genericProcessingPipeline(input);
  }
}

// Type guard functions
function isTextDocument(input: DocumentInput): input is TextDocumentInput {
  return input.type === "text" && typeof input.content === "string";
}
```

**Best Practices**:

- Use type guards for runtime type checking
- Make branching logic explicit and testable
- Provide fallback processing paths
- Document decision criteria clearly

### 5. Error Recovery Pattern

**Use Case**: Robust handling of failures with fallback strategies
**Implementation**: Functional error handling with Either/Result types

```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

async function robustWorkflow(
  input: DocumentInput
): Promise<Result<ProcessedDocument, string>> {
  try {
    const result = await sequentialWorkflow(input);
    return { success: true, data: result };
  } catch (error) {
    // Try fallback processing
    try {
      const fallbackResult = await fallbackProcessing(input);
      return { success: true, data: fallbackResult };
    } catch (fallbackError) {
      return {
        success: false,
        error: `Primary and fallback processing failed: ${error.message}`,
      };
    }
  }
}
```

**Best Practices**:

- Use Result/Either types for explicit error handling
- Implement graceful degradation strategies
- Log errors for monitoring and debugging
- Provide meaningful error messages

## Data Flow Patterns

### 1. Immutable State Updates

```typescript
// Instead of mutating objects
function updateDocumentState(
  state: DocumentState,
  update: Partial<ProcessedData>
): DocumentState {
  return {
    ...state,
    processed: {
      ...state.processed,
      ...update,
    },
  };
}
```

### 2. Functional Pipelines

```typescript
// Compose functions for complex transformations
const processingPipeline = pipe(
  validateInput,
  extractText,
  chunkText,
  generateEmbeddings,
  analyzeContent,
  formatOutput
);

// Utility function for pipe composition
function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}
```

### 3. Monadic Error Handling

```typescript
class Maybe<T> {
  constructor(private value: T | null) {}

  static of<T>(value: T | null): Maybe<T> {
    return new Maybe(value);
  }

  map<U>(fn: (value: T) => U): Maybe<U> {
    return this.value ? Maybe.of(fn(this.value)) : Maybe.of(null);
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return this.value ? fn(this.value) : Maybe.of(null);
  }

  getOrElse(defaultValue: T): T {
    return this.value ?? defaultValue;
  }
}

// Usage in workflows
async function safeWorkflow(
  input: DocumentInput
): Promise<Maybe<ProcessedDocument>> {
  return Maybe.of(input)
    .map(validateInput)
    .flatMap(async (validInput) => {
      try {
        const result = await sequentialWorkflow(validInput);
        return Maybe.of(result);
      } catch {
        return Maybe.of(null);
      }
    });
}
```

## Performance Optimization

### 1. Lazy Evaluation

```typescript
// Lazy evaluation for expensive operations
function createLazyProcessor(input: DocumentInput) {
  let cachedResult: ProcessedDocument | null = null;

  return {
    async process(): Promise<ProcessedDocument> {
      if (!cachedResult) {
        cachedResult = await sequentialWorkflow(input);
      }
      return cachedResult;
    },
  };
}
```

### 2. Memoization

```typescript
// Memoize expensive pure functions
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

const memoizedExtractText = memoize(extractText);
```

### 3. Resource Management

```typescript
// Functional resource management with cleanup
async function withResource<T, R>(
  acquire: () => Promise<T>,
  use: (resource: T) => Promise<R>,
  release: (resource: T) => Promise<void>
): Promise<R> {
  const resource = await acquire();
  try {
    return await use(resource);
  } finally {
    await release(resource);
  }
}

// Usage
const result = await withResource(
  () => createConnection(),
  (connection) => processWithConnection(connection, input),
  (connection) => connection.close()
);
```

## Testing Strategies

### 1. Pure Function Testing

```typescript
describe("extractText", () => {
  it("should extract and clean text content", () => {
    const input: DocumentInput = {
      content: "  Hello   World!  ",
      metadata: {},
    };

    const result = await extractText(input);

    expect(result.text).toBe("Hello World!");
    expect(result.wordCount).toBe(2);
    expect(result.characterCount).toBe(12);
  });
});
```

### 2. Property-Based Testing

```typescript
import { fc } from "fast-check";

describe("chunkText properties", () => {
  it("should preserve total content when chunking", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.integer({ min: 10, max: 100 }),
        async (content, chunkSize) => {
          const input = { text: content, wordCount: 0, characterCount: 0 };
          const result = await chunkText(input, chunkSize);

          const reconstructed = result.chunks.join(" ");
          expect(reconstructed.replace(/\s+/g, " ")).toContain(content.trim());
        }
      )
    );
  });
});
```

### 3. Integration Testing

```typescript
describe("Full Workflow Integration", () => {
  it("should process document end-to-end", async () => {
    const input: DocumentInput = {
      content: "Sample document for testing workflow integration.",
      metadata: { test: true },
    };

    const result = await sequentialWorkflow(input);

    expect(result.analysis.wordCount).toBeGreaterThan(0);
    expect(result.metadata.documentId).toBeDefined();
    expect(result.originalContent).toBe(input.content);
  });
});
```

## Common Anti-Patterns to Avoid

### 1. Mutating Input Data

```typescript
// ❌ Avoid: Mutating input
async function badExtractText(input: DocumentInput): Promise<ExtractedText> {
  input.content = input.content.trim(); // Don't mutate input!
  return { text: input.content, wordCount: 0, characterCount: 0 };
}

// ✅ Good: Return new data
async function goodExtractText(input: DocumentInput): Promise<ExtractedText> {
  const cleanContent = input.content.trim();
  return { text: cleanContent, wordCount: 0, characterCount: 0 };
}
```

### 2. Side Effects in Pure Functions

```typescript
// ❌ Avoid: Side effects
async function badProcessing(input: DocumentInput): Promise<ProcessedDocument> {
  console.log("Processing..."); // Side effect!
  await saveToDatabase(input); // Side effect!
  return processDocument(input);
}

// ✅ Good: Separate pure logic from side effects
async function goodProcessing(
  input: DocumentInput
): Promise<ProcessedDocument> {
  return processDocument(input); // Pure transformation
}

async function withLogging(input: DocumentInput): Promise<ProcessedDocument> {
  console.log("Processing...");
  const result = await goodProcessing(input);
  await saveToDatabase(result);
  return result;
}
```

### 3. Tight Coupling

```typescript
// ❌ Avoid: Functions that know too much about each other
async function tightlyCoupled(
  input: DocumentInput
): Promise<ProcessedDocument> {
  const extracted = await extractText(input);
  // This function knows internal details of chunkText
  const chunks = await chunkText(extracted, 100, "sentence-based");
  return processChunks(chunks);
}

// ✅ Good: Loose coupling with clear interfaces
async function looselyCoupled(
  input: DocumentInput
): Promise<ProcessedDocument> {
  const extracted = await extractText(input);
  const chunks = await chunkText(extracted);
  return processChunks(chunks);
}
```

## Deployment Considerations

### 1. Configuration Management

```typescript
interface WorkflowConfig {
  readonly chunkSize: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly enableCaching: boolean;
}

function createWorkflow(config: WorkflowConfig) {
  return {
    async process(input: DocumentInput): Promise<ProcessedDocument> {
      return sequentialWorkflow(input, config);
    },
  };
}
```

### 2. Monitoring and Observability

```typescript
interface WorkflowMetrics {
  readonly startTime: number;
  readonly endTime: number;
  readonly stepDurations: readonly number[];
  readonly success: boolean;
  readonly errorMessage?: string;
}

async function monitoredWorkflow(
  input: DocumentInput
): Promise<ProcessedDocument> {
  const startTime = Date.now();
  const stepDurations: number[] = [];

  try {
    const stepStart = Date.now();
    const result = await sequentialWorkflow(input);
    stepDurations.push(Date.now() - stepStart);

    recordMetrics({
      startTime,
      endTime: Date.now(),
      stepDurations,
      success: true,
    });

    return result;
  } catch (error) {
    recordMetrics({
      startTime,
      endTime: Date.now(),
      stepDurations,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}
```

## Conclusion

LlamaIndex TypeScript's functional approach provides:

1. **Predictability**: Pure functions are easier to reason about and test
2. **Composability**: Small functions can be combined to create complex workflows
3. **Immutability**: Prevents unexpected data mutations and side effects
4. **Type Safety**: TypeScript's type system catches errors at compile time
5. **Testability**: Pure functions are inherently easier to unit test

Key principles to remember:

- Favor pure functions over stateful classes
- Use immutable data structures
- Compose functions to build complex operations
- Handle errors functionally with Result/Either types
- Keep side effects at the boundaries of your application
