import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import * as crypto from 'crypto';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private geminiEmbedder: GoogleGenerativeAIEmbeddings | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.startsWith('AIzaSy...')) {
      this.geminiEmbedder = new GoogleGenerativeAIEmbeddings({
        model: 'text-embedding-004',
        apiKey,
      });
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (this.geminiEmbedder) {
      try {
        return await this.geminiEmbedder.embedQuery(text);
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Gemini embedding API call failed: ${error.message}. Using synthetic fallback embedding.`);
      }
    }

    // Deterministic 768-dimensional fallback embedding for test/dev
    return this.generateDeterministicVector(text, 768);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (this.geminiEmbedder) {
      try {
        return await this.geminiEmbedder.embedDocuments(texts);
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.warn(`Gemini batch embedding API call failed: ${error.message}. Using synthetic fallback embeddings.`);
      }
    }

    return texts.map((text) => this.generateDeterministicVector(text, 768));
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
