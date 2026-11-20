export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Stateful SSE line-buffered parser that safely handles JSON events split across
 * arbitrary TCP / ReadableStream chunk boundaries without dropping tokens or metadata.
 */
export function createSseLineParser() {
  let buffer = '';

  return {
    push(chunkText: string): SseEvent[] {
      buffer += chunkText;
      const lines = buffer.split('\n');
      // Keep the trailing fragment (empty string if chunk ended on '\n') for the next chunk
      buffer = lines.pop() ?? '';

      const events: SseEvent[] = [];
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload) as SseEvent;
          if (parsed && typeof parsed.type === 'string') {
            events.push(parsed);
          }
        } catch {
          // Skip malformed non-JSON lines safely
        }
      }
      return events;
    },

    flush(): SseEvent[] {
      if (!buffer.trim()) {
        buffer = '';
        return [];
      }
      const trailing = buffer;
      buffer = '';
      return this.push(`${trailing}\n`);
    },
  };
}
