import type { LLMConfig, Language, DeviationFinding, RewriteResult, StyleMetricKey, Highlight } from '@/types';
import { callAnthropic } from './llmProvider';

/** Metric labels for prompt context */
const METRIC_LABELS_EN: Record<StyleMetricKey, string> = {
  avgSentenceLength: 'average sentence length',
  passiveVoiceRatio: 'passive voice usage',
  connectorFrequency: 'connector word frequency',
  fillerDensity: 'filler phrase density',
  hedgeDensity: 'hedge word density',
  typeTokenRatio: 'vocabulary diversity',
  avgWordLength: 'average word length',
  avgSentencesPerParagraph: 'paragraph length',
};

const METRIC_LABELS_ZH: Record<StyleMetricKey, string> = {
  avgSentenceLength: '平均句长',
  passiveVoiceRatio: '被动语态使用',
  connectorFrequency: '连接词频率',
  fillerDensity: '填充词密度',
  hedgeDensity: '限定词密度',
  typeTokenRatio: '词汇多样性',
  avgWordLength: '平均词长',
  avgSentencesPerParagraph: '段落长度',
};

/**
 * Build system prompt with dual-objective strategy:
 *   1. PRIMARY: remove/replace specific AI-flagged phrases
 *   2. SECONDARY: adjust style metrics toward the reference range
 */
function buildSystemPrompt(language: Language): string {
  if (language === 'zh') {
    return `你是一位学术写作顾问。用户会提供一段文本，附带两类诊断：
(A) 被标记为"AI 味"的具体短语及改写建议
(B) 与目标期刊/会议的风格指标偏差

你的任务（按优先级）：
1. 【最高优先】移除或替换所有被标记的 AI 典型短语。用自然、具体的表达替代泛化套话。绝对不要保留被标记的原词。
2. 【次要】在此基础上微调风格以接近目标指标范围，但不要为了匹配统计数据而引入新的 AI 模板词（如"此外"、"值得注意的是"、"综上所述"等）。

关键约束：
- 保持原文的核心含义和学术准确性
- 改写后的文本长度应与原文大致相当
- 不要引入新的 AI 典型词汇来替代被删除的词汇
- 如果风格指标目标与移除 AI 味冲突，优先移除 AI 味

回复格式（严格遵守）：
REWRITE: [改写后的文本]
EXPLAIN: [简短说明你做了什么调整，为什么]`;
  }

  return `You are an academic writing consultant. The user will provide text with two types of diagnostics:
(A) Specific phrases flagged as AI-typical, each with a rewrite suggestion
(B) Style metric deviations from a target venue's reference range

Your task (in priority order):
1. [HIGHEST PRIORITY] Remove or replace ALL flagged AI-typical phrases. Replace vague buzzwords with specific, natural alternatives. Do NOT retain any flagged phrase verbatim.
2. [SECONDARY] Fine-tune the style to move toward the target metric ranges, but NEVER introduce new AI-template words (e.g., "Furthermore", "Moreover", "comprehensive", "leverage", "It is worth noting") to meet a metric target.

Key constraints:
- Preserve core meaning and academic accuracy
- Keep the rewritten text approximately the same length as the original
- Do NOT introduce new AI-typical vocabulary to replace removed vocabulary
- If a style metric target conflicts with removing AI patterns, prioritize removing AI patterns

Response format (strict):
REWRITE: [rewritten text]
EXPLAIN: [brief explanation of what you changed and why]`;
}

/**
 * Deduplicate highlights by text (case-insensitive), keeping the first occurrence.
 */
function deduplicateHighlights(highlights: Highlight[]): Highlight[] {
  const seen = new Set<string>();
  return highlights.filter((h) => {
    const key = h.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build the user message with AI highlights (primary) + metric deviations (secondary).
 */
function buildUserMessage(
  text: string,
  highlights: Highlight[],
  deviations: DeviationFinding[],
  language: Language,
): string {
  const labels = language === 'zh' ? METRIC_LABELS_ZH : METRIC_LABELS_EN;

  // Section A: specific flagged phrases
  const uniqueHighlights = deduplicateHighlights(highlights);
  const highlightDesc = uniqueHighlights.length > 0
    ? uniqueHighlights
        .map((h) => `- "${h.text}" → ${h.tip}`)
        .join('\n')
    : (language === 'zh' ? '（无具体标记）' : '(none)');

  // Section B: style metric deviations
  const deviationDesc = deviations.length > 0
    ? deviations
        .map((d) => {
          const dir = d.level === 'above'
            ? (language === 'zh' ? '偏高' : 'too high')
            : (language === 'zh' ? '偏低' : 'too low');
          const refRange = `${d.referenceRange.lower.toFixed(2)}–${d.referenceRange.upper.toFixed(2)}`;
          return `- ${labels[d.metric]}: ${dir} (yours: ${d.userValue.toFixed(2)}, target: ${refRange})`;
        })
        .join('\n')
    : (language === 'zh' ? '（无偏差）' : '(none)');

  if (language === 'zh') {
    return `以下是需要改写的文本：

"""
${text}
"""

(A) 被标记的 AI 典型短语（必须全部移除或替换）：
${highlightDesc}

(B) 风格指标偏差（次要参考）：
${deviationDesc}

请先处理 (A) 中的所有标记短语，然后在不引入新 AI 模板词的前提下微调 (B)。`;
  }

  return `Here is the text to rewrite:

"""
${text}
"""

(A) Flagged AI-typical phrases (MUST all be removed or replaced):
${highlightDesc}

(B) Style metric deviations (secondary reference):
${deviationDesc}

Address ALL phrases in (A) first, then fine-tune for (B) without introducing new AI-template vocabulary.`;
}

/**
 * Parse the LLM response into a RewriteResult.
 */
function parseResponse(response: string, originalText: string): RewriteResult {
  const rewriteMatch = response.match(/REWRITE:\s*([\s\S]*?)(?=EXPLAIN:|$)/i);
  const explainMatch = response.match(/EXPLAIN:\s*([\s\S]*?)$/i);

  return {
    original: originalText,
    rewritten: rewriteMatch ? rewriteMatch[1]!.trim() : response.trim(),
    explanation: explainMatch ? explainMatch[1]!.trim() : '',
  };
}

/**
 * Request a dual-objective rewrite suggestion from the LLM.
 *
 * Dual objectives (in priority order):
 *   1. Remove/replace specific AI-flagged phrases (from analyzer highlights)
 *   2. Adjust style metrics toward venue reference range (from style deviations)
 *
 * @param config - LLM provider configuration
 * @param text - The user's text to rewrite
 * @param highlights - AI-pattern highlights from the analyzer
 * @param deviations - Style deviations from the style profiler
 * @param language - UI / text language
 * @returns Rewrite result with original, rewritten text, and explanation
 */
export async function requestRewrite(
  config: LLMConfig,
  text: string,
  highlights: Highlight[],
  deviations: DeviationFinding[],
  language: Language,
): Promise<RewriteResult> {
  if (!text.trim()) {
    throw new Error('No text provided');
  }
  if (highlights.length === 0 && deviations.length === 0) {
    throw new Error('No issues to address');
  }

  const systemPrompt = buildSystemPrompt(language);
  const userMessage = buildUserMessage(text, highlights, deviations, language);

  const response = await callAnthropic(config, systemPrompt, [
    { role: 'user', content: userMessage },
  ]);

  return parseResponse(response, text);
}
