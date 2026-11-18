import { z } from 'zod';

export const AgentCitationSchema = z.object({
  sourceId: z.string(),
  documentTitle: z.string(),
  chunkId: z.string(),
  snippet: z.string(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const AgentAnswerSchema = z.object({
  answer: z.string().describe('The grounded response text in user language with inline citations'),
  citations: z.array(AgentCitationSchema).default([]),
  confidenceScore: z.number().min(0).max(1).default(1),
  requiresHumanEscalation: z.boolean().default(false),
  escalationDepartment: z.enum(['HR', 'IT', 'SECURITY', 'FINANCE', 'GENERAL', 'NONE']).default('NONE'),
});

export type AgentAnswer = z.infer<typeof AgentAnswerSchema>;
export type AgentCitation = z.infer<typeof AgentCitationSchema>;
