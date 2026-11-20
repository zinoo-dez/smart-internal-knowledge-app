import { z } from 'zod';

export const FaithfulnessJudgeSchema = z.object({
  faithfulnessScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Proportion of factual claims strictly supported by the cited source chunks (0.0 to 1.0)'),
  supportedClaims: z.number().int().min(0).default(0),
  unsupportedClaims: z.number().int().min(0).default(0),
  invalidCitationIndices: z.array(z.number().int().positive()).default([]),
  verdict: z.enum(['FAITHFUL', 'PARTIALLY_FAITHFUL', 'UNFAITHFUL', 'SAFE_REFUSAL']),
  rationale: z
    .string()
    .trim()
    .max(400)
    .describe('Brief audit justification for the grounding score'),
});

export type FaithfulnessJudgeResult = z.infer<typeof FaithfulnessJudgeSchema>;
