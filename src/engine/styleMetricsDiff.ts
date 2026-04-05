/**
 * Style metrics diff between original and revised text.
 *
 * Computes all 8 style metrics for both versions, then produces a
 * side-by-side comparison with direction indicators.
 *
 * If a reference StyleProfile is provided, also computes whether the
 * revision moved closer to or further from the reference.
 */

import type {
  Language,
  StyleMetricKey,
  StyleProfile,
  MetricDiff,
  MetricDirection,
} from '@/types';
import { extractStyleProfile } from './styleProfiler';

// ── Metric metadata ──────────────────────────────────────────────────

/**
 * For each metric, define:
 *   - label (EN/ZH)
 *   - lowerIsBetter: whether a decrease is an improvement
 *     (e.g., fillerDensity: lower = better)
 */
interface MetricMeta {
  key: StyleMetricKey;
  labelEn: string;
  labelZh: string;
  lowerIsBetter: boolean;
}

const METRIC_META: MetricMeta[] = [
  { key: 'avgSentenceLength', labelEn: 'Avg Sentence Length', labelZh: '平均句长', lowerIsBetter: false },
  { key: 'passiveVoiceRatio', labelEn: 'Passive Voice Ratio', labelZh: '被动语态比例', lowerIsBetter: true },
  { key: 'connectorFrequency', labelEn: 'Connector Frequency', labelZh: '衔接词频率', lowerIsBetter: true },
  { key: 'fillerDensity', labelEn: 'Filler Density', labelZh: '填充词密度', lowerIsBetter: true },
  { key: 'hedgeDensity', labelEn: 'Hedge Density', labelZh: '限定词密度', lowerIsBetter: true },
  { key: 'typeTokenRatio', labelEn: 'Vocabulary Diversity', labelZh: '词汇多样性', lowerIsBetter: false },
  { key: 'avgWordLength', labelEn: 'Avg Word Length', labelZh: '平均词长', lowerIsBetter: false },
  { key: 'avgSentencesPerParagraph', labelEn: 'Sentences/Paragraph', labelZh: '段落句数', lowerIsBetter: false },
];

// ── Core diff computation ────────────────────────────────────────────

/**
 * Determine if a change is an improvement, worsening, or unchanged.
 *
 * For metrics where lower is better (filler, passive, etc.):
 *   decrease → improved, increase → worsened
 * For neutral metrics (sentence length, vocabulary diversity):
 *   moving closer to reference → improved; without reference → unchanged for small delta
 */
function determineDirection(
  delta: number,
  meta: MetricMeta,
  originalValue: number,
  revisedValue: number,
  referenceValue?: number,
): MetricDirection {
  const threshold = 0.01; // ignore trivial changes

  if (Math.abs(delta) < threshold) return 'unchanged';

  if (referenceValue !== undefined) {
    // With reference: did we move closer or further?
    const originalDistance = Math.abs(originalValue - referenceValue);
    const revisedDistance = Math.abs(revisedValue - referenceValue);
    if (Math.abs(originalDistance - revisedDistance) < threshold) return 'unchanged';
    return revisedDistance < originalDistance ? 'improved' : 'worsened';
  }

  // Without reference: use lowerIsBetter heuristic
  if (meta.lowerIsBetter) {
    return delta < 0 ? 'improved' : 'worsened';
  }

  // For neutral metrics without reference, small changes are "unchanged"
  const relativeChange = originalValue > 0 ? Math.abs(delta) / originalValue : Math.abs(delta);
  if (relativeChange < 0.1) return 'unchanged';

  return 'unchanged'; // Can't determine direction without reference
}

/**
 * Compute style metrics diff between original and revised text.
 *
 * @param originalText - The original version of the text
 * @param revisedText - The revised version of the text
 * @param language - Language of both texts
 * @param referenceProfile - Optional reference profile to compare against
 * @returns Array of MetricDiff for each of the 8 style metrics
 */
export function computeStyleDiff(
  originalText: string,
  revisedText: string,
  language: Language,
  referenceProfile?: StyleProfile,
): MetricDiff[] {
  const originalProfile = extractStyleProfile(originalText, language);
  const revisedProfile = extractStyleProfile(revisedText, language);

  return METRIC_META.map((meta) => {
    const originalValue = originalProfile[meta.key].mean;
    const revisedValue = revisedProfile[meta.key].mean;
    const delta = revisedValue - originalValue;
    const referenceValue = referenceProfile?.[meta.key]?.mean;
    const label = language === 'zh' ? meta.labelZh : meta.labelEn;

    return {
      metric: meta.key,
      label,
      originalValue,
      revisedValue,
      delta,
      direction: determineDirection(delta, meta, originalValue, revisedValue, referenceValue),
      referenceValue,
    };
  });
}
