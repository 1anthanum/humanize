import type { Language, TextStatistics } from '@/types';

/**
 * Split text into sentences. Handles English (period/question/exclamation)
 * and Chinese (。！？) sentence boundaries.
 */
export function splitSentences(text: string, language: Language): string[] {
  if (language === 'zh') {
    return text
      .split(/[。！？\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Count words in text. For Chinese, counts characters (excluding punctuation).
 * For English, splits by whitespace.
 */
export function countWords(text: string, language: Language): number {
  if (language === 'zh') {
    // Count CJK characters + English words
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const englishWords = text
      .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    return cjkChars + englishWords;
  }
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Get sentence lengths (word count per sentence).
 */
function getSentenceLengths(sentences: string[], language: Language): number[] {
  return sentences.map((s) => countWords(s, language));
}

/**
 * Calculate coefficient of variation (stddev / mean).
 * Returns 0 if fewer than 2 sentences or mean is 0.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Compute text statistics for a given input.
 */
export function computeStats(text: string, language: Language): TextStatistics {
  const sentences = splitSentences(text, language);
  const sentenceLengths = getSentenceLengths(sentences, language);
  const wordCount = countWords(text, language);
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);

  const avgSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;

  return {
    wordCount,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgSentenceLength,
    coefficientOfVariation: coefficientOfVariation(sentenceLengths),
    sentenceLengths,
  };
}
