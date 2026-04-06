import { describe, it, expect } from 'vitest';
import { calculateScore, getScoreLabel, getScoreColor } from '../scoring';
import type { PatternCounts, TextStatistics } from '@/types';

const baseStats: TextStatistics = {
  wordCount: 100,
  sentenceCount: 5,
  paragraphCount: 1,
  avgSentenceLength: 20,
  coefficientOfVariation: 0.4,
  sentenceLengths: [15, 20, 25, 18, 22],
};

const zeroCounts: PatternCounts = {
  filler: 0,
  hedge: 0,
  connector: 0,
  template: 0,
  passive: 0,
};

describe('calculateScore', () => {
  it('returns 0 for zero word count', () => {
    const emptyStats = { ...baseStats, wordCount: 0 };
    expect(calculateScore(zeroCounts, emptyStats, 0)).toBe(0);
  });

  it('returns 0 for clean text with no patterns', () => {
    const cleanStats = { ...baseStats, coefficientOfVariation: 0.5, sentenceCount: 2 };
    const score = calculateScore(zeroCounts, cleanStats, 0);
    // With no highlights and short text (< 4 sentences), score is minimal
    expect(score).toBeLessThan(30);
  });

  it('returns higher score for more patterns', () => {
    const lowCounts = { ...zeroCounts, filler: 1 };
    const highCounts = { ...zeroCounts, filler: 8, connector: 7, template: 5 };

    const lowScore = calculateScore(lowCounts, baseStats, 1);
    const highScore = calculateScore(highCounts, baseStats, 20);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('never exceeds 100', () => {
    const extremeCounts: PatternCounts = {
      filler: 50,
      hedge: 50,
      connector: 50,
      template: 50,
      passive: 50,
    };
    const score = calculateScore(extremeCounts, baseStats, 250);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('penalizes uniform sentence length', () => {
    const uniformStats = { ...baseStats, coefficientOfVariation: 0.1, sentenceCount: 10 };
    const variedStats = { ...baseStats, coefficientOfVariation: 0.6, sentenceCount: 10 };

    const uniformScore = calculateScore(zeroCounts, uniformStats, 0);
    const variedScore = calculateScore(zeroCounts, variedStats, 0);

    expect(uniformScore).toBeGreaterThan(variedScore);
  });

  it('scores higher when marker density exceeds 5% (high-density bonus)', () => {
    // Simulate P6-like: 19 markers in 208 words = 9.1% density
    const denseCounts = { ...zeroCounts, filler: 13, connector: 5, template: 1 };
    const denseStats = { ...baseStats, wordCount: 208, sentenceCount: 11, coefficientOfVariation: 0.37 };
    const denseScore = calculateScore(denseCounts, denseStats, 19);

    // Simulate moderate: 10 markers in 208 words = 4.8% density (below 5% threshold)
    const modCounts = { ...zeroCounts, filler: 6, connector: 3, template: 1 };
    const modScore = calculateScore(modCounts, denseStats, 10);

    // Dense text should score notably higher — the high-density bonus kicks in
    expect(denseScore).toBeGreaterThan(modScore + 8);
    // And should break through the old ~74 ceiling
    expect(denseScore).toBeGreaterThanOrEqual(80);
  });

  it('dampens score when highlights are overwhelmingly passive voice only', () => {
    // Simulate P4-like: 6 passives, 0 other signals, 170 words
    const passiveCounts = { ...zeroCounts, passive: 6 };
    const methodStats = { ...baseStats, wordCount: 170, sentenceCount: 8, coefficientOfVariation: 0.35 };
    const passiveScore = calculateScore(passiveCounts, methodStats, 6);

    // Without dampening this would be ~44. With dampening it should drop below 35.
    expect(passiveScore).toBeLessThanOrEqual(35);
  });

  it('does NOT dampen passive when other AI signals are present', () => {
    // 4 passives + 3 fillers + 2 connectors — mixed signals, no dampening
    const mixedCounts = { ...zeroCounts, passive: 4, filler: 3, connector: 2 };
    const mixedStats = { ...baseStats, wordCount: 200, sentenceCount: 10, coefficientOfVariation: 0.35 };
    const mixedScore = calculateScore(mixedCounts, mixedStats, 9);

    // Same total highlights but passive-only (should be lower due to dampening)
    const passiveOnlyCounts = { ...zeroCounts, passive: 9 };
    const passiveOnlyScore = calculateScore(passiveOnlyCounts, mixedStats, 9);

    expect(mixedScore).toBeGreaterThan(passiveOnlyScore);
  });
});

describe('getScoreLabel', () => {
  it('returns correct labels for score ranges', () => {
    expect(getScoreLabel(10)).toBe('Looks human');
    expect(getScoreLabel(35)).toBe('Some AI signals');
    expect(getScoreLabel(60)).toBe('Notable AI patterns');
    expect(getScoreLabel(85)).toBe('Strong AI signals');
  });
});

describe('getScoreColor', () => {
  it('returns green for low scores', () => {
    expect(getScoreColor(10)).toBe('#22c55e');
  });

  it('returns red for high scores', () => {
    expect(getScoreColor(80)).toBe('#ef4444');
  });
});
