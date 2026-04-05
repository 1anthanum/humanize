import type {
  Language,
  Issue,
  StyleMetric,
  StyleMetricKey,
  StyleProfile,
  DeviationFinding,
  DeviationLevel,
  DeviationSeverity,
  StyleDeviationAnalysis,
} from '@/types';
import { computeStats, splitSentences, countWords } from './stats';
import { analyzeText } from './analyzer';
import { analyzeSections, buildSectionProfile } from './sectionAnalyzer';

// ── Helpers ──────────────────────────────────────────────────────────

/** Compute mean of a number array. Returns 0 for empty arrays. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compute population standard deviation. Returns 0 for < 2 values. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Build a StyleMetric from sample values */
function buildMetric(samples: number[]): StyleMetric {
  if (samples.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, samples: [] };
  }
  return {
    mean: mean(samples),
    stdDev: stdDev(samples),
    min: Math.min(...samples),
    max: Math.max(...samples),
    samples: [...samples],
  };
}

/**
 * Compute type-token ratio (unique words / total words).
 * For Chinese, uses character-level analysis.
 */
function computeTypeTokenRatio(text: string, language: Language): number {
  if (language === 'zh') {
    const chars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
    if (chars.length === 0) return 0;
    return new Set(chars).size / chars.length;
  }
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[^a-z'-]/g, ''))
    .filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

/**
 * Compute average word length (characters per word).
 * For Chinese, returns average character count per "word" (clause segment).
 */
function computeAvgWordLength(text: string, language: Language): number {
  if (language === 'zh') {
    // For Chinese, measure average segment length between punctuation
    const segments = text
      .split(/[，。！？；：、\s]+/)
      .filter((s) => s.length > 0);
    if (segments.length === 0) return 0;
    return mean(segments.map((s) => s.length));
  }
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[^a-zA-Z'-]/g, ''))
    .filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  return mean(words.map((w) => w.length));
}

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Extract a quantitative style profile from a single text sample.
 * Reuses existing engine functions (computeStats, analyzeText).
 */
export function extractStyleProfile(text: string, language: Language): StyleProfile {
  const stats = computeStats(text, language);
  const analysis = analyzeText(text, language);

  const sentences = splitSentences(text, language);
  const wordCount = countWords(text, language);

  // Passive voice ratio
  const passiveRatio =
    stats.sentenceCount > 0 ? analysis.counts.passive / stats.sentenceCount : 0;

  // Connector frequency (per sentence)
  const connectorFreq =
    stats.sentenceCount > 0 ? analysis.counts.connector / stats.sentenceCount : 0;

  // Filler density (per 100 words)
  const fillerDensity = wordCount > 0 ? (analysis.counts.filler / wordCount) * 100 : 0;

  // Hedge density (per 100 words)
  const hedgeDensity = wordCount > 0 ? (analysis.counts.hedge / wordCount) * 100 : 0;

  // Type-token ratio
  const ttr = computeTypeTokenRatio(text, language);

  // Average word length
  const avgWordLen = computeAvgWordLength(text, language);

  // Sentences per paragraph
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const sentencesPerParagraph =
    paragraphs.length > 0 ? sentences.length / paragraphs.length : sentences.length;

  return {
    avgSentenceLength: buildMetric([stats.avgSentenceLength]),
    passiveVoiceRatio: buildMetric([passiveRatio]),
    connectorFrequency: buildMetric([connectorFreq]),
    fillerDensity: buildMetric([fillerDensity]),
    hedgeDensity: buildMetric([hedgeDensity]),
    typeTokenRatio: buildMetric([ttr]),
    avgWordLength: buildMetric([avgWordLen]),
    avgSentencesPerParagraph: buildMetric([sentencesPerParagraph]),
    documentCount: 1,
    totalWords: wordCount,
    sentenceLengths: stats.sentenceLengths,
    sectionProfile: buildSectionProfile([analyzeSections(text, language)]),
  };
}

/**
 * Merge multiple style profiles into a single aggregate profile.
 * Pools all samples across documents and recomputes statistics.
 */
export function mergeProfiles(profiles: StyleProfile[]): StyleProfile {
  if (profiles.length === 0) {
    return extractStyleProfile('', 'en');
  }
  if (profiles.length === 1) return profiles[0]!;

  const metricKeys: StyleMetricKey[] = [
    'avgSentenceLength',
    'passiveVoiceRatio',
    'connectorFrequency',
    'fillerDensity',
    'hedgeDensity',
    'typeTokenRatio',
    'avgWordLength',
    'avgSentencesPerParagraph',
  ];

  const merged: Partial<StyleProfile> = {};
  for (const key of metricKeys) {
    const allSamples = profiles.flatMap((p) => p[key].samples);
    merged[key] = buildMetric(allSamples);
  }

  // Merge section profiles if available
  const sectionAnalyses = profiles
    .filter((p) => p.sectionProfile)
    .flatMap((p) =>
      p.sectionProfile!.entries.map((e) => ({
        sections: [{
          name: e.section,
          metrics: {
            proportion: e.metrics.mean,
            citationDensity: e.citationDensity.mean,
            firstPersonFrequency: e.firstPersonFrequency.mean,
            avgSentenceLength: e.avgSentenceLength.mean,
          },
        }],
      })),
    );
  // Re-aggregate: collect all per-document values per section
  const mergedSectionProfile = sectionAnalyses.length > 0
    ? buildSectionProfile(
        profiles
          .filter((p) => p.sectionProfile)
          .map((p) => {
            // Reconstruct DocumentSectionAnalysis from stored profile
            return {
              sections: p.sectionProfile!.entries.map((e) =>
                // Expand samples back out — each sample represents one document
                e.metrics.samples.map((propVal, i) => ({
                  name: e.section,
                  metrics: {
                    proportion: propVal,
                    citationDensity: e.citationDensity.samples[i] ?? e.citationDensity.mean,
                    firstPersonFrequency: e.firstPersonFrequency.samples[i] ?? e.firstPersonFrequency.mean,
                    avgSentenceLength: e.avgSentenceLength.samples[i] ?? e.avgSentenceLength.mean,
                  },
                })),
              ).flat(),
            };
          }),
      )
    : undefined;

  return {
    ...(merged as Pick<StyleProfile, StyleMetricKey>),
    documentCount: profiles.reduce((sum, p) => sum + p.documentCount, 0),
    totalWords: profiles.reduce((sum, p) => sum + p.totalWords, 0),
    sentenceLengths: profiles.flatMap((p) => p.sentenceLengths),
    sectionProfile: mergedSectionProfile,
  };
}

// ── Deviation Analysis ───────────────────────────────────────────────

/** Minimum std dev threshold to avoid zero-range for single-doc profiles */
const MIN_STD_DEV: Record<StyleMetricKey, number> = {
  avgSentenceLength: 3,
  passiveVoiceRatio: 0.05,
  connectorFrequency: 0.1,
  fillerDensity: 0.3,
  hedgeDensity: 0.3,
  typeTokenRatio: 0.05,
  avgWordLength: 0.5,
  avgSentencesPerParagraph: 1,
};

/**
 * Compute deviation level for a user value against a reference metric.
 */
export function computeDeviation(
  userValue: number,
  metric: StyleMetric,
  metricKey: StyleMetricKey,
): DeviationLevel {
  const sd = Math.max(metric.stdDev, MIN_STD_DEV[metricKey]);
  const lower = metric.mean - sd;
  const upper = metric.mean + sd;
  if (userValue < lower) return 'below';
  if (userValue > upper) return 'above';
  return 'within';
}

/**
 * Determine severity based on how far outside the range the value falls.
 */
function computeSeverity(
  userValue: number,
  metric: StyleMetric,
  metricKey: StyleMetricKey,
): DeviationSeverity {
  const sd = Math.max(metric.stdDev, MIN_STD_DEV[metricKey]);
  if (sd === 0) return 'low';
  const zScore = Math.abs(userValue - metric.mean) / sd;
  if (zScore > 2) return 'high';
  if (zScore > 1) return 'medium';
  return 'low';
}

/**
 * Compare user's text against a reference style profile.
 * Returns deviations and actionable suggestions.
 */
export function compareToProfile(
  text: string,
  profile: StyleProfile,
  language: Language,
): StyleDeviationAnalysis {
  const userProfile = extractStyleProfile(text, language);

  const metricKeys: StyleMetricKey[] = [
    'avgSentenceLength',
    'passiveVoiceRatio',
    'connectorFrequency',
    'fillerDensity',
    'hedgeDensity',
    'typeTokenRatio',
    'avgWordLength',
    'avgSentencesPerParagraph',
  ];

  const deviations: DeviationFinding[] = [];

  for (const key of metricKeys) {
    const userValue = userProfile[key].mean;
    const refMetric = profile[key];
    const level = computeDeviation(userValue, refMetric, key);
    const severity = computeSeverity(userValue, refMetric, key);

    if (level !== 'within') {
      const sd = Math.max(refMetric.stdDev, MIN_STD_DEV[key]);
      deviations.push({
        metric: key,
        level,
        severity,
        userValue,
        referenceRange: {
          mean: refMetric.mean,
          lower: refMetric.mean - sd,
          upper: refMetric.mean + sd,
        },
      });
    }
  }

  // Sort by severity (high first)
  const severityOrder: Record<DeviationSeverity, number> = { high: 0, medium: 1, low: 2 };
  deviations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const suggestions = generateDeviationSuggestions(deviations, language);

  return { deviations, suggestions };
}

// ── Suggestion Generation ────────────────────────────────────────────

/** Human-readable metric labels */
const METRIC_LABELS: Record<Language, Record<StyleMetricKey, string>> = {
  en: {
    avgSentenceLength: 'Average sentence length',
    passiveVoiceRatio: 'Passive voice ratio',
    connectorFrequency: 'Connector frequency',
    fillerDensity: 'Filler phrase density',
    hedgeDensity: 'Hedge word density',
    typeTokenRatio: 'Vocabulary diversity (TTR)',
    avgWordLength: 'Average word length',
    avgSentencesPerParagraph: 'Sentences per paragraph',
  },
  zh: {
    avgSentenceLength: '平均句长',
    passiveVoiceRatio: '被动语态比例',
    connectorFrequency: '连接词频率',
    fillerDensity: '填充词密度',
    hedgeDensity: '限定词密度',
    typeTokenRatio: '词汇多样性 (TTR)',
    avgWordLength: '平均词长',
    avgSentencesPerParagraph: '每段句数',
  },
};

/** Generate specific suggestions based on deviation findings */
export function generateDeviationSuggestions(
  deviations: DeviationFinding[],
  language: Language,
): Issue[] {
  const isZh = language === 'zh';

  return deviations.map((d) => {
    const label = METRIC_LABELS[language][d.metric];
    const userVal = d.userValue.toFixed(2);
    const refMean = d.referenceRange.mean.toFixed(2);
    const refLower = d.referenceRange.lower.toFixed(2);
    const refUpper = d.referenceRange.upper.toFixed(2);
    const direction = d.level === 'above' ? (isZh ? '偏高' : 'higher') : (isZh ? '偏低' : 'lower');

    const title = isZh
      ? `${label}${direction} (${userVal} vs 参考 ${refMean})`
      : `${label} is ${direction} than reference (${userVal} vs ${refMean})`;

    const description = isZh
      ? `你的文本${label}为 ${userVal}，参考范围为 ${refLower}–${refUpper}。`
      : `Your text's ${label.toLowerCase()} is ${userVal}. Reference range: ${refLower}–${refUpper}.`;

    const suggestion = getSuggestionText(d, language);

    return { severity: d.severity, title, description, suggestion };
  });
}

/** Get metric-specific actionable suggestion */
function getSuggestionText(d: DeviationFinding, language: Language): string {
  const isZh = language === 'zh';

  switch (d.metric) {
    case 'avgSentenceLength':
      return d.level === 'above'
        ? isZh
          ? '尝试拆分长句。复杂想法可以分成2-3个短句表达。'
          : 'Try splitting longer sentences. Complex ideas can be expressed in 2-3 shorter ones.'
        : isZh
          ? '考虑合并一些短句，增加句子复杂度以匹配学术写作风格。'
          : 'Consider combining short sentences to match the academic writing complexity.';

    case 'passiveVoiceRatio':
      return d.level === 'above'
        ? isZh
          ? '减少被动语态。描述你的方法时用主动语态："我们设计了…"而非"…被设计"。'
          : 'Reduce passive voice. Use active voice for your methods: "We designed..." not "...was designed".'
        : isZh
          ? '学术写作中适当使用被动语态是常见的。可以在描述通用结果时使用。'
          : 'Some passive voice is expected in academic writing. Use it when describing general results.';

    case 'connectorFrequency':
      return d.level === 'above'
        ? isZh
          ? '减少连接词使用。如果逻辑关系清晰，不需要额外的"此外"、"另外"。'
          : 'Reduce connector usage. Clear logic doesn\'t need explicit "Furthermore" or "Moreover".'
        : isZh
          ? '适当增加过渡词以改善段落间的衔接。'
          : 'Add some transition words to improve paragraph flow.';

    case 'fillerDensity':
      return d.level === 'above'
        ? isZh
          ? '删除填充短语。直接表达你的观点。'
          : 'Remove filler phrases. State your points directly.'
        : isZh
          ? '你的文本比参考更简洁，这通常是好事。'
          : 'Your text is more concise than references, which is usually positive.';

    case 'hedgeDensity':
      return d.level === 'above'
        ? isZh
          ? '减少模糊限定词。对自己的实验结果要自信。'
          : 'Reduce hedging. Be confident about your experimental results.'
        : isZh
          ? '适当增加限定词以表示谨慎，特别是在推断和泛化时。'
          : 'Add appropriate hedging for claims that extend beyond your data.';

    case 'typeTokenRatio':
      return d.level === 'above'
        ? isZh
          ? '词汇多样性偏高。学术写作中重复使用专业术语是正常的。'
          : 'High vocabulary diversity. In academic writing, repeating technical terms is normal.'
        : isZh
          ? '尝试使用更多样的词汇，避免过度重复。'
          : 'Try using more varied vocabulary to avoid excessive repetition.';

    case 'avgWordLength':
      return d.level === 'above'
        ? isZh
          ? '考虑使用更简洁的表达。长词不一定比短词更学术。'
          : 'Consider simpler word choices. Longer words aren\'t necessarily more academic.'
        : isZh
          ? '可以适当使用专业术语增加词汇长度。'
          : 'Using appropriate technical terminology may increase word length naturally.';

    case 'avgSentencesPerParagraph':
      return d.level === 'above'
        ? isZh
          ? '段落较长。考虑在主题转换处分段。'
          : 'Paragraphs are long. Consider breaking at topic transitions.'
        : isZh
          ? '段落较短。可以合并相关的短段落。'
          : 'Paragraphs are short. Consider merging related short paragraphs.';

    default:
      return isZh ? '请参考目标期刊的写作风格进行调整。' : 'Adjust to match the target venue\'s writing style.';
  }
}
