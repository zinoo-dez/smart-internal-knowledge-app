export interface TextChunk {
  chunkIndex: number;
  content: string;
  sectionHeading?: string;
}

export interface ChunkOptions {
  documentTitle?: string;
}

interface StructuralBlock {
  kind: 'table' | 'code' | 'prose';
  content: string;
  headingPath: string;
}

export class RecursiveTextChunker {
  constructor(
    private readonly chunkSize: number = 800,
    private readonly chunkOverlap: number = 150,
  ) {}

  splitText(text: string, options?: ChunkOptions): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const cleaned = text.replace(/\r\n/g, '\n').trim();
    const docTitle = options?.documentTitle?.trim() || '';
    const hasMarkdownStructure =
      /^#{1,6}\s+\S/m.test(cleaned) ||
      /^```/m.test(cleaned) ||
      /^\s*\|.+\|\s*\n\s*\|[\s:|-]+\|\s*$/m.test(cleaned);

    // Fast path for plain non-Markdown documents without a contextual title
    if (!hasMarkdownStructure && !docTitle) {
      return this.splitPlainText(cleaned).map((content, chunkIndex) => ({
        chunkIndex,
        content,
      }));
    }

    // Fast path for small plain documents with a contextual documentTitle
    if (!hasMarkdownStructure && cleaned.length <= this.chunkSize) {
      return [
        {
          chunkIndex: 0,
          content: this.applyContextHeader(cleaned, docTitle, ''),
        },
      ];
    }

    if (!hasMarkdownStructure) {
      return this.splitPlainText(cleaned).map((content, chunkIndex) => ({
        chunkIndex,
        content: this.applyContextHeader(content, docTitle, ''),
      }));
    }

    // Markdown-aware structural chunking: preserves heading breadcrumbs, tables, and code fences
    const blocks = this.parseMarkdownBlocks(cleaned);
    const rawChunks: { content: string; sectionHeading?: string }[] = [];

    let buffer = '';
    let bufferHeading = '';

    const flushBuffer = () => {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        rawChunks.push({
          content: this.applyContextHeader(trimmed, docTitle, bufferHeading),
          sectionHeading: bufferHeading || undefined,
        });
      }
      buffer = '';
    };

    for (const block of blocks) {
      const headingChanged = buffer.length > 0 && block.headingPath !== bufferHeading;
      if (headingChanged) {
        flushBuffer();
      }

      if (block.kind === 'table') {
        const tableBudget = Math.round(this.chunkSize * 1.5);
        if (buffer.length > 0 && buffer.length + 2 + block.content.length <= tableBudget) {
          buffer = `${buffer}\n\n${block.content}`;
          bufferHeading = block.headingPath;
        } else {
          flushBuffer();
          if (block.content.length <= tableBudget) {
            rawChunks.push({
              content: this.applyContextHeader(block.content, docTitle, block.headingPath),
              sectionHeading: block.headingPath || undefined,
            });
          } else {
            // Split oversized Markdown table while repeating header + separator rows on every chunk
            const tablePieces = this.splitMarkdownTable(block.content, tableBudget);
            for (const piece of tablePieces) {
              rawChunks.push({
                content: this.applyContextHeader(piece, docTitle, block.headingPath),
                sectionHeading: block.headingPath || undefined,
              });
            }
          }
        }
        continue;
      }

      if (block.kind === 'code') {
        const codeBudget = Math.round(this.chunkSize * 1.5);
        if (buffer.length > 0 && buffer.length + 2 + block.content.length <= codeBudget) {
          buffer = `${buffer}\n\n${block.content}`;
          bufferHeading = block.headingPath;
        } else {
          flushBuffer();
          if (block.content.length <= codeBudget) {
            rawChunks.push({
              content: this.applyContextHeader(block.content, docTitle, block.headingPath),
              sectionHeading: block.headingPath || undefined,
            });
          } else {
            for (const piece of this.splitPlainText(block.content)) {
              rawChunks.push({
                content: this.applyContextHeader(piece, docTitle, block.headingPath),
                sectionHeading: block.headingPath || undefined,
              });
            }
          }
        }
        continue;
      }

      // Prose paragraph block
      if (block.content.length > this.chunkSize) {
        flushBuffer();
        for (const piece of this.splitPlainText(block.content)) {
          rawChunks.push({
            content: this.applyContextHeader(piece, docTitle, block.headingPath),
            sectionHeading: block.headingPath || undefined,
          });
        }
        continue;
      }

      if (buffer.length === 0) {
        buffer = block.content;
        bufferHeading = block.headingPath;
      } else if (buffer.length + 2 + block.content.length <= this.chunkSize) {
        buffer = `${buffer}\n\n${block.content}`;
      } else {
        flushBuffer();
        buffer = block.content;
        bufferHeading = block.headingPath;
      }
    }

    flushBuffer();

    return rawChunks.map((chunk, chunkIndex) => ({
      chunkIndex,
      content: chunk.content,
      ...(chunk.sectionHeading ? { sectionHeading: chunk.sectionHeading } : {}),
    }));
  }

  private applyContextHeader(body: string, documentTitle: string, headingPath: string): string {
    const parts = [documentTitle, headingPath].filter((p) => p.length > 0);
    if (parts.length === 0) {
      return body;
    }
    return `[${parts.join(' > ')}]\n${body}`;
  }

  private parseMarkdownBlocks(text: string): StructuralBlock[] {
    const lines = text.split('\n');
    const blocks: StructuralBlock[] = [];
    const headingStack: { level: number; text: string }[] = [];

    const currentHeadingPath = () => headingStack.map((h) => h.text).join(' > ');

    let i = 0;
    let proseLines: string[] = [];

    const flushProse = () => {
      const joined = proseLines.join('\n').trim();
      if (joined.length > 0) {
        blocks.push({
          kind: 'prose',
          content: joined,
          headingPath: currentHeadingPath(),
        });
      }
      proseLines = [];
    };

    while (i < lines.length) {
      const line = lines[i];

      // 1. Markdown heading (# .. ######)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushProse();
        const level = headingMatch[1].length;
        const headingText = headingMatch[2].replace(/\s+#+\s*$/, '').trim();
        while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
          headingStack.pop();
        }
        headingStack.push({ level, text: headingText });
        i += 1;
        continue;
      }

      // 2. Fenced code block (```)
      if (/^\s*```/.test(line)) {
        flushProse();
        const fenceLines = [line];
        i += 1;
        while (i < lines.length) {
          fenceLines.push(lines[i]);
          if (/^\s*```\s*$/.test(lines[i])) {
            i += 1;
            break;
          }
          i += 1;
        }
        blocks.push({
          kind: 'code',
          content: fenceLines.join('\n').trim(),
          headingPath: currentHeadingPath(),
        });
        continue;
      }

      // 3. Markdown pipe table (header row + separator row + body rows)
      if (
        /^\s*\|.+\|\s*$/.test(line) &&
        i + 1 < lines.length &&
        /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])
      ) {
        flushProse();
        const tableLines = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
          tableLines.push(lines[i]);
          i += 1;
        }
        blocks.push({
          kind: 'table',
          content: tableLines.join('\n').trim(),
          headingPath: currentHeadingPath(),
        });
        continue;
      }

      // 4. Paragraph break on blank line
      if (line.trim().length === 0) {
        flushProse();
        i += 1;
        continue;
      }

      proseLines.push(line);
      i += 1;
    }

    flushProse();
    return blocks;
  }

  private splitMarkdownTable(tableText: string, maxChars: number): string[] {
    const lines = tableText.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 2) {
      return [tableText];
    }

    const headerPrefix = `${lines[0]}\n${lines[1]}`;
    const bodyRows = lines.slice(2);
    const chunks: string[] = [];
    let current = headerPrefix;

    for (const row of bodyRows) {
      if (current !== headerPrefix && current.length + 1 + row.length > maxChars) {
        chunks.push(current);
        current = `${headerPrefix}\n${row}`;
      } else {
        current = `${current}\n${row}`;
      }
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    return chunks;
  }

  private splitPlainText(cleaned: string): string[] {
    if (cleaned.length <= this.chunkSize) {
      return [cleaned];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + this.chunkSize;
      if (end >= cleaned.length) {
        const tail = cleaned.slice(start).trim();
        if (tail.length > 0) {
          chunks.push(tail);
        }
        break;
      }

      // Try finding nearest newline, Myanmar sentence/clause boundary (။ or ၊), or space before the cut
      const lookbackStart = Math.max(start, end - 100);
      const lookbackWindow = cleaned.slice(lookbackStart, end);
      const lastNewline = lookbackWindow.lastIndexOf('\n');
      const lastMyanmarSection = lookbackWindow.lastIndexOf('။');
      const lastMyanmarClause = lookbackWindow.lastIndexOf('၊');
      const lastSpace = lookbackWindow.lastIndexOf(' ');

      if (lastNewline !== -1) {
        end = lookbackStart + lastNewline + 1;
      } else if (lastMyanmarSection !== -1) {
        end = lookbackStart + lastMyanmarSection + 1;
      } else if (lastMyanmarClause !== -1) {
        end = lookbackStart + lastMyanmarClause + 1;
      } else if (lastSpace !== -1) {
        end = lookbackStart + lastSpace + 1;
      }

      const chunkContent = cleaned.slice(start, end).trim();
      if (chunkContent.length > 0) {
        chunks.push(chunkContent);
      }

      start = Math.max(start + 1, end - this.chunkOverlap);
    }

    return chunks;
  }
}
