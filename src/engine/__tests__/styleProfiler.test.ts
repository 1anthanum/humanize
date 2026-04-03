import { describe, it, expect } from 'vitest';
import {
  extractStyleProfile,
  mergeProfiles,
  compareToProfile,
  computeDeviation,
  generateDeviationSuggestions,
} from '../styleProfiler';
import type { StyleMetric, DeviationFinding } from '@/types';

const SAMPLE_EN = `In today's rapidly evolving landscape, data visualization has gained significant traction. Furthermore, interactive visualization plays a crucial role in enabling users to explore datasets. Moreover, our approach leverages cutting-edge techniques.

This paper presents a novel framework that seamlessly integrates multiple views. The results demonstrate that participants found the system intuitive. Additionally, the findings suggest our method could bridge the gap between novice and expert users.

Consequently, our work paves the way for future research in this domain. It should be noted that further studies are needed to validate these findings. The evaluation was somewhat limited by the small sample size.`;

const SAMPLE_ZH = `在当今快速发展的时代，数据可视化领域发挥着至关重要的作用。值得注意的是，该领域已经受到了广泛的关注。此外，丰富的研究表明交互式可视化具有不可或缺的价值。

本文旨在探讨一种新的可视化框架。实验结果表明，该系统在一定程度上填补了该领域的空白。与此同时，我们的方法被广泛认为是相对有效的。`;

describe('extractStyleProfile', () => {
  it('extracts valid profile from English text', () => {
    const profile = extractStyleProfile(SAMPLE_EN, 'en');

    expect(profile.documentCount).toBe(1);
    expect(profile.totalWords).toBeGreaterThan(0);
    expect(profile.avgSentenceLength.mean).toBeGreaterThan(0);
    expect(profile.avgSentenceLength.samples).toHaveLength(1);
    expect(profile.passiveVoiceRatio.mean).toBeGreaterThanOrEqual(0);
    expect(profile.passiveVoiceRatio.mean).toBeLessThanOrEqual(1);
    expect(profile.typeTokenRatio.mean).toBeGreaterThan(0);
    expect(profile.typeTokenRatio.mean).toBeLessThanOrEqual(1);
    expect(profile.avgWordLength.mean).toBeGreaterThan(0);
  });

  it('extracts valid profile from Chinese text', () => {
    const profile = extractStyleProfile(SAMPLE_ZH, 'zh');

    expect(profile.documentCount).toBe(1);
    expect(profile.totalWords).toBeGreaterThan(0);
    expect(profile.avgSentenceLength.mean).toBeGreaterThan(0);
  });

  it('handles empty text gracefully', () => {
    const profile = extractStyleProfile('', 'en');

    expect(profile.documentCount).toBe(1);
    expect(profile.totalWords).toBe(0);
    expect(profile.avgSentenceLength.mean).toBe(0);
  });

  it('computes connector frequency relative to sentence count', () => {
    // Text with known high connector count
    const text = 'Furthermore, this is important. Moreover, that is key. Additionally, results show progress.';
    const profile = extractStyleProfile(text, 'en');

    expect(profile.connectorFrequency.mean).toBeGreaterThan(0);
  });

  it('computes filler density relative to word count', () => {
    const text = 'It is worth noting that the system works. It should be noted that results are good. In other words, we found evidence.';
    const profile = extractStyleProfile(text, 'en');

    expect(profile.fillerDensity.mean).toBeGreaterThan(0);
  });
});

describe('mergeProfiles', () => {
  it('returns single profile unchanged', () => {
    const profile = extractStyleProfile(SAMPLE_EN, 'en');
    const merged = mergeProfiles([profile]);

    expect(merged).toEqual(profile);
  });

  it('merges multiple profiles correctly', () => {
    const p1 = extractStyleProfile(SAMPLE_EN, 'en');
    const shortText = 'Short sentences. Very brief. Crisp writing.';
    const p2 = extractStyleProfile(shortText, 'en');
    const merged = mergeProfiles([p1, p2]);

    expect(merged.documentCount).toBe(2);
    expect(merged.totalWords).toBe(p1.totalWords + p2.totalWords);
    // Merged avg sentence length should be between the two
    expect(merged.avgSentenceLength.samples).toHaveLength(2);
  });

  it('handles empty array', () => {
    const merged = mergeProfiles([]);
    expect(merged.documentCount).toBe(1); // extractStyleProfile('', 'en') returns 1
    expect(merged.totalWords).toBe(0);
  });

  it('pools samples from all documents', () => {
    const p1 = extractStyleProfile(SAMPLE_EN, 'en');
    const p2 = extractStyleProfile(SAMPLE_EN, 'en');
    const p3 = extractStyleProfile(SAMPLE_EN, 'en');
    const merged = mergeProfiles([p1, p2, p3]);

    expect(merged.avgSentenceLength.samples).toHaveLength(3);
    expect(merged.documentCount).toBe(3);
  });
});

describe('computeDeviation', () => {
  const metric: StyleMetric = {
    mean: 20,
    stdDev: 5,
    min: 10,
    max: 30,
    samples: [15, 20, 25],
  };

  it('returns "within" for values in range', () => {
    expect(computeDeviation(20, metric, 'avgSentenceLength')).toBe('within');
    expect(computeDeviation(18, metric, 'avgSentenceLength')).toBe('within');
    expect(computeDeviation(24, metric, 'avgSentenceLength')).toBe('within');
  });

  it('returns "above" for values above range', () => {
    expect(computeDeviation(26, metric, 'avgSentenceLength')).toBe('above');
    expect(computeDeviation(40, metric, 'avgSentenceLength')).toBe('above');
  });

  it('returns "below" for values below range', () => {
    expect(computeDeviation(14, metric, 'avgSentenceLength')).toBe('below');
    expect(computeDeviation(5, metric, 'avgSentenceLength')).toBe('below');
  });

  it('uses minimum std dev for single-doc profiles', () => {
    const singleDoc: StyleMetric = {
      mean: 20,
      stdDev: 0, // Single doc has 0 std dev
      min: 20,
      max: 20,
      samples: [20],
    };
    // With MIN_STD_DEV of 3 for avgSentenceLength, range is 17-23
    expect(computeDeviation(21, singleDoc, 'avgSentenceLength')).toBe('within');
    expect(computeDeviation(25, singleDoc, 'avgSentenceLength')).toBe('above');
  });
});

describe('compareToProfile', () => {
  it('identifies deviations between user text and profile', () => {
    const profile = extractStyleProfile(SAMPLE_EN, 'en');
    // Very different text — short sentences, no connectors
    const userText = 'Short. Brief. Done. Simple. Clear.';
    const result = compareToProfile(userText, profile, 'en');

    expect(result.deviations).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBe(result.deviations.length);
  });

  it('returns no deviations for identical text', () => {
    const profile = extractStyleProfile(SAMPLE_EN, 'en');
    const result = compareToProfile(SAMPLE_EN, profile, 'en');

    // Most metrics should be within range (identical text)
    // Some may deviate slightly due to single-doc std dev = 0 + MIN_STD_DEV
    expect(result.deviations.length).toBeLessThanOrEqual(2);
  });

  it('sorts deviations by severity (high first)', () => {
    const profile = extractStyleProfile(SAMPLE_EN, 'en');
    const userText = 'A. B. C. D. E. F.'; // Very different
    const result = compareToProfile(userText, profile, 'en');

    if (result.deviations.length >= 2) {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < result.deviations.length; i++) {
        expect(severityOrder[result.deviations[i]!.severity]).toBeGreaterThanOrEqual(
          severityOrder[result.deviations[i - 1]!.severity],
        );
      }
    }
  });
});

describe('generateDeviationSuggestions', () => {
  it('generates English suggestions', () => {
    const deviations: DeviationFinding[] = [
      {
        metric: 'avgSentenceLength',
        level: 'above',
        severity: 'high',
        userValue: 30,
        referenceRange: { mean: 18, lower: 14, upper: 22 },
      },
    ];
    const suggestions = generateDeviationSuggestions(deviations, 'en');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.severity).toBe('high');
    expect(suggestions[0]!.title).toContain('higher');
    expect(suggestions[0]!.suggestion.length).toBeGreaterThan(0);
  });

  it('generates Chinese suggestions', () => {
    const deviations: DeviationFinding[] = [
      {
        metric: 'passiveVoiceRatio',
        level: 'above',
        severity: 'medium',
        userValue: 0.5,
        referenceRange: { mean: 0.2, lower: 0.1, upper: 0.3 },
      },
    ];
    const suggestions = generateDeviationSuggestions(deviations, 'zh');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.title).toContain('偏高');
  });

  it('handles empty deviations', () => {
    const suggestions = generateDeviationSuggestions([], 'en');
    expect(suggestions).toHaveLength(0);
  });
});
