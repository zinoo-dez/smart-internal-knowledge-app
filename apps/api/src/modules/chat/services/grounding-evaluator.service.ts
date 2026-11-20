import { Injectable } from '@nestjs/common';
import { AgentAnswer, AgentAnswerSchema, DocumentCitation } from '@knowledge/shared';
import { PromptSecurityService } from './prompt-security.service';

@Injectable()
export class GroundingEvaluatorService {
  private readonly promptSecurity = new PromptSecurityService();

  public parseStructuredAnswer(
    rawText: string,
    citations: DocumentCitation[],
  ): AgentAnswer {
    let followUpQuestions: string[] = [];
    let cleanedText = rawText;
    const followUpMatch = rawText.match(/<follow_up_suggestions>([\s\S]*?)<\/follow_up_suggestions>/i);
    if (followUpMatch) {
      followUpQuestions = followUpMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length > 5)
        .slice(0, 3);
      cleanedText = rawText
        .replace(/<follow_up_suggestions>[\s\S]*?<\/follow_up_suggestions>/gi, '')
        .trim();
    }

    try {
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (
          followUpQuestions.length > 0 &&
          (!parsed.followUpQuestions || parsed.followUpQuestions.length === 0)
        ) {
          parsed.followUpQuestions = followUpQuestions;
        }
        return AgentAnswerSchema.parse(parsed);
      }
    } catch {
      // Fall through to structured schema wrapper
    }

    const isUnresolved = citations.length === 0;
    return AgentAnswerSchema.parse({
      answer: cleanedText,
      citations: citations.map((c, idx) => ({
        sourceId: `source-${idx + 1}`,
        documentTitle: c.documentTitle,
        chunkId: c.chunkId,
        snippet: c.snippet,
        relevanceScore: c.relevanceScore,
      })),
      confidenceScore: isUnresolved ? 0.3 : 0.95,
      faithfulnessScore: isUnresolved ? 0.2 : 0.98,
      followUpQuestions:
        followUpQuestions.length > 0
          ? followUpQuestions
          : this.generateFollowUpSuggestions(cleanedText, citations),
      requiresHumanEscalation: isUnresolved,
      escalationDepartment: isUnresolved ? 'IT' : 'NONE',
    });
  }

  public generateFollowUpSuggestions(query: string, _citations: DocumentCitation[]): string[] {
    const isMy = this.promptSecurity.isMyanmarQuery(query);
    const lower = (query || '').toLowerCase();

    if (isMy) {
      if (lower.includes('vpn') || lower.includes('ချိတ်')) {
        return [
          'WireGuard configuration ဖိုင်ကို ဘယ်ကနေ ရယူရမလဲ?',
          'VPN ချိတ်ဆက်ရာတွင် Error တက်ပါက မည်သူ့ကို ဆက်သွယ်ရမလဲ?',
          'မိုဘိုင်းဖုန်းပေါ်တွင် ကုမ္ပဏီ VPN သုံးနိုင်ပါသလား?',
        ];
      }
      if (lower.includes('deploy') || lower.includes('code') || lower.includes('စနစ်')) {
        return [
          'Production deploy မတိုင်မီ မည်သည့် automated tests များ အောင်မြင်ရမည်နည်း?',
          'Database migration အဆင့်များကို ဘယ်လို run ရမလဲ?',
          'Hotfix deployment အတွက် approval flow က ဘယ်လိုလဲ?',
        ];
      }
      return [
        'ဤမူဝါဒနှင့်ပတ်သက်သော မူရင်းစာရွက်စာတမ်းကို ကြည့်ရှုလိုပါသလား?',
        'သက်ဆိုင်ရာဌာနသို့ အကူအညီတောင်းခံလွှာ (Support Ticket) ဖွင့်ပေးရမလား?',
        'ဤလုပ်ငန်းစဉ်အတွက် တာဝန်ခံအင်ဂျင်နီယာမှာ မည်သူနည်း?',
      ];
    }

    if (lower.includes('vpn') || lower.includes('network') || lower.includes('access')) {
      return [
        'Where can I download my WireGuard configuration and private key?',
        'Who is the designated on-call engineer for VPN access issues?',
        'Can I access internal staging environments without connecting to VPN?',
      ];
    }
    if (
      lower.includes('deploy') ||
      lower.includes('git') ||
      lower.includes('production') ||
      lower.includes('release')
    ) {
      return [
        'What automated CI checks are required before merging to main?',
        'How are PostgreSQL database migrations executed during rolling updates?',
        'What is the standard rollback procedure if a deployment fails health checks?',
      ];
    }
    if (
      lower.includes('confluence') ||
      lower.includes('runbook') ||
      lower.includes('incident') ||
      lower.includes('p1')
    ) {
      return [
        'What are the response SLAs for P1 through P4 incidents?',
        'How do I initiate an emergency incident bridge in Slack?',
        'What is the timeline requirement for drafting a Post-Incident Review (PIR)?',
      ];
    }
    if (
      lower.includes('leave') ||
      lower.includes('holiday') ||
      lower.includes('hr') ||
      lower.includes('insurance')
    ) {
      return [
        'How many annual leave days are allocated for full-time employees?',
        'What is the reimbursement procedure for health insurance claims?',
        'Who is the point of contact in HR Operations for parental leave?',
      ];
    }

    return [
      'Would you like me to open an internal support ticket for this inquiry?',
      'Can you show me the exact source document and owner?',
      'Are there any related SOPs or guidelines for this topic?',
    ];
  }

  public evaluateCitationGrounding(answerText: string, citations: DocumentCitation[]): number {
    if (!citations || citations.length === 0) {
      if (
        answerText.includes('could not find') ||
        answerText.includes('မတွေ့ရှိပါ') ||
        answerText.includes('Support Ticket')
      ) {
        return 1.0;
      }
      return 0.2;
    }

    const citedSentences = answerText
      .split(/(?<=[.!?။\n])\s+/)
      .filter((s) => /\[\d+\]/.test(s));

    if (citedSentences.length === 0) {
      return 0.95;
    }

    let totalScore = 0;
    for (const sentence of citedSentences) {
      const match = sentence.match(/\[(\d+)\]/);
      if (!match) continue;
      const citationIndex = parseInt(match[1], 10) - 1;
      const citedSnippet = citations[citationIndex]?.snippet;

      if (!citedSnippet) {
        totalScore += 0.3;
        continue;
      }

      const claimTokens = sentence
        .toLowerCase()
        .replace(/\[\d+\]/g, '')
        .split(/[\s,၊။:;`'"()]+/)
        .filter((w) => w.length > 3 || /\d+/.test(w));

      if (claimTokens.length === 0) {
        totalScore += 0.95;
        continue;
      }

      const snippetLower = citedSnippet.toLowerCase();
      let matchedCount = 0;
      for (const token of claimTokens) {
        if (snippetLower.includes(token)) {
          matchedCount++;
        }
      }

      const overlapRatio = matchedCount / claimTokens.length;
      totalScore += overlapRatio >= 0.3 ? 0.98 : 0.6;
    }

    const avgGrounding = totalScore / citedSentences.length;
    return Math.round(avgGrounding * 100) / 100;
  }

  public generateSynthesizedAnswer(query: string, citations: DocumentCitation[]): string {
    if (!citations || citations.length === 0) {
      return this.generateSafeRefusal(query);
    }

    const primary = citations[0];
    const isMy = this.promptSecurity.isMyanmarQuery(query);

    const queryTokens = query
      .toLowerCase()
      .split(/[\s,၊။?]+/)
      .filter((w) => w.length > 2);
    const hasOverlap = queryTokens.some(
      (token) =>
        primary.snippet.toLowerCase().includes(token) ||
        primary.documentTitle.toLowerCase().includes(token),
    );

    if (!hasOverlap && (primary.relevanceScore || 0) < 0.25) {
      return this.generateSafeRefusal(query);
    }

    if (isMy) {
      return (
        `**${primary.documentTitle}** [1] မှ ဖော်ပြချက်အရ: ${primary.snippet.slice(0, 250)}...\n\n` +
        `အသေးစိတ်အချက်အလက်များအတွက် သက်ဆိုင်ရာ ကုမ္ပဏီမှတ်တမ်းများကို ကြည့်ရှုနိုင်ပါသည်။`
      );
    }
    return (
      `Based on **${primary.documentTitle}** [1], ${primary.snippet.slice(0, 250)}...\n\n` +
      `For additional details, please refer to the referenced company documentation.`
    );
  }

  public generateSafeRefusal(query: string): string {
    const isMy = this.promptSecurity.isMyanmarQuery(query);
    if (isMy) {
      return (
        `ကုမ္ပဏီမှတ်တမ်းများတွင် "${query}" နှင့်ပတ်သက်သော အချက်အလက်များ မတွေ့ရှိပါ။\n\n` +
        `သက်ဆိုင်ရာဌာနသို့ အကူအညီတောင်းခံလွှာ (Support Ticket) ဖွင့်ပေးရမလားခင်ဗျာ။`
      );
    }
    return (
      `I could not find information about "${query}" in company documentation.\n\n` +
      `Would you like me to open an internal support ticket with the relevant department to clarify this policy?`
    );
  }

  public classifyGapCategory(query: string): string {
    const lower = query.toLowerCase();
    if (
      lower.includes('leave') ||
      lower.includes('benefit') ||
      lower.includes('health') ||
      lower.includes('holiday') ||
      lower.includes('salary') ||
      lower.includes('parental')
    ) {
      return 'HR & Policies';
    }
    if (
      lower.includes('vpn') ||
      lower.includes('password') ||
      lower.includes('laptop') ||
      lower.includes('wifi') ||
      lower.includes('slack')
    ) {
      return 'IT & Infrastructure';
    }
    if (
      lower.includes('aws') ||
      lower.includes('deploy') ||
      lower.includes('docker') ||
      lower.includes('database') ||
      lower.includes('grpc') ||
      lower.includes('api')
    ) {
      return 'Engineering Architecture';
    }
    return 'General Company Operations';
  }
}
