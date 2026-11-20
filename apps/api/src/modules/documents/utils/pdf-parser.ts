import { Logger } from '@nestjs/common';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const logger = new Logger('PdfParser');
  try {
    // Dynamic import to handle CJS/ESM compatibility
    const mod = (await import('pdf-parse')) as any;
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn(`PDF parsing fallback: ${error.message}`);
    return buffer.toString('utf-8');
  }
}
