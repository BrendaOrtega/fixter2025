/**
 * Streaming Workflow Example
 *
 * This example demonstrates real-time streaming capabilities in Agent Workflows,
 * including progressive results, event streaming, and asynchronous processing.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  Context,
  step,
} from "@llamaindex/workflow";

// Streaming-specific events
export class StreamChunkEvent extends WorkflowEvent<{
  chunk: string;
  index: number;
  total?: number;
}> {}
export class ProgressEvent extends WorkflowEvent<{
  progress: number;
  message: string;
}> {}
export class StreamCompleteEvent extends WorkflowEvent<{
  chunks: string[];
  metadata: any;
}> {}

// Context for streaming operations
interface StreamingWorkflowContext extends Context {
  streamBuffer?: string[];
  totalChunks?: number;
  processedChunks?: number;
  startTime?: number;
}

/**
 * Real-time Document Processing Workflow with Streaming
 *
 * Demonstrates:
 * - Progressive result streaming
 * - Real-time progress updates
 * - Asynchronous chunk processing
 * - Performance monitoring
 */
export class StreamingWorkflow extends Workflow<StreamingWorkflowContext> {
  /**
   * Initialize streaming process
   */
  @step()
  async initializeStream(
    context: StreamingWorkflowContext,
    event: StartEvent<{ document: string; chunkSize?: number }>
  ): Promise<StreamChunkEvent> {
    console.log("🌊 Initializing streaming workflow...");

    const { document, chunkSize = 100 } = event.data;

    // Initialize context
    context.streamBuffer = [];
    context.processedChunks = 0;
    context.startTime = Date.now();

    // Split document into chunks
    const chunks: string[] = [];
    for (let i = 0; i < document.length; i += chunkSize) {
      chunks.push(document.substring(i, i + chunkSize));
    }

    context.totalChunks = chunks.length;

    console.log(
      `📊 Document split into ${chunks.length} chunks of ~${chunkSize} characters`
    );

    // Start streaming first chunk
    return new StreamChunkEvent({
      chunk: chunks[0],
      index: 0,
      total: chunks.length,
    });
  }

  /**
   * Process individual chunks with streaming output
   */
  @step()
  async processChunk(
    context: StreamingWorkflowContext,
    event: StreamChunkEvent
  ): Promise<StreamChunkEvent | ProgressEvent | StreamCompleteEvent> {
    const { chunk, index, total } = event.data;

    console.log(`🔄 Processing chunk ${index + 1}/${total}...`);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Process the chunk (simulate text analysis)
    const processedChunk = {
      originalChunk: chunk,
      processed: chunk.toLowerCase().trim(),
      wordCount: chunk.split(/\s+/).length,
      characterCount: chunk.length,
      processedAt: Date.now(),
    };

    // Store in buffer
    context.streamBuffer!.push(JSON.stringify(processedChunk));
    context.processedChunks = (context.processedChunks || 0) + 1;

    // Calculate progress
    const progress = Math.round(
      (context.processedChunks / context.totalChunks!) * 100
    );

    // Emit progress event
    if (context.processedChunks < context.totalChunks!) {
      // Continue with next chunk
      const nextIndex = index + 1;

      // Emit progress update
      setTimeout(() => {
        this.sendEvent(
          new ProgressEvent({
            progress,
            message: `Processed ${context.processedChunks}/${context.totalChunks} chunks`,
          })
        );
      }, 50);

      // Continue streaming
      return new StreamChunkEvent({
        chunk: `chunk_${nextIndex}`, // In real implementation, this would be the actual next chunk
        index: nextIndex,
        total,
      });
    } else {
      // All chunks processed
      return new StreamCompleteEvent({
        chunks: context.streamBuffer!,
        metadata: {
          totalChunks: context.totalChunks,
          processingTime: Date.now() - context.startTime!,
          averageChunkSize:
            context.streamBuffer!.reduce(
              (sum, chunk) => sum + chunk.length,
              0
            ) / context.streamBuffer!.length,
        },
      });
    }
  }

  /**
   * Handle progress updates (optional step for monitoring)
   */
  @step()
  async updateProgress(
    context: StreamingWorkflowContext,
    event: ProgressEvent
  ): Promise<void> {
    const { progress, message } = event.data;

    console.log(`📈 Progress: ${progress}% - ${message}`);

    // In a real application, this could:
    // - Update a progress bar in the UI
    // - Send progress to a monitoring system
    // - Trigger notifications at certain milestones

    // This step doesn't return an event, so workflow continues with other active steps
  }

  /**
   * Finalize streaming results
   */
  @step()
  async finalizeStream(
    context: StreamingWorkflowContext,
    event: StreamCompleteEvent
  ): Promise<StopEvent<{ success: true; results: any; performance: any }>> {
    console.log("🎯 Finalizing streaming results...");

    const { chunks, metadata } = event.data;

    // Aggregate results
    const aggregatedResults = {
      totalChunks: chunks.length,
      totalCharacters: chunks.reduce((sum, chunk) => sum + chunk.length, 0),
      processingComplete: true,
      timestamp: new Date().toISOString(),
    };

    const performance = {
      ...metadata,
      chunksPerSecond: Math.round(
        metadata.totalChunks / (metadata.processingTime / 1000)
      ),
      charactersPerSecond: Math.round(
        aggregatedResults.totalCharacters / (metadata.processingTime / 1000)
      ),
    };

    console.log("✅ Streaming workflow completed!");
    console.log(
      `⚡ Performance: ${performance.chunksPerSecond} chunks/sec, ${performance.charactersPerSecond} chars/sec`
    );

    return new StopEvent({
      success: true,
      results: aggregatedResults,
      performance,
    });
  }
}

/**
 * Advanced Streaming Workflow with Real-time Analytics
 */
export class AdvancedStreamingWorkflow extends Workflow<StreamingWorkflowContext> {
  private streamingCallbacks: Array<(data: any) => void> = [];

  /**
   * Register callback for real-time updates
   */
  onStreamUpdate(callback: (data: any) => void) {
    this.streamingCallbacks.push(callback);
  }

  /**
   * Emit real-time update to all registered callbacks
   */
  private emitUpdate(data: any) {
    this.streamingCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in streaming callback:", error);
      }
    });
  }

  @step()
  async streamWithAnalytics(
    context: StreamingWorkflowContext,
    event: StartEvent<{ data: any[]; analysisType: string }>
  ): Promise<StopEvent<{ analytics: any; streamResults: any[] }>> {
    console.log("📊 Starting advanced streaming with real-time analytics...");

    const { data, analysisType } = event.data;
    const results: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Process item
      const processed = await this.processItem(item, analysisType);
      results.push(processed);

      // Emit real-time update
      const update = {
        type: "progress",
        processed: i + 1,
        total: data.length,
        currentResult: processed,
        timestamp: Date.now(),
      };

      this.emitUpdate(update);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Final analytics
    const analytics = {
      totalProcessed: results.length,
      processingTime: Date.now() - (context.startTime || Date.now()),
      analysisType,
      summary: this.generateSummary(results),
    };

    this.emitUpdate({
      type: "complete",
      analytics,
      results,
    });

    return new StopEvent({
      analytics,
      streamResults: results,
    });
  }

  private async processItem(item: any, analysisType: string): Promise<any> {
    // Simulate different types of analysis
    switch (analysisType) {
      case "sentiment":
        return {
          original: item,
          sentiment: Math.random() > 0.5 ? "positive" : "negative",
          confidence: Math.random(),
        };
      case "classification":
        return {
          original: item,
          category: ["tech", "business", "science", "arts"][
            Math.floor(Math.random() * 4)
          ],
          confidence: Math.random(),
        };
      default:
        return {
          original: item,
          processed: true,
          timestamp: Date.now(),
        };
    }
  }

  private generateSummary(results: any[]): any {
    return {
      count: results.length,
      categories: [
        ...new Set(
          results.map((r) => r.category || r.sentiment).filter(Boolean)
        ),
      ],
      averageConfidence:
        results.reduce((sum, r) => sum + (r.confidence || 0), 0) /
        results.length,
    };
  }
}

/**
 * Usage examples for streaming workflows
 */
export async function runStreamingExamples() {
  console.log("🌊 Starting Streaming Workflow Examples...\n");

  // Example 1: Basic streaming
  console.log("📝 Example 1: Basic Document Streaming");
  const basicWorkflow = new StreamingWorkflow();

  const document = `
    This is a longer document that will be processed in chunks to demonstrate
    streaming capabilities. Each chunk will be processed individually and
    progress will be reported in real-time. This allows for better user
    experience when dealing with large documents or long-running processes.
    
    The streaming approach is particularly useful for:
    - Large document processing
    - Real-time data analysis
    - Progressive result display
    - Better resource management
    - Improved user feedback
  `.trim();

  const basicResult = await basicWorkflow.run({
    document,
    chunkSize: 50,
  });

  console.log("Basic Streaming Result:", basicResult.data);
  console.log();

  // Example 2: Advanced streaming with callbacks
  console.log("📊 Example 2: Advanced Streaming with Real-time Analytics");
  const advancedWorkflow = new AdvancedStreamingWorkflow();

  // Register real-time callback
  advancedWorkflow.onStreamUpdate((data) => {
    if (data.type === "progress") {
      console.log(
        `📈 Real-time update: ${data.processed}/${data.total} processed`
      );
    } else if (data.type === "complete") {
      console.log(
        "🎉 Streaming complete! Final analytics:",
        data.analytics.summary
      );
    }
  });

  const sampleData = [
    "Great product, highly recommended!",
    "Poor quality, not worth the money",
    "Excellent service and fast delivery",
    "Could be better, average experience",
    "Outstanding quality and value",
  ];

  const advancedResult = await advancedWorkflow.run({
    data: sampleData,
    analysisType: "sentiment",
  });

  console.log("Advanced Streaming Result:", advancedResult.data);
}

export { StreamingWorkflow, AdvancedStreamingWorkflow };
