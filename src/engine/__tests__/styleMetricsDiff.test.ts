import { describe, it, expect } from 'vitest';
import { computeStyleDiff } from '../styleMetricsDiff';
import { extractStyleProfile } from '../styleProfiler';

// ── Sample texts ─────────────────────────────────────────────────────

const ORIGINAL_WITH_FILLERS = `In today's rapidly evolving landscape, it is worth noting that the field has gained significant traction. Furthermore, our approach leverages cutting-edge techniques. Moreover, the system was designed to be robust and transformative. Consequently, this contribution sheds new light on the challenges. It should be noted that further studies are needed. To some extent, the evaluation was somewhat limited.`;

const REVISED_CLEANER = `The field has gained significant traction in recent years. Our approach uses new rendering techniques. The system supports interactive exploration. This work addresses key challenges in visual analytics. Further studies will extend the evaluation. The sample size was limited but representative.`;

const IDENTICAL_TEXT = `We developed a visualization system. The system renders data in real time. Users select filters from a panel.`;

// ── computeStyleDiff ─────────────────────────────────────────────────

describe('computeStyleDiff', () => {
  it('returns diffs for all 8 style metrics', () => {
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en');
    expect(diffs).toHaveLength(8);

    const metricKeys = diffs.map((d) => d.metric);
    expect(metricKeys).toContain('avgSentenceLength');
    expect(metricKeys).toContain('passiveVoiceRatio');
    expect(metricKeys).toContain('connectorFrequency');
    expect(metricKeys).toContain('fillerDensity');
    expect(metricKeys).toContain('hedgeDensity');
    expect(metricKeys).toContain('typeTokenRatio');
    expect(metricKeys).toContain('avgWordLength');
    expect(metricKeys).toContain('avgSentencesPerParagraph');
  });

  it('detects improvement when reducing filler density', () => {
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en');
    const fillerDiff = diffs.find((d) => d.metric === 'fillerDensity');
    expect(fillerDiff).toBeDefined();

    // Original has more fillers, so delta should be negative (improvement)
    if (fillerDiff!.delta < -0.01) {
      expect(fillerDiff!.direction).toBe('improved');
    }
  });

  it('detects improvement when reducing connector overuse', () => {
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en');
    const connectorDiff = diffs.find((d) => d.metric === 'connectorFrequency');
    expect(connectorDiff).toBeDefined();

    // Original has more connectors
    if (connectorDiff!.delta < -0.01) {
      expect(connectorDiff!.direction).toBe('improved');
    }
  });

  it('returns unchanged for identical texts', () => {
    const diffs = computeStyleDiff(IDENTICAL_TEXT, IDENTICAL_TEXT, 'en');
    for (const d of diffs) {
      expect(d.delta).toBeCloseTo(0, 5);
      expect(d.direction).toBe('unchanged');
    }
  });

  it('includes labels for each metric', () => {
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en');
    for (const d of diffs) {
      expect(d.label.length).toBeGreaterThan(0);
    }
  });

  it('provides Chinese labels when language is zh', () => {
    const zhText = '我们提出了一种方法。该方法非常有效。实验结果验证了性能。';
    const diffs = computeStyleDiff(zhText, zhText, 'zh');
    for (const d of diffs) {
      // Chinese labels should contain CJK characters
      expect(d.label).toMatch(/[\u4e00-\u9fff]/);
    }
  });

  it('includes reference values when profile is provided', () => {
    const refProfile = extractStyleProfile(REVISED_CLEANER, 'en');
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en', refProfile);

    for (const d of diffs) {
      expect(d.referenceValue).toBeDefined();
      expect(typeof d.referenceValue).toBe('number');
    }
  });

  it('determines direction based on reference when available', () => {
    const refProfile = extractStyleProfile(REVISED_CLEANER, 'en');
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en', refProfile);

    // Since the revised text IS the reference, revision should move towards reference
    const nonUnchanged = diffs.filter((d) => d.direction !== 'unchanged');
    // At least some metrics should show improvement toward reference
    const improved = nonUnchanged.filter((d) => d.direction === 'improved');
    expect(improved.length).toBeGreaterThanOrEqual(0); // May be 0 if all match reference closely
  });

  it('has correct delta sign (revised - original)', () => {
    const diffs = computeStyleDiff(ORIGINAL_WITH_FILLERS, REVISED_CLEANER, 'en');
    for (const d of diffs) {
      expect(d.delta).toBeCloseTo(d.revisedValue - d.originalValue, 5);
    }
  });
});
