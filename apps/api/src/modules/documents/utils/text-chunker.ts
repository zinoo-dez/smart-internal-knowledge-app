export interface TextChunk {
  chunkIndex: number;
  content: string;
}

export class RecursiveTextChunker {
  constructor(
    private readonly chunkSize: number = 800,
    private readonly chunkOverlap: number = 150,
  ) {}

  splitText(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (cleaned.length <= this.chunkSize) {
      return [{ chunkIndex: 0, content: cleaned }];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + this.chunkSize;
      if (end >= cleaned.length) {
        chunks.push(cleaned.slice(start));
        break;
      }

      // Try finding nearest newline, Myanmar sentence/clause boundary (။ or ၊), or space before the cut
      const lookbackWindow = cleaned.slice(Math.max(start, end - 100), end);
      const lastNewline = lookbackWindow.lastIndexOf('\n');
      const lastMyanmarSection = lookbackWindow.lastIndexOf('။');
      const lastMyanmarClause = lookbackWindow.lastIndexOf('၊');
      const lastSpace = lookbackWindow.lastIndexOf(' ');

      if (lastNewline !== -1) {
        end = Math.max(start, end - 100) + lastNewline + 1;
      } else if (lastMyanmarSection !== -1) {
        end = Math.max(start, end - 100) + lastMyanmarSection + 1;
      } else if (lastMyanmarClause !== -1) {
        end = Math.max(start, end - 100) + lastMyanmarClause + 1;
      } else if (lastSpace !== -1) {
        end = Math.max(start, end - 100) + lastSpace + 1;
      }

      const chunkContent = cleaned.slice(start, end).trim();
      if (chunkContent.length > 0) {
        chunks.push(chunkContent);
      }

      start = Math.max(start + 1, end - this.chunkOverlap);
    }

    return chunks.map((content, chunkIndex) => ({
      chunkIndex,
      content,
    }));
  }
}
