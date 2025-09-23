/**
 * Tool Integration Example
 *
 * This example demonstrates how to integrate external tools and APIs
 * into Agent Workflows, including error handling, retries, and
 * tool orchestration patterns.
 */

import {
  Workflow,
  StartEvent,
  StopEvent,
  WorkflowEvent,
  Context,
  step,
} from "@llamaindex/workflow";

// Tool-related events
export class CallToolEvent extends WorkflowEvent<{
  toolName: string;
  parameters: any;
}> {}
export class ToolResultEvent extends WorkflowEvent<{
  toolName: string;
  result: any;
  success: boolean;
}> {}
export class ToolErrorEvent extends WorkflowEvent<{
  toolName: string;
  error: string;
  retryCount: number;
}> {}

// Context for tool integration
interface ToolWorkflowContext extends Context {
  toolResults?: Record<string, any>;
  toolErrors?: Record<string, string[]>;
  retryAttempts?: Record<string, number>;
  executionPlan?: string[];
}

/**
 * Mock external tools for demonstration
 */
class MockTools {
  /**
   * Simulates a web search API
   */
  static async webSearch(
    query: string
  ): Promise<{ results: any[]; totalResults: number }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error("Web search API temporarily unavailable");
    }

    return {
      results: [
        {
          title: `Result for "${query}"`,
          url: "https://example.com/1",
          snippet: "Mock search result...",
        },
        {
          title: `Another result for "${query}"`,
          url: "https://example.com/2",
          snippet: "Another mock result...",
        },
      ],
      totalResults: 42,
    };
  }

  /**
   * Simulates a translation API
   */
  static async translate(
    text: string,
    targetLanguage: string
  ): Promise<{ translatedText: string; confidence: number }> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (Math.random() < 0.05) {
      throw new Error("Translation service quota exceeded");
    }

    return {
      translatedText: `[${targetLanguage.toUpperCase()}] ${text}`,
      confidence: 0.95,
    };
  }

  /**
   * Simulates a sentiment analysis API
   */
  static async analyzeSentiment(
    text: string
  ): Promise<{ sentiment: string; score: number; confidence: number }> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (Math.random() < 0.08) {
      throw new Error("Sentiment analysis model is updating");
    }

    const sentiments = ["positive", "negative", "neutral"];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

    return {
      sentiment,
      score: Math.random() * 2 - 1, // -1 to 1
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
    };
  }

  /**
   * Simulates a data enrichment API
   */
  static async enrichData(
    data: any
  ): Promise<{ enrichedData: any; sources: string[] }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (Math.random() < 0.12) {
      throw new Error("Data enrichment service connection timeout");
    }

    return {
      enrichedData: {
        ...data,
        enriched: true,
        timestamp: new Date().toISOString(),
        metadata: {
          processingTime: Math.random() * 100,
          confidence: Math.random(),
        },
      },
      sources: ["database_a", "api_service_b", "ml_model_c"],
    };
  }
}

/**
 * Multi-Tool Integration Workflow
 *
 * Demonstrates:
 * - Sequential tool execution
 * - Parallel tool calls
 * - Error handling and retries
 * - Tool result aggregation
 */
export class ToolIntegrationWorkflow extends Workflow<ToolWorkflowContext> {
  private readonly MAX_RETRIES = 3;

  /**
   * Plan tool execution based on input
   */
  @step()
  async planExecution(
    context: ToolWorkflowContext,
    event: StartEvent<{ query: string; operations: string[] }>
  ): Promise<CallToolEvent> {
    console.log("🎯 Planning tool execution...");

    const { query, operations } = event.data;

    // Initialize context
    context.toolResults = {};
    context.toolErrors = {};
    context.retryAttempts = {};
    context.executionPlan = operations;

    console.log(`📋 Execution plan: ${operations.join(" → ")}`);

    // Start with first tool
    const firstTool = operations[0];
    return new CallToolEvent({
      toolName: firstTool,
      parameters: { query },
    });
  }

  /**
   * Execute tool calls with error handling
   */
  @step()
  async executeTool(
    context: ToolWorkflowContext,
    event: CallToolEvent
  ): Promise<ToolResultEvent | ToolErrorEvent> {
    const { toolName, parameters } = event.data;

    console.log(`🔧 Executing tool: ${toolName}`);

    try {
      let result: any;

      // Route to appropriate tool
      switch (toolName) {
        case "webSearch":
          result = await MockTools.webSearch(parameters.query);
          break;
        case "translate":
          result = await MockTools.translate(
            parameters.text,
            parameters.targetLanguage || "es"
          );
          break;
        case "sentiment":
          result = await MockTools.analyzeSentiment(parameters.text);
          break;
        case "enrich":
          result = await MockTools.enrichData(parameters.data);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      console.log(`✅ Tool ${toolName} completed successfully`);

      return new ToolResultEvent({
        toolName,
        result,
        success: true,
      });
    } catch (error) {
      const retryCount = (context.retryAttempts![toolName] || 0) + 1;
      context.retryAttempts![toolName] = retryCount;

      console.log(
        `❌ Tool ${toolName} failed (attempt ${retryCount}): ${error}`
      );

      return new ToolErrorEvent({
        toolName,
        error: error instanceof Error ? error.message : String(error),
        retryCount,
      });
    }
  }

  /**
   * Handle successful tool results
   */
  @step()
  async handleToolResult(
    context: ToolWorkflowContext,
    event: ToolResultEvent
  ): Promise<
    CallToolEvent | StopEvent<{ results: any; executionSummary: any }>
  > {
    const { toolName, result } = event.data;

    console.log(`📊 Processing result from ${toolName}`);

    // Store result
    context.toolResults![toolName] = result;

    // Find next tool in execution plan
    const currentIndex = context.executionPlan!.indexOf(toolName);
    const nextTool = context.executionPlan![currentIndex + 1];

    if (nextTool) {
      // Prepare parameters for next tool based on current result
      let nextParameters: any = {};

      if (nextTool === "sentiment" && toolName === "webSearch") {
        // Use search results for sentiment analysis
        nextParameters = {
          text: result.results.map((r: any) => r.snippet).join(" "),
        };
      } else if (nextTool === "translate" && toolName === "webSearch") {
        // Translate search results
        nextParameters = {
          text: result.results[0]?.title || "No results found",
          targetLanguage: "es",
        };
      } else if (nextTool === "enrich") {
        // Enrich previous results
        nextParameters = {
          data: context.toolResults,
        };
      } else {
        // Default: pass query or previous result
        nextParameters = { query: result.query || "default" };
      }

      console.log(`➡️ Proceeding to next tool: ${nextTool}`);

      return new CallToolEvent({
        toolName: nextTool,
        parameters: nextParameters,
      });
    } else {
      // All tools completed
      console.log("🎉 All tools completed successfully!");

      const executionSummary = {
        completedTools: Object.keys(context.toolResults!),
        totalResults: Object.keys(context.toolResults!).length,
        errors: context.toolErrors,
        retryAttempts: context.retryAttempts,
        executionPlan: context.executionPlan,
      };

      return new StopEvent({
        results: context.toolResults!,
        executionSummary,
      });
    }
  }

  /**
   * Handle tool errors with retry logic
   */
  @step()
  async handleToolError(
    context: ToolWorkflowContext,
    event: ToolErrorEvent
  ): Promise<
    CallToolEvent | StopEvent<{ error: string; partialResults: any }>
  > {
    const { toolName, error, retryCount } = event.data;

    // Store error
    if (!context.toolErrors![toolName]) {
      context.toolErrors![toolName] = [];
    }
    context.toolErrors![toolName].push(error);

    if (retryCount < this.MAX_RETRIES) {
      console.log(
        `🔄 Retrying ${toolName} (attempt ${retryCount + 1}/${
          this.MAX_RETRIES
        })`
      );

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry with same parameters (in real implementation, you might modify parameters)
      return new CallToolEvent({
        toolName,
        parameters: { query: "retry" }, // Simplified for example
      });
    } else {
      console.log(
        `💥 Tool ${toolName} failed after ${this.MAX_RETRIES} attempts`
      );

      return new StopEvent({
        error: `Tool ${toolName} failed: ${error}`,
        partialResults: context.toolResults || {},
      });
    }
  }
}

/**
 * Parallel Tool Execution Workflow
 *
 * Demonstrates concurrent tool execution for better performance
 */
export class ParallelToolWorkflow extends Workflow<ToolWorkflowContext> {
  @step()
  async executeParallelTools(
    context: ToolWorkflowContext,
    event: StartEvent<{ query: string; parallelTools: string[] }>
  ): Promise<StopEvent<{ results: any; performance: any }>> {
    console.log("⚡ Executing tools in parallel...");

    const { query, parallelTools } = event.data;
    const startTime = Date.now();

    // Execute all tools concurrently
    const toolPromises = parallelTools.map(async (toolName) => {
      try {
        let result: any;

        switch (toolName) {
          case "webSearch":
            result = await MockTools.webSearch(query);
            break;
          case "sentiment":
            result = await MockTools.analyzeSentiment(query);
            break;
          case "translate":
            result = await MockTools.translate(query, "es");
            break;
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        return { toolName, result, success: true };
      } catch (error) {
        return {
          toolName,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        };
      }
    });

    // Wait for all tools to complete
    const toolResults = await Promise.all(toolPromises);

    const executionTime = Date.now() - startTime;

    // Separate successful results from errors
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    toolResults.forEach(({ toolName, result, error, success }) => {
      if (success) {
        results[toolName] = result;
      } else {
        errors[toolName] = error;
      }
    });

    console.log(`🎯 Parallel execution completed in ${executionTime}ms`);
    console.log(`✅ Successful tools: ${Object.keys(results).length}`);
    console.log(`❌ Failed tools: ${Object.keys(errors).length}`);

    return new StopEvent({
      results,
      performance: {
        executionTime,
        successfulTools: Object.keys(results).length,
        failedTools: Object.keys(errors).length,
        errors,
      },
    });
  }
}

/**
 * Usage examples for tool integration workflows
 */
export async function runToolIntegrationExamples() {
  console.log("🔧 Starting Tool Integration Workflow Examples...\n");

  // Example 1: Sequential tool execution
  console.log("📝 Example 1: Sequential Tool Execution");
  const sequentialWorkflow = new ToolIntegrationWorkflow();

  const sequentialResult = await sequentialWorkflow.run({
    query: "artificial intelligence trends 2024",
    operations: ["webSearch", "sentiment", "translate"],
  });

  console.log("Sequential Result:", sequentialResult.data);
  console.log();

  // Example 2: Parallel tool execution
  console.log("⚡ Example 2: Parallel Tool Execution");
  const parallelWorkflow = new ParallelToolWorkflow();

  const parallelResult = await parallelWorkflow.run({
    query: "machine learning applications",
    parallelTools: ["webSearch", "sentiment", "translate"],
  });

  console.log("Parallel Result:", parallelResult.data);
  console.log();

  // Example 3: Error handling demonstration
  console.log("❌ Example 3: Error Handling");
  const errorWorkflow = new ToolIntegrationWorkflow();

  // This will likely trigger some errors due to random failures in mock tools
  const errorResult = await errorWorkflow.run({
    query: "test error handling",
    operations: ["webSearch", "sentiment", "enrich"],
  });

  console.log("Error Handling Result:", errorResult.data);
}

export { ToolIntegrationWorkflow, ParallelToolWorkflow, MockTools };
