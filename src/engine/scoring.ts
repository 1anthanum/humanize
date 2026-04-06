import type { PatternCounts, TextStatistics } from '@/types';

/**
 * Calculate AI-likeness score (0–100). Higher = more AI-like.
 *
 * Scoring factors:
 * - Pattern density (up to 40 pts): ratio of detected patterns to word count
 * - Sentence uniformity (up to 25 pts): low coefficient of variation = uniform = AI-like
 * - Excess connectors (up to 15 pts): AI text overuses formal connectors
 * - Filler density (up to 10 pts): padding phrases
 * - Template density (up to 10 pts): stock academic phrases
 */
export function calculateScore(
  counts: PatternCounts,
  stats: TextStatistics,
  totalHighlights: number,
): number {
  if (stats.wordCount === 0) return 0;

  // --- Passive-only dampening ---
  // When highlights are overwhelmingly passive voice with minimal other AI
  // signals, passive alone is a weak AI indicator (standard in academic
  // methodology, technical docs, formal reports).  Halve passive contribution
  // to the density calculation so these texts aren't over-scored.
  const nonPassiveSignals = counts.filler + counts.hedge + counts.connector + counts.template;
  let effectiveHighlights = totalHighlights;
  if (nonPassiveSignals <= 1 && counts.passive >= 3) {
    effectiveHighlights = nonPassiveSignals + Math.ceil(counts.passive * 0.5);
  }

  let score = 0;

  // Pattern density: effective highlights relative to word count
  const density = (effectiveHighlights / stats.wordCount) * 100;
  score += Math.min(density * 8, 40);

  // High-density bonus: when marker density exceeds 5%, the base density
  // component is already capped at 40.  Add a graduated bonus so heavily
  // AI-generated text (1 marker per 10–15 words) scores 85+ instead of
  // plateauing at ~75.
  if (density > 5) {
    score += Math.min((density - 5) * 3, 12);
  }

  // Sentence uniformity: low CV means sentences are very similar in length
  if (stats.sentenceCount > 3) {
    score += Math.max(0, (1 - stats.coefficientOfVariation) * 25);
  }

  // Excess connectors beyond a baseline of 3
  if (counts.connector > 3) {
    score += Math.min((counts.connector - 3) * 4, 15);
  }

  // Filler excess beyond a baseline of 2
  if (counts.filler > 2) {
    score += Math.min((counts.filler - 2) * 3, 10);
  }

  // Template excess beyond a baseline of 2
  if (counts.template > 2) {
    score += Math.min((counts.template - 2) * 5, 10);
  }

  // Short text density boost: when text is short but marker-per-sentence
  // ratio is high, the absolute-count bonuses above underfire.
  // Boost score proportionally to markers-per-sentence density.
  if (stats.wordCount < 60 && stats.sentenceCount > 0 && stats.sentenceCount <= 3) {
    const markersPerSentence = totalHighlights / stats.sentenceCount;
    if (markersPerSentence > 1) {
      score += Math.min((markersPerSentence - 1) * 12, 20);
    }
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Get a human-readable label for the score */
export function getScoreLabel(score: number): string {
  if (score < 25) return 'Looks human';
  if (score < 50) return 'Some AI signals';
  if (score < 75) return 'Notable AI patterns';
  return 'Strong AI signals';
}

/** Get a color for the score visualization */
export function getScoreColor(score: number): string {
  if (score < 25) return '#22c55e';
  if (score < 50) return '#f59e0b';
  if (score < 75) return '#f97316';
  return '#ef4444';
}
