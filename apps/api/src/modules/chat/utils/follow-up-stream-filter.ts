/**
 * Stateful streaming filter that strips `<follow_up_suggestions>...</follow_up_suggestions>`
 * blocks across arbitrary token chunk boundaries without leaking raw XML to SSE clients,
 * while extracting the model-generated follow-up questions for structured SSE emission.
 */
export class FollowUpStreamFilter {
  private static readonly OPEN_TAG = '<follow_up_suggestions>';
  private static readonly CLOSE_TAG = '</follow_up_suggestions>';

  private pending = '';
  private inFollowUpBlock = false;
  private followUpBuffer = '';

  /**
   * Process an incoming LLM stream token chunk and return only safe visible answer text.
   */
  public push(chunk: string): string {
    if (!chunk) return '';
    this.pending += chunk;
    let visibleOut = '';

    while (this.pending.length > 0) {
      const lower = this.pending.toLowerCase();

      if (!this.inFollowUpBlock) {
        const openIdx = lower.indexOf(FollowUpStreamFilter.OPEN_TAG);
        if (openIdx !== -1) {
          visibleOut += this.pending.slice(0, openIdx);
          this.pending = this.pending.slice(openIdx + FollowUpStreamFilter.OPEN_TAG.length);
          this.inFollowUpBlock = true;
          continue;
        }

        // Hold back only the shortest trailing suffix that matches a prefix of OPEN_TAG
        const holdStart = this.findPartialPrefixStart(lower, FollowUpStreamFilter.OPEN_TAG);
        if (holdStart !== -1) {
          visibleOut += this.pending.slice(0, holdStart);
          this.pending = this.pending.slice(holdStart);
        } else {
          visibleOut += this.pending;
          this.pending = '';
        }
        break;
      } else {
        const closeIdx = lower.indexOf(FollowUpStreamFilter.CLOSE_TAG);
        if (closeIdx !== -1) {
          this.followUpBuffer += this.pending.slice(0, closeIdx);
          this.pending = this.pending
            .slice(closeIdx + FollowUpStreamFilter.CLOSE_TAG.length)
            .replace(/^\s+/, '');
          this.inFollowUpBlock = false;
          continue;
        }

        const holdStart = this.findPartialPrefixStart(lower, FollowUpStreamFilter.CLOSE_TAG);
        if (holdStart !== -1) {
          this.followUpBuffer += this.pending.slice(0, holdStart);
          this.pending = this.pending.slice(holdStart);
        } else {
          this.followUpBuffer += this.pending;
          this.pending = '';
        }
        break;
      }
    }

    return visibleOut;
  }

  /**
   * Flush buffered state at stream completion and extract clean follow-up questions.
   */
  public flush(): { visibleRemainder: string; followUpQuestions: string[] } {
    let visibleRemainder = '';

    if (this.inFollowUpBlock) {
      this.followUpBuffer += this.pending;
      this.pending = '';
      this.inFollowUpBlock = false;
    } else if (this.pending.length > 0) {
      // Only flush pending tail if it is not an incomplete open tag fragment
      if (!FollowUpStreamFilter.OPEN_TAG.startsWith(this.pending.toLowerCase())) {
        visibleRemainder = this.pending;
      } else if (this.pending.length < 3) {
        // Lone '<' or '<f' at end of response was likely literal text, not a tag
        visibleRemainder = this.pending;
      }
      this.pending = '';
    }

    return {
      visibleRemainder,
      followUpQuestions: FollowUpStreamFilter.parseQuestions(this.followUpBuffer),
    };
  }

  /**
   * Non-streaming utility to strip `<follow_up_suggestions>` blocks and return extracted questions.
   */
  public static stripAndExtract(rawText: string): {
    cleanText: string;
    followUpQuestions: string[];
  } {
    if (!rawText) {
      return { cleanText: '', followUpQuestions: [] };
    }
    const filter = new FollowUpStreamFilter();
    const visible = filter.push(rawText);
    const { visibleRemainder, followUpQuestions } = filter.flush();
    return {
      cleanText: `${visible}${visibleRemainder}`.trim(),
      followUpQuestions,
    };
  }

  private findPartialPrefixStart(lowerText: string, tag: string): number {
    const maxCheck = Math.min(lowerText.length, tag.length - 1);
    for (let len = maxCheck; len >= 1; len--) {
      const suffix = lowerText.slice(lowerText.length - len);
      if (tag.startsWith(suffix)) {
        return lowerText.length - len;
      }
    }
    return -1;
  }

  private static parseQuestions(rawBlock: string): string[] {
    if (!rawBlock) return [];
    return rawBlock
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)]+\s*/, '').trim())
      .filter((line) => line.length > 5 && !line.startsWith('<'))
      .slice(0, 3);
  }
}
