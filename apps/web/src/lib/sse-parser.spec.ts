import { describe, it, expect } from 'vitest';
import { createSseLineParser } from './sse-parser';

describe('SSE Line-Buffered Parser', () => {
  it('reconstructs JSON events split across arbitrary TCP chunk boundaries', () => {
    const parser = createSseLineParser();

    const chunk1 = 'data: {"type":"token","cont';
    const chunk2 = 'ent":"Hello "}\n\ndata: {"type":"token","content":"world"}\n\ndata: {"type":"do';
    const chunk3 = 'ne","queryLogId":"log-123"}\n\n';

    const events1 = parser.push(chunk1);
    const events2 = parser.push(chunk2);
    const events3 = parser.push(chunk3);
    const flushed = parser.flush();

    const allEvents = [...events1, ...events2, ...events3, ...flushed];
    expect(allEvents).toHaveLength(3);
    expect(allEvents[0]).toEqual({ type: 'token', content: 'Hello ' });
    expect(allEvents[1]).toEqual({ type: 'token', content: 'world' });
    expect(allEvents[2]).toEqual({ type: 'done', queryLogId: 'log-123' });
  });

  it('flushes a trailing data event that lacks a terminating newline', () => {
    const parser = createSseLineParser();
    expect(parser.push('data: {"type":"error","message":"Quota exceeded"}')).toEqual([]);
    expect(parser.flush()).toEqual([{ type: 'error', message: 'Quota exceeded' }]);
  });

  it('safely ignores malformed JSON lines and [DONE] markers', () => {
    const parser = createSseLineParser();
    const events = parser.push(
      'data: {broken json}\n\ndata: [DONE]\n\ndata: {"type":"token","content":"ok"}\n\n',
    );
    expect(events).toEqual([{ type: 'token', content: 'ok' }]);
  });
});
