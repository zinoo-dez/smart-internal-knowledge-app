import { z } from 'zod';

export const MeetingActionItemSchema = z.object({
  task: z.string().trim().min(2).max(500),
  owner: z.string().trim().min(1).max(120).default('Unassigned'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  deadline: z.string().trim().max(120).optional(),
});

export const MeetingSummarySchema = z.object({
  title: z.string().trim().min(1).max(200),
  executiveSummary: z.string().trim().min(1).max(1000),
  decisions: z.array(z.string().trim().min(1).max(500)).default([]),
  actionItems: z.array(MeetingActionItemSchema).default([]),
  openQuestions: z.array(z.string().trim().min(1).max(500)).default([]),
});

export type MeetingActionItem = z.infer<typeof MeetingActionItemSchema>;
export type MeetingSummaryStructured = z.infer<typeof MeetingSummarySchema>;
