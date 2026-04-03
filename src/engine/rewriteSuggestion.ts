import type { LLMConfig, Language, DeviationFinding, RewriteResult, StyleMetricKey } from '@/types';
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
 * Build a focused system prompt for academic text rewriting.
 */
function buildSystemPrompt(language: Language): string {
  if (language === 'zh') {
    return `你是一位学术写作顾问。用户会提供一段学术文本和具体的风格偏差诊断。
你的任务是改写这段文本，使其更贴近目标期刊/会议的写作风格。

规则：
- 保持原文的核心含义和学术准确性
- 只针对指出的偏差进行调整，不要过度改写
- 改写后的文本应该读起来自然、像人类学者写的
- 用中文回复

回复格式（严格遵守）：
REWRITE: [改写后的文本]
EXPLAIN: [简短说明你做了什么调整，为什么]`;
  }

  return `You are an academic writing consultant. The user will provide a passage of academic text along with a specific style deviation diagnosis.
Your task is to rewrite the passage to better match the target venue's writing style.

Rules:
- Preserve the core meaning and academic accuracy
- Only adjust for the identified deviation — do not over-edit
- The rewrite should read naturally, as if written by a human scholar
- Keep the same language as the input

Response format (strict):
REWRITE: [rewritten text]
EXPLAIN: [brief explanation of what you changed and why]`;
}

/**
 * Build the user message with text and deviation context.
 */
function buildUserMessage(
  text: string,
  deviations: DeviationFinding[],
  language: Language,
): string {
  const labels = language === 'zh' ? METRIC_LABELS_ZH : METRIC_LABELS_EN;

  const deviationDesc = deviations
    .map((d) => {
      const dir = d.level === 'above'
        ? (language === 'zh' ? '偏高' : 'too high')
        : (language === 'zh' ? '偏低' : 'too low');
      const refRange = `${d.referenceRange.lower.toFixed(2)}–${d.referenceRange.upper.toFixed(2)}`;
      return `- ${labels[d.metric]}: ${dir} (yours: ${d.userValue.toFixed(2)}, reference range: ${refRange})`;
    })
    .join('\n');

  if (language === 'zh') {
    return `以下是需要改写的文本：

"""
${text}
"""

风格偏差诊断：
${deviationDesc}

请根据上述偏差改写文本。`;
  }

  return `Here is the text to rewrite:

"""
${text}
"""

Style deviations detected:
${deviationDesc}

Please rewrite the text to address these deviations.`;
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
 * Request a style-aware rewrite suggestion from the LLM.
 *
 * @param config - LLM provider configuration
 * @param text - The user's text to rewrite
 * @param deviations - Style deviations to address
 * @param language - UI / text language
 * @returns Rewrite result with original, rewritten text, and explanation
 */
export async function requestRewrite(
  config: LLMConfig,
  text: string,
  deviations: DeviationFinding[],
  language: Language,
): Promise<RewriteResult> {
  if (!text.trim()) {
    throw new Error('No text provided');
  }
  if (deviations.length === 0) {
    throw new Error('No deviations to address');
  }

  const systemPrompt = buildSystemPrompt(language);
  const userMessage = buildUserMessage(text, deviations, language);

  const response = await callAnthropic(config, systemPrompt, [
    { role: 'user', content: userMessage },
  ]);

  return parseResponse(response, text);
}
