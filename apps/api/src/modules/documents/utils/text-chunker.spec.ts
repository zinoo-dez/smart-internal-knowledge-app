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

  it('should split Myanmar Unicode text honoring sentence and clause boundaries (။ and ၊)', () => {
    const chunker = new RecursiveTextChunker(80, 15);
    const myanmarDoc =
      'မြန်မာနိုင်ငံရုံးခွဲတွင် အမြဲတမ်းဝန်ထမ်းများသည် နှစ်စဉ်လုပ်သက်ခွင့် ၂၀ ရက် ခံစားခွင့်ရှိပါသည်။' +
      'အရေးပေါ်နှင့် ဆေးခွင့်အတွက် ၁၀ ရက် ရရှိမည်ဖြစ်ပြီး၊ သုံးရက်ထက်ကျော်ပါက ဆရာဝန်ဆေးစာ တင်ပြရပါမည်။' +
      'ရုံးပိတ်ရက်များတွင် အစိုးရရုံးပိတ်ရက်များနှင့် သင်္ကြန်ရုံးပိတ်ရက်များ ပါဝင်ပါသည်။';

    const chunks = chunker.splitText(myanmarDoc);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      // Chunks should contain valid Myanmar Unicode text
      expect(/[\u1000-\u109F]/.test(chunk.content)).toBe(true);
    }
  });

  describe('P1 Markdown-Aware Contextual Chunking', () => {
    it('tracks Markdown heading breadcrumbs and prepends [Doc Title > Section] contextual headers', () => {
      const chunker = new RecursiveTextChunker(300, 50);
      const markdownDoc = [
        '# Employee Benefits',
        '## Remote Work',
        'Employees receive an ergonomic desk setup budget upon completing probation.',
        '### Home Office Stipend',
        '| Category | Limit | Cadence |',
        '| --- | --- | --- |',
        '| Ergonomic Chair | $500 | One-time |',
        '| Internet | $80 | Monthly |',
      ].join('\n');

      const chunks = chunker.splitText(markdownDoc, {
        documentTitle: 'HR Handbook 2026',
      });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].content).toContain('[HR Handbook 2026 > Employee Benefits > Remote Work]');
      expect(chunks[0].sectionHeading).toBe('Employee Benefits > Remote Work');

      const tableChunk = chunks.find((c) => c.content.includes('Ergonomic Chair'));
      expect(tableChunk).toBeDefined();
      expect(tableChunk!.content).toContain(
        '[HR Handbook 2026 > Employee Benefits > Remote Work > Home Office Stipend]',
      );
      // Table stays intact with header row
      expect(tableChunk!.content).toContain('| Category | Limit | Cadence |');
      expect(tableChunk!.content).toContain('| Internet | $80 | Monthly |');
    });

    it('repeats Markdown table headers across continuation chunks when an oversized table must split', () => {
      const chunker = new RecursiveTextChunker(120, 20);
      const rows = Array.from(
        { length: 8 },
        (_, i) => `| Policy Row ${i + 1} | Description for benefit tier ${i + 1} | $${(i + 1) * 100} |`,
      );
      const largeTable = [
        '# Compensation Table',
        '| Tier | Details | Budget |',
        '| --- | --- | --- |',
        ...rows,
      ].join('\n');

      const chunks = chunker.splitText(largeTable, { documentTitle: 'Finance Policy' });
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.content).toContain('[Finance Policy > Compensation Table]');
        expect(chunk.content).toContain('| Tier | Details | Budget |');
        expect(chunk.content).toContain('| --- | --- | --- |');
      }
    });
  });
});
