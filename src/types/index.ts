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
