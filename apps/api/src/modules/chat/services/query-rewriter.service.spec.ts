import { describe, expect, it } from 'vitest';
import { QueryRewriterService } from './query-rewriter.service';

describe('QueryRewriterService', () => {
  const service = new QueryRewriterService();

  it('splits compound English and Myanmar inquiries offline without LLM', async () => {
    const parts = await service.decomposeQuery(
      'What is our VPN setup and what is our annual leave policy?',
      null,
      2,
    );
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('VPN');
    expect(parts[1]).toContain('annual leave');
  });

  it('condenses Myanmar anaphoric follow-ups using prior user turn offline', async () => {
    const condensed = await service.condenseFollowUpQuery(
      [{ role: 'user', content: 'WireGuard VPN configuration' }],
      'အဲဒါကို macOS မှာ ဘယ်လို setup လုပ်ရမလဲ?',
      null,
    );
    expect(condensed).toContain('WireGuard VPN configuration');
    expect(condensed).toContain('macOS');
  });
});
