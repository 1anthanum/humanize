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
  /** Raw sentence lengths across all source documents (for histogram) */
  sentenceLengths: number[];
  /** Section-level structural profile (optional, null for legacy profiles) */
  sectionProfile?: SectionProfile;
}

/** Style metric key names (excludes non-metric fields) */
export type StyleMetricKey = Exclude<keyof StyleProfile, 'documentCount' | 'totalWords' | 'sentenceLengths' | 'sectionProfile'>;

// ── Section-Level Analysis Types ────────────────────────────────────

/** Canonical academic section names */
export type SectionName =
  | 'introduction'
  | 'related_work'
  | 'method'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'abstract'
  | 'other';

/** Metrics for a single section */
export interface SectionMetrics {
  /** Proportion of total word count (0–1) */
  proportion: number;
  /** Citations per 1000 words */
  citationDensity: number;
  /** First-person pronouns ("we/our/us") per 1000 words */
  firstPersonFrequency: number;
  /** Average sentence length in this section */
  avgSentenceLength: number;
}

/** Aggregated section metrics across multiple documents */
export interface SectionProfileEntry {
  section: SectionName;
  metrics: StyleMetric; // proportion as the primary metric
  citationDensity: StyleMetric;
  firstPersonFrequency: StyleMetric;
  avgSentenceLength: StyleMetric;
}

/** Complete section-level profile */
export interface SectionProfile {
  entries: SectionProfileEntry[];
}

/** Deviation in section structure vs reference */
export interface SectionDeviation {
  section: SectionName;
  metric: 'proportion' | 'citationDensity' | 'firstPersonFrequency' | 'avgSentenceLength';
  severity: DeviationSeverity;
  level: DeviationLevel;
  userValue: number;
  referenceRange: { mean: number; lower: number; upper: number };
}

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

// ── Style Preset Types ──────────────────────────────────────────────

/** A saved style profile preset (e.g., "IEEE VIS 2024") */
export interface StylePreset {
  /** Unique ID (timestamp-based) */
  id: string;
  /** Human-readable name (e.g., "CHI 2024 Best Papers") */
  name: string;
  /** The merged StyleProfile */
  profile: StyleProfile;
  /** Source PDF file names used to build the profile */
  sourceFiles: string[];
  /** ISO date string when preset was created */
  createdAt: string;
}

// ── LLM Integration Types ────────────────────────────────────────────

/** Supported LLM providers */
export type LLMProvider = 'anthropic';

/** LLM configuration stored in localStorage */
export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  /** CORS proxy base URL (e.g., Cloudflare Worker endpoint) */
  proxyUrl: string;
}

/** A rewrite suggestion generated by LLM */
export interface RewriteResult {
  original: string;
  rewritten: string;
  explanation: string;
}

// ── Abstract Structure Types ──────────────────────────────────────────

/** Rhetorical moves in an academic abstract (Swales/CARS model) */
export type AbstractMove = 'background' | 'gap' | 'method' | 'result' | 'impact';

/** A detected move within the abstract text */
export interface AbstractMoveDetection {
  move: AbstractMove;
  /** Character start index within the abstract text */
  startIdx: number;
  /** Character end index within the abstract text */
  endIdx: number;
  /** Detection confidence (0–1) */
  confidence: number;
  /** The matched sentence text */
  text: string;
}

/** Complete abstract structure analysis */
export interface AbstractAnalysis {
  /** Detected rhetorical moves */
  moves: AbstractMoveDetection[];
  /** Moves not found in the abstract */
  missing: AbstractMove[];
  /** The abstract text that was analyzed */
  text: string;
}

// ── Paragraph Readability Types ───────────────────────────────────────

/** Readability score for a single paragraph */
export interface ParagraphScore {
  /** Paragraph index (0-based) */
  index: number;
  /** The paragraph text */
  text: string;
  /** AI-likeness score (0–100, lower = more readable / less AI-like) */
  score: number;
  /** Breakdown of contributing factors */
  factors: {
    sentenceLength: number;
    passiveRatio: number;
    fillerDensity: number;
    hedgeDensity: number;
  };
}

// ── Style Metrics Diff Types ──────────────────────────────────────────

/** Direction of change for a metric between original and revised */
export type MetricDirection = 'improved' | 'worsened' | 'unchanged';

/** Comparison of a single style metric between original and revised text */
export interface MetricDiff {
  /** Style metric key name */
  metric: StyleMetricKey;
  /** Label for display */
  label: string;
  /** Value in the original text */
  originalValue: number;
  /** Value in the revised text */
  revisedValue: number;
  /** Absolute delta (revised - original) */
  delta: number;
  /** Whether the change is an improvement, worsening, or unchanged */
  direction: MetricDirection;
  /** Reference mean value, if a style profile is available */
  referenceValue?: number;
}
