/**
 * Functional Agent Workflow Example - LlamaIndex TypeScript
 *
 * This example demonstrates the actual functional programming approach used in
 * LlamaIndex TypeScript, emphasizing pure functions, immutable data flow,
 * and functional composition patterns.
 */

// Type definitions for our workflow data
interface DocumentInput {
  readonly content: string;
  readonly metadata?: Record<string, any>;
}

interface ExtractedText {
  readonly text: string;
  readonly wordCount: number;
  readonly characterCount: number;
}

interface TextChunks {
  readonly chunks: readonly string[];
  readonly chunkSize: number;
  readonly totalChunks: number;
}

interface DocumentEmbeddings {
  readonly embeddings: readonly number[][];
  readonly chunks: readonly string[];
  readonly dimensions: number;
}

interface ProcessedDocument {
  readonly originalContent: string;
  readonly processedContent: string;
  readonly analysis: DocumentAnalysis;
  readonly metadata: DocumentMetadata;
}

interface DocumentAnalysis {
  readonly wordCount: number;
  readonly estimatedReadingTime: number;
  readonly summary: string;
  readonly complexity: "simple" | "moderate" | "complex";
  readonly topics: readonly string[];
}

interface DocumentMetadata {
  readonly documentId: string;
  readonly timestamp: string;
  readonly processingTime: number;
  readonly steps: readonly string[];
}

/**
 * Step 1: Extract and clean text content
 * Pure function that transforms raw input into clean text
 */
async function extractText(input: DocumentInput): Promise<ExtractedText> {
  console.log("📄 Extracting text content...");

  // Simulate text extraction and cleaning
  const cleanText = input.content
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,!?-]/g, "");

  const wordCount = cleanText.split(/\s+/).length;
  const characterCount = cleanText.length;

  return {
    text: cleanText,
    wordCount,
    characterCount,
  };
}

/**
 * Step 2: Chunk text into manageable pieces
 * Pure function that splits text into chunks
 */
async function chunkText(
  extracted: ExtractedText,
  chunkSize: number = 100
): Promise<TextChunks> {
  console.log("✂️ Chunking text content...");

  const { text } = extracted;
  const chunks: string[] = [];

  // Split by sentences first, then by chunk size
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (
      (currentChunk + sentence).length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return {
    chunks,
    chunkSize,
    totalChunks: chunks.length,
  };
}

/**
 * Step 3: Generate embeddings for chunks (simulated)
 * Pure function that creates vector representations
 */
async function generateEmbeddings(
  textChunks: TextChunks
): Promise<DocumentEmbeddings> {
  console.log("🔢 Generating embeddings...");

  const { chunks } = textChunks;
  const dimensions = 384; // Typical embedding dimension

  // Simulate embedding generation
  const embeddings = chunks.map((chunk) => {
    // Create deterministic "embeddings" based on chunk content
    const embedding = new Array(dimensions).fill(0).map((_, i) => {
      return Math.sin(chunk.charCodeAt(i % chunk.length) * (i + 1)) * 0.1;
    });
    return embedding;
  });

  return {
    embeddings,
    chunks,
    dimensions,
  };
}

/**
 * Step 4: Analyze document content
 * Pure function that performs content analysis
 */
async function analyzeContent(
  embeddings: DocumentEmbeddings
): Promise<DocumentAnalysis> {
  console.log("🔍 Analyzing content...");

  const { chunks } = embeddings;
  const totalWords = chunks.reduce(
    (sum, chunk) => sum + chunk.split(/\s+/).length,
    0
  );

  // Simulate analysis
  const complexity =
    totalWords < 100 ? "simple" : totalWords < 500 ? "moderate" : "complex";

  const topics = ["technology", "analysis", "processing"]; // Simulated topic extraction

  const summary =
    chunks[0]?.substring(0, 100) + "..." || "No content available";

  return {
    wordCount: totalWords,
    estimatedReadingTime: Math.ceil(totalWords / 200), // 200 words per minute
    summary,
    complexity,
    topics,
  };
}

/**
 * Utility function for function composition
 */
function compose<T, U, V, W, X>(
  f4: (x: W) => Promise<X>,
  f3: (x: V) => Promise<W>,
  f2: (x: U) => Promise<V>,
  f1: (x: T) => Promise<U>
) {
  return async (input: T): Promise<X> => {
    const step1 = await f1(input);
    const step2 = await f2(step1);
    const step3 = await f3(step2);
    const step4 = await f4(step3);
    return step4;
  };
}

/**
 * Main workflow function - Functional composition approach
 */
export async function documentProcessingWorkflow(
  input: DocumentInput
): Promise<ProcessedDocument> {
  console.log("🚀 Starting functional document processing workflow...\n");

  const startTime = Date.now();
  const documentId = `doc_${Date.now()}`;
  const steps: string[] = [];

  try {
    // Step 1: Extract text
    steps.push("extract");
    const extracted = await extractText(input);

    // Step 2: Chunk text
    steps.push("chunk");
    const chunks = await chunkText(extracted);

    // Step 3: Generate embeddings
    steps.push("embed");
    const embeddings = await generateEmbeddings(chunks);

    // Step 4: Analyze content
    steps.push("analyze");
    const analysis = await analyzeContent(embeddings);

    const processingTime = Date.now() - startTime;

    const result: ProcessedDocument = {
      originalContent: input.content,
      processedContent: extracted.text,
      analysis,
      metadata: {
        documentId,
        timestamp: new Date().toISOString(),
        processingTime,
        steps,
      },
    };

    console.log("\n✅ Workflow completed successfully!");
    return result;
  } catch (error) {
    console.error("❌ Workflow failed:", error);
    throw new Error(`Document processing failed: ${error}`);
  }
}

/**
 * Alternative approach using function composition
 */
export async function composedDocumentWorkflow(
  input: DocumentInput
): Promise<ProcessedDocument> {
  console.log("🔄 Starting composed workflow...\n");

  const startTime = Date.now();

  // Create a composed pipeline
  const pipeline = compose(
    analyzeContent,
    generateEmbeddings,
    (extracted: ExtractedText) => chunkText(extracted),
    extractText
  );

  try {
    const analysis = await pipeline(input);

    return {
      originalContent: input.content,
      processedContent: input.content, // Simplified for composition example
      analysis,
      metadata: {
        documentId: `composed_${Date.now()}`,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        steps: ["composed-pipeline"],
      },
    };
  } catch (error) {
    throw new Error(`Composed workflow failed: ${error}`);
  }
}

/**
 * Parallel processing approach for multiple documents
 */
export async function parallelDocumentProcessing(
  inputs: readonly DocumentInput[]
): Promise<readonly ProcessedDocument[]> {
  console.log(`⚡ Processing ${inputs.length} documents in parallel...\n`);

  // Process all documents concurrently
  const promises = inputs.map((input) => documentProcessingWorkflow(input));

  try {
    const results = await Promise.all(promises);
    console.log(`🎉 Successfully processed ${results.length} documents!`);
    return results;
  } catch (error) {
    console.error("❌ Parallel processing failed:", error);
    throw error;
  }
}

/**
 * Streaming workflow for large documents
 */
export async function* streamingDocumentWorkflow(
  input: DocumentInput
): AsyncGenerator<
  { step: string; progress: number; data?: any },
  ProcessedDocument
> {
  console.log("🌊 Starting streaming workflow...\n");

  const totalSteps = 4;
  let currentStep = 0;

  // Step 1: Extract
  yield { step: "extracting", progress: ++currentStep / totalSteps };
  const extracted = await extractText(input);
  yield {
    step: "extracted",
    progress: currentStep / totalSteps,
    data: { wordCount: extracted.wordCount },
  };

  // Step 2: Chunk
  yield { step: "chunking", progress: ++currentStep / totalSteps };
  const chunks = await chunkText(extracted);
  yield {
    step: "chunked",
    progress: currentStep / totalSteps,
    data: { totalChunks: chunks.totalChunks },
  };

  // Step 3: Embed
  yield { step: "embedding", progress: ++currentStep / totalSteps };
  const embeddings = await generateEmbeddings(chunks);
  yield {
    step: "embedded",
    progress: currentStep / totalSteps,
    data: { dimensions: embeddings.dimensions },
  };

  // Step 4: Analyze
  yield { step: "analyzing", progress: ++currentStep / totalSteps };
  const analysis = await analyzeContent(embeddings);

  const result: ProcessedDocument = {
    originalContent: input.content,
    processedContent: extracted.text,
    analysis,
    metadata: {
      documentId: `stream_${Date.now()}`,
      timestamp: new Date().toISOString(),
      processingTime: 0, // Would track in real implementation
      steps: ["extract", "chunk", "embed", "analyze"],
    },
  };

  return result;
}

/**
 * Usage examples
 */
export async function runFunctionalExamples() {
  console.log("🚀 LlamaIndex Functional Workflow Examples\n");
  console.log("=".repeat(50));

  const sampleDocument: DocumentInput = {
    content: `
      LlamaIndex is a powerful framework for building applications with large language models.
      It provides tools for data ingestion, indexing, and querying that make it easy to
      create sophisticated AI applications. The TypeScript implementation follows functional
      programming principles, emphasizing immutable data structures and pure functions.
      
      This approach makes workflows more predictable, testable, and composable. By using
      functional composition, developers can build complex processing pipelines from
      simple, reusable components.
    `,
    metadata: { source: "example", version: "1.0" },
  };

  try {
    // Example 1: Basic functional workflow
    console.log("\n📝 Example 1: Basic Functional Workflow");
    console.log("-".repeat(30));
    const result1 = await documentProcessingWorkflow(sampleDocument);
    console.log("Result:", {
      wordCount: result1.analysis.wordCount,
      complexity: result1.analysis.complexity,
      processingTime: result1.metadata.processingTime,
    });

    // Example 2: Composed workflow
    console.log("\n🔄 Example 2: Function Composition");
    console.log("-".repeat(30));
    const result2 = await composedDocumentWorkflow(sampleDocument);
    console.log("Composed result:", {
      topics: result2.analysis.topics,
      readingTime: result2.analysis.estimatedReadingTime,
    });

    // Example 3: Parallel processing
    console.log("\n⚡ Example 3: Parallel Processing");
    console.log("-".repeat(30));
    const multipleInputs = [sampleDocument, sampleDocument, sampleDocument];
    const parallelResults = await parallelDocumentProcessing(multipleInputs);
    console.log(`Processed ${parallelResults.length} documents in parallel`);

    // Example 4: Streaming workflow
    console.log("\n🌊 Example 4: Streaming Workflow");
    console.log("-".repeat(30));
    const streamingWorkflow = streamingDocumentWorkflow(sampleDocument);

    for await (const update of streamingWorkflow) {
      if ("step" in update && "progress" in update) {
        console.log(`📊 ${update.step}: ${Math.round(update.progress * 100)}%`);
        if (update.data) {
          console.log(`   Data:`, update.data);
        }
      } else {
        console.log("🎉 Streaming complete! Final result:", {
          wordCount: update.analysis.wordCount,
          summary: update.analysis.summary.substring(0, 50) + "...",
        });
      }
    }
  } catch (error) {
    console.error("❌ Example failed:", error);
  }
}

// Export main functions
export { extractText, chunkText, generateEmbeddings, analyzeContent, compose };
