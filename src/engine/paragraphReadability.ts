/**
 * Paragraph-level readability analysis.
 *
 * Splits text into paragraphs, computes an AI-likeness score per paragraph
 * using the same engine as the main analyzer, and maps scores to heatmap colors.
 */

import type { Language, ParagraphScore } from '@/types';
import { analyzeText } from './analyzer';

/**
 * Compute per-paragraph readability scores.
 *
 * Each paragraph is independently analyzed using the main analyzeText() engine.
 * The score represents AI-likeness (0 = very human, 100 = very AI-like).
 *
 * @param text - Full text to analyze
 * @param language - Language of the text
 * @returns Array of ParagraphScore objects
 */
export function computeParagraphScores(text: string, language: Language): ParagraphScore[] {
  if (!text.trim()) return [];

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return [];

  return paragraphs.map((para, index) => {
    const trimmed = para.trim();

    // Skip very short paragraphs (< 20 chars): not meaningful for analysis
    if (trimmed.length < 20) {
      return {
        index,
        text: trimmed,
        score: 0,
        factors: { sentenceLength: 0, passiveRatio: 0, fillerDensity: 0, hedgeDensity: 0 },
      };
    }

    const result = analyzeText(trimmed, language);

    // Extract factor breakdown from the analysis counts
    const wordCount = result.stats.wordCount || 1;
    const sentenceCount = result.stats.sentenceCount || 1;

    const passiveRatio = result.counts.passive / sentenceCount;
    const fillerDensity = (result.counts.filler / wordCount) * 1000;
    const hedgeDensity = (result.counts.hedge / wordCount) * 1000;
    const sentenceLength = result.stats.avgSentenceLength;

    return {
      index,
      text: trimmed,
      score: result.score,
      factors: {
        sentenceLength,
        passiveRatio,
        fillerDensity,
        hedgeDensity,
      },
    };
  });
}

/**
 * Map a readability score (0–100) to a CSS color for heatmap display.
 *
 * 0–30:  green (#22c55e) — good, minimal AI patterns
 * 30–60: yellow (#eab308) — moderate, some AI patterns
 * 60–100: red (#ef4444) — high AI-likeness, many patterns detected
 *
 * Uses linear interpolation for smooth gradients.
 */
export function getHeatmapColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));

  if (clamped <= 30) {
    // Green → Yellow
    const t = clamped / 30;
    return interpolateColor([34, 197, 94], [234, 179, 8], t);
  } else if (clamped <= 60) {
    // Yellow → Red
    const t = (clamped - 30) / 30;
    return interpolateColor([234, 179, 8], [239, 68, 68], t);
  } else {
    // Deep red for extreme values
    const t = (clamped - 60) / 40;
    return interpolateColor([239, 68, 68], [185, 28, 28], t);
  }
}

/**
 * Get the severity label for a readability score.
 */
export function getScoreLabel(score: number, language: Language): string {
  if (language === 'zh') {
    if (score <= 30) return '良好';
    if (score <= 60) return '一般';
    return '需改进';
  }
  if (score <= 30) return 'Good';
  if (score <= 60) return 'Fair';
  return 'Needs work';
}

function interpolateColor(from: [number, number, number], to: [number, number, number], t: number): string {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
