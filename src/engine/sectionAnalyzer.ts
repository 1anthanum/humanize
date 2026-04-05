/**
 * Section-level structural analysis for academic papers.
 *
 * Detects standard sections (Introduction, Related Work, Method, Results,
 * Discussion, Conclusion), then computes per-section metrics:
 *   - proportional length (% of total words)
 *   - citation density (cites per 1000 words)
 *   - first-person pronoun frequency (per 1000 words)
 *   - average sentence length
 *
 * Works for both English and Chinese academic text.
 */

import type {
  Language,
  SectionName,
  SectionMetrics,
  SectionProfile,
  SectionProfileEntry,
  SectionDeviation,
  StyleMetric,
  DeviationSeverity,
  DeviationLevel,
} from '@/types';

// ── Section heading detection ──────────────────────────────────────

interface DetectedSection {
  name: SectionName;
  startIndex: number;
  text: string;
}

/**
 * Patterns to identify section headings.
 * Each maps to a canonical SectionName.
 * Order matters — first match wins.
 */
const EN_SECTION_PATTERNS: [RegExp, SectionName][] = [
  [/\b(?:abstract)\b/i, 'abstract'],
  [/\b(?:introduction|1\s*\.?\s*introduction)\b/i, 'introduction'],
  [/\b(?:related\s+work|background|literature\s+review|prior\s+work|2\s*\.?\s*related\s+work|2\s*\.?\s*background)\b/i, 'related_work'],
  [/\b(?:method(?:s|ology)?|approach|design|system|technique|framework|implementation|3\s*\.?\s*method|4\s*\.?\s*method)\b/i, 'method'],
  [/\b(?:result(?:s)?|evaluation|experiment(?:s)?|findings|analysis|study|user\s+study)\b/i, 'results'],
  [/\b(?:discussion|implications|limitations)\b/i, 'discussion'],
  [/\b(?:conclusion(?:s)?|summary|future\s+work|concluding\s+remarks)\b/i, 'conclusion'],
];

const ZH_SECTION_PATTERNS: [RegExp, SectionName][] = [
  [/摘要/, 'abstract'],
  [/(?:引言|绪论|背景介绍)/, 'introduction'],
  [/(?:相关工作|文献综述|研究现状)/, 'related_work'],
  [/(?:方法|系统设计|模型|算法|技术方案|框架)/, 'method'],
  [/(?:实验|结果|评估|用户研究|分析)/, 'results'],
  [/(?:讨论|局限|启示)/, 'discussion'],
  [/(?:结论|总结|未来工作|展望)/, 'conclusion'],
];

/**
 * Matches a line against known section heading patterns.
 * Returns the canonical section name or null.
 */
function matchSectionHeading(line: string, language: Language): SectionName | null {
  const patterns = language === 'zh' ? ZH_SECTION_PATTERNS : EN_SECTION_PATTERNS;
  const trimmed = line.trim();

  // Heuristic: section headings are typically short (< 80 chars)
  if (trimmed.length > 80 || trimmed.length < 2) return null;

  for (const [re, name] of patterns) {
    if (re.test(trimmed)) return name;
  }
  return null;
}

/**
 * Detects a line as a likely section heading based on formatting cues:
 *   - Starts with a number (e.g., "1.", "2.1", "III.")
 *   - ALL CAPS
 *   - Short line followed by newline (standalone heading)
 */
function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;

  // Numbered heading: "1.", "2.1", "3 ", "IV."
  if (/^\d+(\.\d+)*\.?\s/.test(trimmed)) return true;
  if (/^[IVXLC]+\.?\s/.test(trimmed)) return true;

  // ALL CAPS heading (English)
  if (/^[A-Z\s\d.:&-]{4,}$/.test(trimmed) && trimmed === trimmed.toUpperCase()) return true;

  return false;
}

/**
 * Heuristic: a line that ends with sentence-ending punctuation is content,
 * not a section heading — even if it happens to contain a keyword.
 */
function looksLikeSentence(line: string): boolean {
  const trimmed = line.trim();
  // Ends with sentence-ending punctuation (EN or ZH)
  return /[.!?。！？；]$/.test(trimmed);
}

/**
 * Split text into sections by detecting section headings.
 * Returns array of { name, startIndex, text } for each section.
 */
export function detectSections(text: string, language: Language): DetectedSection[] {
  if (!text.trim()) return [];
  const lines = text.split('\n');
  const sections: DetectedSection[] = [];
  let currentSection: SectionName = 'other';
  let currentStart = 0;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isHeadingFormat = looksLikeHeading(line);
    const sectionName = matchSectionHeading(line, language);

    if (sectionName && (isHeadingFormat || (line.trim().length < 60 && !looksLikeSentence(line)))) {
      // Flush previous section
      if (currentLines.length > 0) {
        sections.push({
          name: currentSection,
          startIndex: currentStart,
          text: currentLines.join('\n'),
        });
      }
      currentSection = sectionName;
      currentStart = i;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush last section
  if (currentLines.length > 0) {
    sections.push({
      name: currentSection,
      startIndex: currentStart,
      text: currentLines.join('\n'),
    });
  }

  return sections;
}

// ── Per-section metric computation ─────────────────────────────────

/** Count citation markers in text: [1], [1,2], (Author 2024), (Author et al., 2024) */
function countCitations(text: string): number {
  const bracketCites = text.match(/\[\d+(?:\s*[,;–-]\s*\d+)*\]/g) || [];
  const parenCites = text.match(/\([A-Z][a-z]+(?:\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-z]+)?\s*,?\s*\d{4}\)/g) || [];
  return bracketCites.length + parenCites.length;
}

/** Count first-person pronouns */
function countFirstPerson(text: string, language: Language): number {
  if (language === 'zh') {
    return (text.match(/我们/g) || []).length;
  }
  return (text.match(/\b(?:we|our|us)\b/gi) || []).length;
}

/** Count words in text */
function countWords(text: string, language: Language): number {
  if (language === 'zh') {
    return [...text.replace(/\s/g, '')].filter(Boolean).length;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/** Count sentences in text */
function countSentences(text: string, language: Language): number {
  if (language === 'zh') {
    return text.split(/[。！？；]+/).filter((s) => s.trim()).length;
  }
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim()).length;
}

/**
 * Compute metrics for a single section of text.
 */
export function computeSectionMetrics(
  sectionText: string,
  totalWords: number,
  language: Language,
): SectionMetrics {
  const words = countWords(sectionText, language);
  const sentences = countSentences(sectionText, language);
  const citations = countCitations(sectionText);
  const firstPerson = countFirstPerson(sectionText, language);

  return {
    proportion: totalWords > 0 ? words / totalWords : 0,
    citationDensity: words > 0 ? (citations / words) * 1000 : 0,
    firstPersonFrequency: words > 0 ? (firstPerson / words) * 1000 : 0,
    avgSentenceLength: sentences > 0 ? words / sentences : 0,
  };
}

// ── Full section analysis ──────────────────────────────────────────

/** Result of analyzing one document's sections */
export interface DocumentSectionAnalysis {
  sections: { name: SectionName; metrics: SectionMetrics }[];
}

/**
 * Analyze section structure of a single document.
 */
export function analyzeSections(text: string, language: Language): DocumentSectionAnalysis {
  const detected = detectSections(text, language);
  const totalWords = countWords(text, language);

  const sections = detected
    .filter((s) => s.text.trim().length > 50) // skip very short fragments
    .map((s) => ({
      name: s.name,
      metrics: computeSectionMetrics(s.text, totalWords, language),
    }));

  return { sections };
}

// ── Profile aggregation ────────────────────────────────────────────

function computeStyleMetric(values: number[]): StyleMetric {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, samples: values };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return {
    mean,
    stdDev: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
    samples: values,
  };
}

/**
 * Aggregate section analyses from multiple documents into a SectionProfile.
 */
export function buildSectionProfile(analyses: DocumentSectionAnalysis[]): SectionProfile {
  // Collect metrics per canonical section across all documents
  const sectionData = new Map<SectionName, {
    proportions: number[];
    citationDensities: number[];
    firstPersonFreqs: number[];
    avgSentenceLengths: number[];
  }>();

  const ALL_SECTIONS: SectionName[] = [
    'abstract', 'introduction', 'related_work', 'method',
    'results', 'discussion', 'conclusion',
  ];

  for (const section of ALL_SECTIONS) {
    sectionData.set(section, {
      proportions: [],
      citationDensities: [],
      firstPersonFreqs: [],
      avgSentenceLengths: [],
    });
  }

  for (const analysis of analyses) {
    // For each document, aggregate sections (a document might have multiple
    // sections mapping to the same canonical name — e.g., "4.1 Study 1" and
    // "4.2 Study 2" both map to "results")
    const docSections = new Map<SectionName, SectionMetrics[]>();

    for (const s of analysis.sections) {
      if (!ALL_SECTIONS.includes(s.name)) continue;
      if (!docSections.has(s.name)) docSections.set(s.name, []);
      docSections.get(s.name)!.push(s.metrics);
    }

    for (const [name, metricsList] of docSections.entries()) {
      const data = sectionData.get(name);
      if (!data) continue;

      // Sum proportions (if multiple subsections), average the rest
      const totalProportion = metricsList.reduce((a, m) => a + m.proportion, 0);
      const avgCitation = metricsList.reduce((a, m) => a + m.citationDensity, 0) / metricsList.length;
      const avgFirstPerson = metricsList.reduce((a, m) => a + m.firstPersonFrequency, 0) / metricsList.length;
      const avgSentLen = metricsList.reduce((a, m) => a + m.avgSentenceLength, 0) / metricsList.length;

      data.proportions.push(totalProportion);
      data.citationDensities.push(avgCitation);
      data.firstPersonFreqs.push(avgFirstPerson);
      data.avgSentenceLengths.push(avgSentLen);
    }
  }

  const entries: SectionProfileEntry[] = [];
  for (const section of ALL_SECTIONS) {
    const data = sectionData.get(section)!;
    // Only include sections that appeared in at least one document
    if (data.proportions.length === 0) continue;
    entries.push({
      section,
      metrics: computeStyleMetric(data.proportions),
      citationDensity: computeStyleMetric(data.citationDensities),
      firstPersonFrequency: computeStyleMetric(data.firstPersonFreqs),
      avgSentenceLength: computeStyleMetric(data.avgSentenceLengths),
    });
  }

  return { entries };
}

// ── Deviation comparison ───────────────────────────────────────────

const MIN_STD_DEVS: Record<string, number> = {
  proportion: 0.03,        // 3% of total
  citationDensity: 2,      // 2 cites per 1000 words
  firstPersonFrequency: 1, // 1 per 1000 words
  avgSentenceLength: 3,    // 3 words
};

/**
 * Compare user's section structure against a reference SectionProfile.
 */
export function compareSections(
  userAnalysis: DocumentSectionAnalysis,
  referenceProfile: SectionProfile,
): SectionDeviation[] {
  const deviations: SectionDeviation[] = [];

  // Build user section map (sum proportions for duplicate canonical names)
  const userMap = new Map<SectionName, SectionMetrics>();
  for (const s of userAnalysis.sections) {
    if (userMap.has(s.name)) {
      const existing = userMap.get(s.name)!;
      userMap.set(s.name, {
        proportion: existing.proportion + s.metrics.proportion,
        citationDensity: (existing.citationDensity + s.metrics.citationDensity) / 2,
        firstPersonFrequency: (existing.firstPersonFrequency + s.metrics.firstPersonFrequency) / 2,
        avgSentenceLength: (existing.avgSentenceLength + s.metrics.avgSentenceLength) / 2,
      });
    } else {
      userMap.set(s.name, { ...s.metrics });
    }
  }

  const metricFields: (keyof SectionMetrics)[] = [
    'proportion', 'citationDensity', 'firstPersonFrequency', 'avgSentenceLength',
  ];

  for (const entry of referenceProfile.entries) {
    const userMetrics = userMap.get(entry.section);
    if (!userMetrics) {
      // User is missing this section entirely — flag as deviation
      deviations.push({
        section: entry.section,
        metric: 'proportion',
        severity: entry.metrics.mean > 0.05 ? 'high' : 'medium',
        level: 'below',
        userValue: 0,
        referenceRange: {
          mean: entry.metrics.mean,
          lower: Math.max(0, entry.metrics.mean - effectiveStdDev(entry.metrics.stdDev, 'proportion')),
          upper: entry.metrics.mean + effectiveStdDev(entry.metrics.stdDev, 'proportion'),
        },
      });
      continue;
    }

    for (const field of metricFields) {
      const refMetric = getRefMetric(entry, field);
      const userValue = userMetrics[field];
      const stdDev = effectiveStdDev(refMetric.stdDev, field);
      const lower = refMetric.mean - stdDev;
      const upper = refMetric.mean + stdDev;

      if (userValue >= lower && userValue <= upper) continue;

      const level: DeviationLevel = userValue > upper ? 'above' : 'below';
      const distance = userValue > upper
        ? (userValue - upper) / stdDev
        : (lower - userValue) / stdDev;
      const severity: DeviationSeverity = distance > 2 ? 'high' : distance > 1 ? 'medium' : 'low';

      deviations.push({
        section: entry.section,
        metric: field as SectionDeviation['metric'],
        severity,
        level,
        userValue,
        referenceRange: { mean: refMetric.mean, lower: Math.max(0, lower), upper },
      });
    }
  }

  return deviations;
}

function getRefMetric(entry: SectionProfileEntry, field: keyof SectionMetrics): StyleMetric {
  switch (field) {
    case 'proportion': return entry.metrics;
    case 'citationDensity': return entry.citationDensity;
    case 'firstPersonFrequency': return entry.firstPersonFrequency;
    case 'avgSentenceLength': return entry.avgSentenceLength;
  }
}

function effectiveStdDev(stdDev: number, metric: string): number {
  const minStd = MIN_STD_DEVS[metric] ?? 0.01;
  return Math.max(stdDev, minStd);
}
