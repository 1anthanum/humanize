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
