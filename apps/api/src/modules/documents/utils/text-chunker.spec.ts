import { describe, it, expect } from 'vitest';
import { RecursiveTextChunker } from './text-chunker';

describe('RecursiveTextChunker', () => {
  it('should return empty array for empty or whitespace-only text', () => {
    const chunker = new RecursiveTextChunker(500, 100);
    expect(chunker.splitText('')).toEqual([]);
    expect(chunker.splitText('   \n\t  ')).toEqual([]);
  });

  it('should return a single chunk if text is smaller than chunkSize', () => {
    const chunker = new RecursiveTextChunker(500, 100);
    const text = 'Company internal vacation policy details.';
    const chunks = chunker.splitText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toBe(text);
  });

  it('should split long text into multiple sequential chunks with proper indices', () => {
    const chunker = new RecursiveTextChunker(100, 20);
    const paragraph = 'Section 1: Security protocols for AWS and database access.\n\nSection 2: Remote work guidelines and VPN setup steps.\n\nSection 3: Incident escalation procedure and on-call rotation schedules.';

    const chunks = chunker.splitText(paragraph);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[chunks.length - 1].chunkIndex).toBe(chunks.length - 1);

    // Verify all chunks have non-empty content
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
    }
  });
});
