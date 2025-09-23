# Agent Workflows Patterns and Best Practices

## Overview

This document consolidates the patterns, best practices, and lessons learned from researching LlamaIndex Agent Workflows. It serves as a practical guide for implementing robust, scalable, and maintainable workflows.

## Core Design Patterns

### 1. Linear Workflow Pattern

**Use Case**: Simple, sequential processing tasks
**When to Use**: When each step depends on the previous step's output
**Example**: Document processing pipeline (ingest → process → analyze → output)

```typescript
class LinearWorkflow extends Workflow {
  @step() async stepA() {
    /* ... */
  }
  @step() async stepB() {
    /* ... */
  }
  @step() async stepC() {
    /* ... */
  }
}
```

**Best Practices**:

- Keep steps focused on single responsibilities
- Use clear, descriptive step names
- Pass minimal data between steps
- Handle errors at each step boundary

### 2. Branching Workflow Pattern

**Use Case**: Conditional execution based on data or business logic
**When to Use**: When workflow path depends on input validation, user choices, or data characteristics
**Example**: Content processing that routes differently for text vs. images

```typescript
class BranchingWorkflow extends Workflow {
  @step()
  async route(event: StartEvent): Promise<TextEvent | ImageEvent> {
    return event.data.type === "text"
      ? new TextEvent(event.data)
      : new ImageEvent(event.data);
  }

  @step() async processText(event: TextEvent) {
    /* ... */
  }
  @step() async processImage(event: ImageEvent) {
    /* ... */
  }
}
```

**Best Practices**:

- Make routing logic explicit and testable
- Use type-safe events for different branches
- Document decision criteria clearly
- Provide fallback paths for unexpected inputs

### 3. Parallel Execution Pattern

**Use Case**: Independent operations that can run concurrently
**When to Use**: When multiple tools/services can be called simultaneously
**Example**: Multi-source data gathering, parallel API calls

```typescript
class ParallelWorkflow extends Workflow {
  @step()
  async executeParallel(event: StartEvent): Promise<StopEvent> {
    const promises = event.data.tasks.map((task) => this.processTask(task));
    const results = await Promise.all(promises);
    return new StopEvent({ results });
  }
}
```

**Best Practices**:

- Use Promise.all for truly independent operations
- Implement proper error handling for partial failures
- Consider timeout strategies for long-running operations
- Monitor resource usage with concurrent operations

### 4. Streaming Pattern

**Use Case**: Real-time processing with progressive results
**When to Use**: Large datasets, long-running processes, user experience requirements
**Example**: Document analysis with live progress updates

```typescript
class StreamingWorkflow extends Workflow {
  @step()
  async processStream(event: StartEvent): Promise<StreamEvent> {
    for (const chunk of event.data.chunks) {
      const result = await this.processChunk(chunk);
      this.emitProgress(result);
    }
    return new StreamCompleteEvent();
  }
}
```

**Best Practices**:

- Emit progress events regularly
- Handle backpressure in streaming scenarios
- Implement proper cleanup for interrupted streams
- Provide meaningful progress indicators

### 5. Error Recovery Pattern

**Use Case**: Robust handling of failures and retries
**When to Use**: When dealing with unreliable external services
**Example**: API calls with exponential backoff

```typescript
class RobustWorkflow extends Workflow {
  @step()
  async callExternalService(
    event: CallEvent
  ): Promise<SuccessEvent | RetryEvent> {
    try {
      const result = await this.externalCall(event.data);
      return new SuccessEvent(result);
    } catch (error) {
      if (event.data.retryCount < MAX_RETRIES) {
        await this.delay(Math.pow(2, event.data.retryCount) * 1000);
        return new RetryEvent({
          ...event.data,
          retryCount: event.data.retryCount + 1,
        });
      }
      throw error;
    }
  }
}
```

**Best Practices**:

- Implement exponential backoff for retries
- Set maximum retry limits
- Log failures for monitoring
- Provide circuit breaker patterns for cascading failures

## State Management Best Practices

### 1. Context Design

**Principle**: Keep context minimal and focused

```typescript
interface WorkflowContext extends Context {
  // Essential state only
  documentId: string;
  processingStage: "ingestion" | "processing" | "analysis";

  // Avoid large objects in context
  // Instead, store references or IDs
  resultIds?: string[];
}
```

**Best Practices**:

- Store only essential state in context
- Use references instead of large objects
- Implement context validation
- Consider context serialization requirements

### 2. Event-Driven Communication

**Principle**: Prefer events over direct context manipulation

```typescript
// Good: Event-driven
@step()
async processData(event: DataEvent): Promise<ResultEvent> {
  const result = await this.process(event.data);
  return new ResultEvent(result);
}

// Avoid: Direct context manipulation
@step()
async processData(context: Context, event: DataEvent): Promise<void> {
  context.result = await this.process(event.data); // Avoid this
}
```

**Best Practices**:

- Use events for step-to-step communication
- Make events type-safe with generics
- Keep event payloads focused and minimal
- Document event flow in complex workflows

### 3. State Validation

**Principle**: Validate state at critical boundaries

```typescript
@step()
async validateState(context: WorkflowContext): Promise<ValidEvent | ErrorEvent> {
  if (!context.documentId) {
    return new ErrorEvent({ error: 'Missing document ID' });
  }

  if (!this.isValidStage(context.processingStage)) {
    return new ErrorEvent({ error: 'Invalid processing stage' });
  }

  return new ValidEvent();
}
```

## Performance Optimization

### 1. Async Operations

**Best Practices**:

- Use async/await consistently
- Avoid blocking operations in steps
- Implement proper timeout handling
- Consider operation cancellation

### 2. Resource Management

```typescript
class OptimizedWorkflow extends Workflow {
  private connectionPool = new ConnectionPool();

  @step()
  async processWithPool(event: ProcessEvent): Promise<ResultEvent> {
    const connection = await this.connectionPool.acquire();
    try {
      const result = await connection.process(event.data);
      return new ResultEvent(result);
    } finally {
      this.connectionPool.release(connection);
    }
  }
}
```

**Best Practices**:

- Use connection pooling for external services
- Implement proper resource cleanup
- Monitor memory usage in long-running workflows
- Consider workflow instance lifecycle

### 3. Caching Strategies

```typescript
class CachedWorkflow extends Workflow {
  private cache = new Map<string, any>();

  @step()
  async cachedOperation(event: CacheableEvent): Promise<ResultEvent> {
    const cacheKey = this.generateCacheKey(event.data);

    if (this.cache.has(cacheKey)) {
      return new ResultEvent(this.cache.get(cacheKey));
    }

    const result = await this.expensiveOperation(event.data);
    this.cache.set(cacheKey, result);

    return new ResultEvent(result);
  }
}
```

## Error Handling Strategies

### 1. Graceful Degradation

```typescript
@step()
async processWithFallback(event: ProcessEvent): Promise<ResultEvent> {
  try {
    const result = await this.primaryService.process(event.data);
    return new ResultEvent(result);
  } catch (error) {
    console.warn('Primary service failed, using fallback');
    const fallbackResult = await this.fallbackService.process(event.data);
    return new ResultEvent({ ...fallbackResult, fallback: true });
  }
}
```

### 2. Circuit Breaker Pattern

```typescript
class CircuitBreakerWorkflow extends Workflow {
  private circuitBreaker = new CircuitBreaker();

  @step()
  async protectedCall(event: CallEvent): Promise<ResultEvent | ErrorEvent> {
    if (this.circuitBreaker.isOpen()) {
      return new ErrorEvent({ error: "Circuit breaker open" });
    }

    try {
      const result = await this.externalService.call(event.data);
      this.circuitBreaker.recordSuccess();
      return new ResultEvent(result);
    } catch (error) {
      this.circuitBreaker.recordFailure();
      return new ErrorEvent({ error: error.message });
    }
  }
}
```

### 3. Comprehensive Error Context

```typescript
interface ErrorContext {
  step: string;
  timestamp: number;
  input: any;
  error: string;
  stackTrace?: string;
  retryCount: number;
  workflowId: string;
}

@step()
async handleError(event: ErrorEvent): Promise<StopEvent> {
  const errorContext: ErrorContext = {
    step: event.data.step,
    timestamp: Date.now(),
    input: event.data.input,
    error: event.data.error,
    retryCount: event.data.retryCount || 0,
    workflowId: this.workflowId
  };

  // Log for monitoring
  this.logger.error('Workflow error', errorContext);

  // Notify monitoring systems
  this.monitoring.recordError(errorContext);

  return new StopEvent({ error: errorContext });
}
```

## Testing Strategies

### 1. Unit Testing Steps

```typescript
describe("DocumentWorkflow", () => {
  let workflow: DocumentWorkflow;

  beforeEach(() => {
    workflow = new DocumentWorkflow();
  });

  it("should process document correctly", async () => {
    const event = new ProcessDocumentEvent({ content: "test content" });
    const context = { documentId: "test-doc" };

    const result = await workflow.processDocument(context, event);

    expect(result).toBeInstanceOf(AnalyzeEvent);
    expect(result.data.processedContent).toBe("test content");
  });
});
```

### 2. Integration Testing

```typescript
describe("Full Workflow Integration", () => {
  it("should complete end-to-end processing", async () => {
    const workflow = new DocumentWorkflow();

    const result = await workflow.run({
      document: "Sample document content for testing",
    });

    expect(result.data.success).toBe(true);
    expect(result.data.metadata).toBeDefined();
  });
});
```

### 3. Mock External Dependencies

```typescript
class TestableWorkflow extends Workflow {
  constructor(private externalService = new ExternalService()) {
    super();
  }

  @step()
  async callExternal(event: CallEvent): Promise<ResultEvent> {
    const result = await this.externalService.call(event.data);
    return new ResultEvent(result);
  }
}

// In tests
const mockService = {
  call: jest.fn().mockResolvedValue({ success: true }),
};
const workflow = new TestableWorkflow(mockService);
```

## Monitoring and Observability

### 1. Workflow Metrics

```typescript
class MonitoredWorkflow extends Workflow {
  private metrics = new MetricsCollector();

  @step()
  async monitoredStep(event: ProcessEvent): Promise<ResultEvent> {
    const startTime = Date.now();

    try {
      const result = await this.processData(event.data);

      this.metrics.recordSuccess("processData", Date.now() - startTime);
      return new ResultEvent(result);
    } catch (error) {
      this.metrics.recordError("processData", error);
      throw error;
    }
  }
}
```

### 2. Distributed Tracing

```typescript
@step()
async tracedStep(event: ProcessEvent): Promise<ResultEvent> {
  const span = this.tracer.startSpan('processData');

  try {
    span.setAttributes({
      'workflow.id': this.workflowId,
      'step.name': 'processData',
      'input.size': JSON.stringify(event.data).length
    });

    const result = await this.processData(event.data);

    span.setStatus({ code: SpanStatusCode.OK });
    return new ResultEvent(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

## Common Anti-Patterns to Avoid

### 1. Monolithic Steps

```typescript
// Avoid: Doing too much in one step
@step()
async doEverything(event: StartEvent): Promise<StopEvent> {
  const data = await this.fetchData();
  const processed = await this.processData(data);
  const analyzed = await this.analyzeData(processed);
  const formatted = await this.formatResults(analyzed);
  return new StopEvent(formatted);
}

// Better: Break into focused steps
@step() async fetchData() { /* ... */ }
@step() async processData() { /* ... */ }
@step() async analyzeData() { /* ... */ }
@step() async formatResults() { /* ... */ }
```

### 2. Context Overuse

```typescript
// Avoid: Storing everything in context
interface BadContext extends Context {
  rawData: LargeObject;
  processedData: AnotherLargeObject;
  intermediateResults: YetAnotherLargeObject;
  // ... many more large objects
}

// Better: Store references and use events
interface GoodContext extends Context {
  dataId: string;
  processingStage: string;
}
```

### 3. Tight Coupling

```typescript
// Avoid: Steps that know too much about each other
@step()
async stepA(): Promise<SpecificEventForStepB> {
  // This step knows exactly what stepB needs
}

// Better: Use generic, reusable events
@step()
async stepA(): Promise<DataProcessedEvent> {
  // This step emits a generic event that any step can handle
}
```

## Deployment and Production Considerations

### 1. Configuration Management

```typescript
interface WorkflowConfig {
  maxRetries: number;
  timeoutMs: number;
  externalServiceUrls: Record<string, string>;
  enableCaching: boolean;
}

class ConfigurableWorkflow extends Workflow {
  constructor(private config: WorkflowConfig) {
    super();
  }
}
```

### 2. Health Checks

```typescript
class ProductionWorkflow extends Workflow {
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    details: any;
  }> {
    try {
      await this.externalService.ping();
      return { status: "healthy", details: { timestamp: Date.now() } };
    } catch (error) {
      return { status: "unhealthy", details: { error: error.message } };
    }
  }
}
```

### 3. Graceful Shutdown

```typescript
class GracefulWorkflow extends Workflow {
  private isShuttingDown = false;

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Wait for current operations to complete
    await this.waitForCompletion();

    // Clean up resources
    await this.cleanup();
  }

  @step()
  async checkShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error("Workflow is shutting down");
    }
  }
}
```

## Conclusion

These patterns and best practices provide a foundation for building robust, maintainable Agent Workflows. The key principles are:

1. **Simplicity**: Keep steps focused and workflows understandable
2. **Reliability**: Implement proper error handling and recovery
3. **Performance**: Optimize for your specific use cases
4. **Observability**: Monitor and measure workflow behavior
5. **Testability**: Design for easy testing and validation

Remember that these are guidelines, not rigid rules. Adapt them to your specific requirements and constraints.
