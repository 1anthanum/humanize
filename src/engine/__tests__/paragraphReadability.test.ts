import { describe, it, expect } from 'vitest';
import { computeParagraphScores, getHeatmapColor, getScoreLabel } from '../paragraphReadability';

// ── Sample texts ─────────────────────────────────────────────────────

const CLEAN_TEXT = `The system renders data in real time. Users select filters from a panel. Charts update instantly.

Click any bar to see details. The tooltip shows exact values.`;

const AI_HEAVY_TEXT = `In today's rapidly evolving landscape of data visualization, it is worth noting that the field has gained significant traction in recent years. Furthermore, interactive visualization plays a crucial role in enabling users to explore complex datasets. Moreover, our approach leverages cutting-edge techniques to foster a more holistic understanding of the data.

Consequently, our work paves the way for future research in this domain. The proposed system was designed to be robust and transformative. It should be noted that further studies are needed to validate these findings. To some extent, the evaluation was somewhat limited by the relatively small sample size. Nonetheless, we believe this contribution sheds new light on the challenges of visual analytics.`;

const SINGLE_PARAGRAPH = `We developed a new visualization system for network analysis.`;

// ── computeParagraphScores ───────────────────────────────────────────

describe('computeParagraphScores', () => {
  it('returns scores for each paragraph', () => {
    const scores = computeParagraphScores(CLEAN_TEXT, 'en');
    expect(scores).toHaveLength(2);
    expect(scores[0]!.index).toBe(0);
    expect(scores[1]!.index).toBe(1);
  });

  it('assigns lower scores to clean text', () => {
    const scores = computeParagraphScores(CLEAN_TEXT, 'en');
    for (const s of scores) {
      expect(s.score).toBeLessThanOrEqual(50);
    }
  });

  it('assigns higher scores to AI-heavy text', () => {
    const scores = computeParagraphScores(AI_HEAVY_TEXT, 'en');
    // At least one paragraph should have a high score
    const maxScore = Math.max(...scores.map((s) => s.score));
    expect(maxScore).toBeGreaterThan(30);
  });

  it('handles single paragraph', () => {
    const scores = computeParagraphScores(SINGLE_PARAGRAPH, 'en');
    expect(scores).toHaveLength(1);
    expect(scores[0]!.score).toBeGreaterThanOrEqual(0);
  });

  it('handles empty text', () => {
    expect(computeParagraphScores('', 'en')).toHaveLength(0);
  });

  it('handles whitespace-only text', () => {
    expect(computeParagraphScores('   \n\n   ', 'en')).toHaveLength(0);
  });

  it('includes factor breakdown in each score', () => {
    const scores = computeParagraphScores(AI_HEAVY_TEXT, 'en');
    for (const s of scores) {
      expect(s.factors).toHaveProperty('sentenceLength');
      expect(s.factors).toHaveProperty('passiveRatio');
      expect(s.factors).toHaveProperty('fillerDensity');
      expect(s.factors).toHaveProperty('hedgeDensity');
      expect(s.factors.sentenceLength).toBeGreaterThanOrEqual(0);
    }
  });

  it('preserves paragraph text', () => {
    const scores = computeParagraphScores(CLEAN_TEXT, 'en');
    expect(scores[0]!.text).toContain('system renders');
  });
});

// ── getHeatmapColor ──────────────────────────────────────────────────

describe('getHeatmapColor', () => {
  it('returns green-ish color for low scores', () => {
    const color = getHeatmapColor(10);
    expect(color).toMatch(/^rgb\(/);
    // Should be mostly green
    const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    expect(match).not.toBeNull();
    const [, r, g] = match!;
    expect(Number(g)).toBeGreaterThan(Number(r));
  });

  it('returns red-ish color for high scores', () => {
    const color = getHeatmapColor(80);
    const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    expect(match).not.toBeNull();
    const [, r, g] = match!;
    expect(Number(r)).toBeGreaterThan(Number(g));
  });

  it('clamps values to 0–100', () => {
    expect(getHeatmapColor(-10)).toBe(getHeatmapColor(0));
    expect(getHeatmapColor(150)).toBe(getHeatmapColor(100));
  });
});

// ── getScoreLabel ────────────────────────────────────────────────────

describe('getScoreLabel', () => {
  it('returns correct English labels', () => {
    expect(getScoreLabel(10, 'en')).toBe('Good');
    expect(getScoreLabel(45, 'en')).toBe('Fair');
    expect(getScoreLabel(75, 'en')).toBe('Needs work');
  });

  it('returns correct Chinese labels', () => {
    expect(getScoreLabel(10, 'zh')).toBe('良好');
    expect(getScoreLabel(45, 'zh')).toBe('一般');
    expect(getScoreLabel(75, 'zh')).toBe('需改进');
  });
});
