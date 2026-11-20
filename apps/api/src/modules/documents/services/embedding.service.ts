import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import * as crypto from 'crypto';

export interface EmbedDocumentsOptions {
  allowFallback?: boolean;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private geminiEmbedder: GoogleGenerativeAIEmbeddings | null = null;
  private readonly EXPECTED_DIMENSIONS = 768;
  private readonly EMBED_TIMEOUT_MS = Number(process.env.EMBEDDING_TIMEOUT_MS) || 15000;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    if (apiKey && !apiKey.startsWith('AIzaSy...')) {
      this.geminiEmbedder = new GoogleGenerativeAIEmbeddings({
        model: modelName,
        apiKey,
        outputDimensionality: this.EXPECTED_DIMENSIONS,
      } as any);
    }
  }

  /**
   * Strict fail-closed mode in production prevents corrupting pgvector with SHA-256 fallback vectors.
   * Set ALLOW_SYNTHETIC_EMBEDDINGS=true ONLY for keyless demo environments.
   */
  public isStrictProductionMode(): boolean {
    return (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_SYNTHETIC_EMBEDDINGS !== 'true'
    );
  }

  private async withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${this.EMBED_TIMEOUT_MS}ms`)),
          this.EMBED_TIMEOUT_MS,
        );
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (this.geminiEmbedder) {
      try {
        const result = await this.withTimeout(
          this.geminiEmbedder.embedQuery(text),
          'Gemini query embedding',
        );
        if (Array.isArray(result) && result.length === this.EXPECTED_DIMENSIONS) {
          return result;
        }
        throw new Error(
          `Gemini query embedding returned unexpected dimensionality (${Array.isArray(result) ? result.length : 'non-array'})`,
        );
      } catch (err: unknown) {
        const error = err as Error;
        if (this.isStrictProductionMode()) {
          this.logger.error(`Gemini query embedding failed in production: ${error.message}`);
          throw error;
        }
        this.logger.warn(
          `Gemini embedding API call failed: ${error.message}. Using synthetic fallback embedding.`,
        );
      }
    } else if (this.isStrictProductionMode()) {
      throw new Error(
        'Embedding provider is not configured in production (GEMINI_API_KEY missing).',
      );
    }

    // Deterministic 768-dimensional fallback embedding for test/dev/demo
    return this.generateDeterministicVector(text, this.EXPECTED_DIMENSIONS);
  }

  async embedDocuments(
    texts: string[],
    options?: EmbedDocumentsOptions,
  ): Promise<number[][]> {
    const strictFailClosed = this.isStrictProductionMode() && options?.allowFallback !== true;

    if (this.geminiEmbedder) {
      try {
        const results = await this.withTimeout(
          this.geminiEmbedder.embedDocuments(texts),
          'Gemini batch document embedding',
        );
        if (
          Array.isArray(results) &&
          results.length === texts.length &&
          results.every((v) => Array.isArray(v) && v.length === this.EXPECTED_DIMENSIONS)
        ) {
          return results;
        }
        const invalidMsg =
          'Gemini batch embedding returned empty or invalid vector dimensions.';
        if (strictFailClosed) {
          throw new Error(invalidMsg);
        }
        this.logger.warn(`${invalidMsg} Using synthetic fallback embeddings.`);
      } catch (err: unknown) {
        const error = err as Error;
        if (strictFailClosed) {
          this.logger.error(
            `Gemini batch embedding failed in production (refusing to persist synthetic vectors so BullMQ can retry): ${error.message}`,
          );
          throw error;
        }
        this.logger.warn(
          `Gemini batch embedding API call failed: ${error.message}. Using synthetic fallback embeddings.`,
        );
      }
    } else if (strictFailClosed) {
      throw new Error(
        'Embedding provider is not configured in production (GEMINI_API_KEY missing). Refusing to persist synthetic vectors.',
      );
    }

    return texts.map((text) => this.generateDeterministicVector(text, this.EXPECTED_DIMENSIONS));
  }

  generateDeterministicVector(text: string, dimensions: number = 768): number[] {
    const vector = new Array(dimensions).fill(0);
    const hash = crypto.createHash('sha256').update(text).digest();
    for (let i = 0; i < dimensions; i++) {
      const byte = hash[i % hash.length];
      vector[i] = ((byte - 128) / 128.0) * Math.sin(i + 1);
    }
    // Normalize to unit length
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vector.map((val) => val / norm) : vector;
  }
}
