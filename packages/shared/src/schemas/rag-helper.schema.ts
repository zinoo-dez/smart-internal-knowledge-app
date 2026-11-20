import { z } from 'zod';

export const QueryDecompositionSchema = z.object({
  queries: z
    .array(z.string().trim().min(2).max(300))
    .min(1)
    .max(2)
    .describe(
      '1 to 2 concise standalone search queries covering distinct topics in the user inquiry',
    ),
});

export const QueryCondensationSchema = z.object({
  standaloneQuery: z
    .string()
    .trim()
    .min(2)
    .max(400)
    .describe('Self-contained search query resolving pronouns/references from conversation history'),
});

export type QueryDecompositionResult = z.infer<typeof QueryDecompositionSchema>;
export type QueryCondensationResult = z.infer<typeof QueryCondensationSchema>;
