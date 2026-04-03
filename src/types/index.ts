/** Supported pattern categories */
export type PatternType = 'filler' | 'hedge' | 'connector' | 'template' | 'passive';

/** A single pattern rule definition */
export interface PatternRule {
  re: RegExp;
  tip: string;
}

/** A detected highlight in the analyzed text */
export interface Highlight {
  start: number;
  end: number;
  type: PatternType;
  tip: string;
  text: string;
}

/** A diagnostic issue with severity and suggestion */
export interface Issue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
}

/** Per-category match counts */
export interface PatternCounts {
  filler: number;
  hedge: number;
  connector: number;
  template: number;
  passive: number;
}

/** Text statistics */
export interface TextStatistics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  coefficientOfVariation: number;
  sentenceLengths: number[];
}

/** Complete analysis result */
export interface AnalysisResult {
  highlights: Highlight[];
  issues: Issue[];
  score: number;
  counts: PatternCounts;
  stats: TextStatistics;
}

/** Supported languages */
export type Language = 'en' | 'zh';

/** Pattern set for a language */
export interface PatternSet {
  filler: PatternRule[];
  hedge: PatternRule[];
  connector: PatternRule[];
  template: PatternRule[];
}

// ── Style Profile Types ──────────────────────────────────────────────

/** Histogram bucket for sentence length distribution */
export interface HistogramBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

/** A single style metric with aggregated statistics */
export interface StyleMetric {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  /** Raw sample values (for merging across documents) */
  samples: number[];
}

/** Quantified style profile extracted from reference documents */
export interface StyleProfile {
  avgSentenceLength: StyleMetric;
  passiveVoiceRatio: StyleMetric;
  connectorFrequency: StyleMetric;
  fillerDensity: StyleMetric;
  hedgeDensity: StyleMetric;
  typeTokenRatio: StyleMetric;
  avgWordLength: StyleMetric;
  avgSentencesPerParagraph: StyleMetric;
  /** Number of source documents merged into this profile */
  documentCount: number;
  /** Total word count across all source documents */
  totalWords: number;
}

/** Style metric key names (excludes non-metric fields) */
export type StyleMetricKey = Exclude<keyof StyleProfile, 'documentCount' | 'totalWords'>;

/** Deviation direction relative to reference range */
export type DeviationLevel = 'within' | 'above' | 'below';

/** Severity of a deviation */
export type DeviationSeverity = 'low' | 'medium' | 'high';

/** Result of comparing one user metric against the reference profile */
export interface DeviationFinding {
  metric: StyleMetricKey;
  level: DeviationLevel;
  severity: DeviationSeverity;
  userValue: number;
  referenceRange: { mean: number; lower: number; upper: number };
}

/** Complete style deviation analysis */
export interface StyleDeviationAnalysis {
  deviations: DeviationFinding[];
  suggestions: Issue[];
}
