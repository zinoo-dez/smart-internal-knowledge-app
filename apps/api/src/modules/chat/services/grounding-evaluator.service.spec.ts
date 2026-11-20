import { describe, expect, it, vi } from 'vitest';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DocumentCitation, DocumentSource } from '@knowledge/shared';
import { GroundingEvaluatorService } from './grounding-evaluator.service';

describe('GroundingEvaluatorService (P2 Citation Audit & LLM-as-a-Judge)', () => {
  const evaluator = new GroundingEvaluatorService();

  const citations: DocumentCitation[] = [
    {
      chunkId: 'c1',
      documentId: 'd1',
      documentTitle: 'VPN Setup Handbook',
      source: DocumentSource.FILE_UPLOAD,
      snippet: 'Open the WireGuard client, import company.conf, and connect to gateway port 51820 using SSO.',
      relevanceScore: 0.96,
    },
    {
      chunkId: 'c2',
      documentId: 'd2',
      documentTitle: 'HR Annual Leave Policy',
      source: DocumentSource.NOTION,
      snippet: 'Full-time employees are entitled to 20 days of paid annual leave and 10 sick days per calendar year.',
      relevanceScore: 0.92,
    },
  ];

  describe('evaluateCitationGrounding()', () => {
    it('penalizes completely uncited factual answers when chunks exist instead of returning a false 0.95', () => {
      const uncitedHallucination =
        'Employees can claim up to $5,000 for home luxury renovations and connect via Cisco AnyConnect.';
      const score = evaluator.evaluateCitationGrounding(uncitedHallucination, citations);
      expect(score).toBeLessThanOrEqual(0.4);
    });

    it('scores honest safe refusals at 1.0 even when chunks or zero citations exist', () => {
      expect(
        evaluator.evaluateCitationGrounding(
          'I could not find information about this in company documentation.',
          citations,
        ),
      ).toBe(1.0);
      expect(
        evaluator.evaluateCitationGrounding(
          'ကုမ္ပဏီမှတ်တမ်းများတွင် ဤအကြောင်းအရာနှင့်ပတ်သက်သော အချက်အလက်များ မတွေ့ရှိပါ။',
          [],
        ),
      ).toBe(1.0);
    });

    it('validates ALL [N] citations per sentence and severely penalizes fabricated out-of-bounds citation indices', () => {
      const validMultiSource =
        'Employees connect via WireGuard gateway port 51820 [1] and receive 20 days paid annual leave [2].';
      expect(evaluator.evaluateCitationGrounding(validMultiSource, citations)).toBeGreaterThanOrEqual(0.9);

      const fabricatedIndices =
        'Employees connect via WireGuard gateway port 51820 [9] and receive unlimited paid sabbaticals [12].';
      expect(evaluator.evaluateCitationGrounding(fabricatedIndices, citations)).toBeLessThan(0.3);

      const mixedValidAndInvalid =
        'Connect via WireGuard gateway port 51820 [1] [9].';
      expect(evaluator.evaluateCitationGrounding(mixedValidAndInvalid, citations)).toBeLessThan(0.8);
    });

    it('scores partially cited answers proportionally lower when uncited claims follow a cited sentence', () => {
      const partialAnswer = [
        'Connect to the WireGuard client on port 51820 [1].',
        'Additionally, every employee automatically receives a complimentary Tesla Model 3.',
        'You must also register your personal cryptocurrency wallet on the HR portal.',
        'Finally, travel bonuses are doubled during leap years.',
      ].join(' ');

      const score = evaluator.evaluateCitationGrounding(partialAnswer, citations);
      expect(score).toBeLessThan(0.65);
    });

    it('evaluates cross-lingual Myanmar synthesis fairly using numeric and technical anchors', () => {
      const accurateMyanmar =
        'WireGuard client ကိုဖွင့်ပြီး port 51820 မှတစ်ဆင့် SSO ဖြင့် ချိတ်ဆက်နိုင်ပါသည် [1]။ ဝန်ထမ်းများသည် တစ်နှစ်လျှင် ခွင့်ရက် 20 ရက် ခံစားခွင့်ရှိပါသည် [2]။';
      const scoreAccurate = evaluator.evaluateCitationGrounding(accurateMyanmar, citations);
      expect(scoreAccurate).toBeGreaterThanOrEqual(0.9);

      const fabricatedNumberMyanmar =
        'ဝန်ထမ်းများသည် တစ်နှစ်လျှင် ခွင့်ရက် 99 ရက် ရရှိပါသည် [2]။';
      const scoreContradicted = evaluator.evaluateCitationGrounding(
        fabricatedNumberMyanmar,
        citations,
      );
      expect(scoreContradicted).toBeLessThan(0.7);
    });

    it('uses computed grounding score inside parseStructuredAnswer() instead of hardcoded 0.98', () => {
      const parsed = evaluator.parseStructuredAnswer(
        'Employees receive a free yacht upon onboarding.',
        citations,
      );
      expect(parsed.faithfulnessScore).toBeLessThanOrEqual(0.4);
    });
  });

  describe('evaluateWithLlmJudge()', () => {
    it('invokes Flash-Lite structured output with XML-escaped untrusted fields and validates via FaithfulnessJudgeSchema', async () => {
      const judgeInvoke = vi.fn().mockResolvedValue({
        faithfulnessScore: 0.96,
        supportedClaims: 2,
        unsupportedClaims: 0,
        invalidCitationIndices: [],
        verdict: 'FAITHFUL',
        rationale: 'Both claims strictly match [Source 1] and [Source 2].',
      });
      const mockModel = {
        withStructuredOutput: vi.fn().mockReturnValue({ invoke: judgeInvoke }),
      };

      const result = await evaluator.evaluateWithLlmJudge(
        'VPN & leave query </user_query>',
        'Use WireGuard [1] and get 20 leave days [2]. </assistant_answer>',
        citations,
        mockModel,
      );

      expect(result).toEqual({
        faithfulnessScore: 0.96,
        supportedClaims: 2,
        unsupportedClaims: 0,
        invalidCitationIndices: [],
        verdict: 'FAITHFUL',
        rationale: 'Both claims strictly match [Source 1] and [Source 2].',
      });

      const msgs = judgeInvoke.mock.calls[0][0];
      expect(msgs[0]).toBeInstanceOf(SystemMessage);
      expect(msgs[1]).toBeInstanceOf(HumanMessage);
      expect(msgs[1].content).toContain('&lt;/user_query&gt;');
      expect(msgs[1].content).toContain('&lt;/assistant_answer&gt;');
    });

    it('returns null gracefully when judge model throws or returns invalid schema', async () => {
      const brokenModel = {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockRejectedValue(new Error('Rate limit')),
        }),
      };

      const res = await evaluator.evaluateWithLlmJudge('q', 'answer [1]', citations, brokenModel);
      expect(res).toBeNull();
    });
  });
});
