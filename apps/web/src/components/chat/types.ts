import { DocumentCitation } from '@knowledge/shared';

export interface ModelOption {
  id: string;
  name: string;
  shortLabel: string;
  provider: 'GEMINI' | 'OPENAI' | 'CLAUDE';
  modelName: string;
  purposeTitle: string;
  subtitle: string;
  badge: string;
  isLocked?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    shortLabel: 'Flash',
    provider: 'GEMINI',
    modelName: 'gemini-2.5-flash',
    purposeTitle: 'Quick answers',
    subtitle: 'Gemini 2.5 Flash',
    badge: 'Default (Fast)',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    shortLabel: 'Sonnet 4',
    provider: 'CLAUDE',
    modelName: 'claude-sonnet-4-20250514',
    purposeTitle: 'Everyday help',
    subtitle: 'Claude Sonnet 4',
    badge: 'Deep Reasoning',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o Pro',
    shortLabel: 'Pro',
    provider: 'OPENAI',
    modelName: 'gpt-4o',
    purposeTitle: 'Detailed research',
    subtitle: 'GPT-4o Flagship',
    badge: 'Multimodal Flagship',
  },
  {
    id: 'mcp-code-argon',
    name: 'Code & Analysis',
    shortLabel: 'Argon',
    provider: 'OPENAI',
    modelName: 'gpt-4o',
    purposeTitle: 'Code and analysis',
    subtitle: 'Argon (MCP Enabled)',
    badge: 'Coding Specialist',
  },
  {
    id: 'enterprise-carbon',
    name: 'Most Complex Work',
    shortLabel: 'Carbon',
    provider: 'OPENAI',
    modelName: 'o1-preview',
    purposeTitle: 'Most complex work',
    subtitle: 'Carbon (Enterprise)',
    badge: 'Enterprise Only',
    isLocked: true,
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: DocumentCitation[];
  queryLogId?: string;
  feedbackGiven?: 'UP' | 'DOWN';
  followUpQuestions?: string[];
  activeTool?: {
    serverId?: string;
    name: string;
    serverName?: string;
    arguments?: Record<string, unknown>;
    result?: unknown;
    status: 'running' | 'completed' | 'approval_required';
    latencyMs?: number;
    actionId?: string;
  };
}
