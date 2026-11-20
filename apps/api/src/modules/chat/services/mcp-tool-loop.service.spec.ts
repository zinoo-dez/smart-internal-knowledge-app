import { describe, expect, it } from 'vitest';
import { McpToolSummary } from '@knowledge/shared';
import { McpToolLoopService } from './mcp-tool-loop.service';

describe('McpToolLoopService', () => {
  const service = new McpToolLoopService();

  const sampleTool: McpToolSummary = {
    id: 'tool-1',
    serverId: 'mcp-github-enterprise',
    name: 'github_get_issue',
    description: 'Fetch GitHub issue',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string' },
        issueNumber: { type: 'integer' },
        state: { type: 'string', enum: ['OPEN', 'CLOSED'] },
      },
      required: ['repo', 'issueNumber'],
    },
    isEnabled: true,
    requireApproval: false,
    createdAt: new Date().toISOString(),
  };

  it('validates JSON Schema primitive types, required fields, and enum values strictly', () => {
    expect(
      service.validateToolArguments(sampleTool, { repo: 'acme/web', issueNumber: 42, state: 'OPEN' }),
    ).toBe(true);
    expect(service.validateToolArguments(sampleTool, { repo: 'acme/web' })).toBe(false);
    expect(
      service.validateToolArguments(sampleTool, { repo: 'acme/web', issueNumber: '42' }),
    ).toBe(false);
    expect(
      service.validateToolArguments(sampleTool, {
        repo: 'acme/web',
        issueNumber: 42,
        state: 'DELETED',
      }),
    ).toBe(false);
  });

  it('formats live row results dynamically for English and Myanmar responses', () => {
    const en = service.formatDynamicToolResult(
      'postgres_run_query',
      { rows: [{ id: 'u1', name: 'Aung Kyaw' }] },
      false,
    );
    expect(en).toContain('Aung Kyaw');
    expect(en).toContain('Total rows returned: **1**');

    const my = service.formatDynamicToolResult(
      'postgres_run_query',
      { rows: [{ id: 'u1', name: 'Aung Kyaw' }] },
      true,
    );
    expect(my).toContain('Aung Kyaw');
    expect(my).toContain('စုစုပေါင်း record **1**');
  });
});
