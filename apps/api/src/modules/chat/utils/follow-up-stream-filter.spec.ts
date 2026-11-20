import { describe, it, expect } from 'vitest';
import { FollowUpStreamFilter } from './follow-up-stream-filter';

describe('FollowUpStreamFilter', () => {
  it('strips <follow_up_suggestions> cleanly even when tags are fragmented across stream tokens', () => {
    const filter = new FollowUpStreamFilter();
    const chunks = [
      'Employees receive **20 days** of paid annual leave [1].\n\n',
      '<follow_up_',
      'suggestions>\n',
      '- How do I carry over unused leave?\n',
      '- Who approves parental leave requests?\n',
      '</follow_',
      'up_suggestions>',
    ];

    let visible = '';
    for (const c of chunks) {
      visible += filter.push(c);
    }
    const { visibleRemainder, followUpQuestions } = filter.flush();
    visible += visibleRemainder;

    expect(visible.trim()).toBe('Employees receive **20 days** of paid annual leave [1].');
    expect(visible).not.toContain('<follow_up_suggestions>');
    expect(visible).not.toContain('</follow_up_suggestions>');
    expect(followUpQuestions).toEqual([
      'How do I carry over unused leave?',
      'Who approves parental leave requests?',
    ]);
  });

  it('preserves ordinary angle brackets in code blocks and comparisons without corruption', () => {
    const filter = new FollowUpStreamFilter();
    const chunks = ['Use `Array<string>` when `x < 5` and render ', '<div>ok</div>.'];

    let visible = '';
    for (const c of chunks) {
      visible += filter.push(c);
    }
    const { visibleRemainder, followUpQuestions } = filter.flush();
    visible += visibleRemainder;

    expect(visible).toBe('Use `Array<string>` when `x < 5` and render <div>ok</div>.');
    expect(followUpQuestions).toEqual([]);
  });

  it('extracts questions gracefully even if the LLM omits the closing </follow_up_suggestions> tag', () => {
    const filter = new FollowUpStreamFilter();
    let visible = filter.push(
      'Connect via WireGuard [1].\n<follow_up_suggestions>\n- Where do I download the config?\n- What port does VPN use?',
    );
    const { visibleRemainder, followUpQuestions } = filter.flush();
    visible += visibleRemainder;

    expect(visible.trim()).toBe('Connect via WireGuard [1].');
    expect(visible).not.toContain('<follow_up_suggestions>');
    expect(followUpQuestions).toEqual([
      'Where do I download the config?',
      'What port does VPN use?',
    ]);
  });

  it('stripAndExtract removes XML block in non-streaming responses and caps at 3 questions', () => {
    const raw = `Here is the answer [1].\n\n<follow_up_suggestions>\n1. First follow-up question?\n2. Second follow-up question?\n3. Third follow-up question?\n4. Fourth extra question?\n</follow_up_suggestions>`;
    const result = FollowUpStreamFilter.stripAndExtract(raw);

    expect(result.cleanText).toBe('Here is the answer [1].');
    expect(result.followUpQuestions).toEqual([
      'First follow-up question?',
      'Second follow-up question?',
      'Third follow-up question?',
    ]);
  });
});
