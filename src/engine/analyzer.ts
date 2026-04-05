import type {
  AnalysisResult,
  Highlight,
  Issue,
  Language,
  PatternCounts,
  PatternRule,
  PatternType,
} from '@/types';
import { getPatterns } from './patterns';
import { computeStats } from './stats';
import { calculateScore } from './scoring';

/** Passive voice regex for English */
const PASSIVE_RE =
  /\b(?:is|are|was|were|been|be|being) (?:\w+ly )?(?:\w+ed|made|given|shown|taken|seen|found|known|done|built|set|put|held|kept|left|run|said|told|called|used|considered|expected|designed|proposed|implemented|evaluated|conducted|performed|analyzed|observed|demonstrated|presented|described|developed|created|generated|produced|identified|classified|applied|compared|obtained|achieved|measured|collected|selected|combined|defined|determined|provided|required|based|associated|related|involved|included|represented|composed|comprised)\b/gi;

/** Chinese passive constructions */
const ZH_PASSIVE_RE = /被(?:广泛|普遍|认为|视为|用于|证明|发现|观察|设计|提出)/g;

/**
 * Sequential enumeration markers at sentence/paragraph starts.
 * Matches: "First, ... Second, ... Third, ..." etc.
 * Allows variable whitespace after sentence boundaries (handles copy-paste artifacts).
 * Only flagged when 3+ sequential markers appear in the text.
 */
const ENUM_MARKERS_EN =
  /(?:^|(?<=\.)\s*|(?<=\n)\s*)(?:First(?:ly)?|Second(?:ly)?|Third(?:ly)?|Fourth(?:ly)?|Fifth(?:ly)?|Finally|Lastly|In addition),/gm;

/** Chinese sequential enumeration markers */
const ENUM_MARKERS_ZH =
  /(?:^|(?<=[。\n])\s*)(?:首先|其次|第三|第四|最后|此外)[，,]/gm;

/**
 * Find all matches for a set of pattern rules in the text.
 */
function findMatches(text: string, rules: PatternRule[], type: PatternType): Highlight[] {
  const highlights: Highlight[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, rule.re.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      highlights.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
        tip: rule.tip,
        text: match[0],
      });
    }
  }
  return highlights;
}

/**
 * Find passive voice constructions.
 */
function findPassive(text: string, language: Language): Highlight[] {
  const re = language === 'zh' ? new RegExp(ZH_PASSIVE_RE.source, ZH_PASSIVE_RE.flags) : new RegExp(PASSIVE_RE.source, PASSIVE_RE.flags);
  const tip =
    language === 'zh'
      ? '被动语态——考虑用主动语态增强表达力'
      : 'Passive voice — consider active voice for clarity and directness';
  const highlights: Highlight[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    highlights.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'passive',
      tip,
      text: match[0],
    });
  }
  return highlights;
}

/**
 * Detect sequential enumeration patterns (e.g., "First, ... Second, ... Third, ...").
 * Only flags when 3+ sequential markers are found — a strong structural AI signal.
 */
function findEnumeration(text: string, language: Language): Highlight[] {
  const re = language === 'zh'
    ? new RegExp(ENUM_MARKERS_ZH.source, ENUM_MARKERS_ZH.flags)
    : new RegExp(ENUM_MARKERS_EN.source, ENUM_MARKERS_EN.flags);

  const tip = language === 'zh'
    ? '序列枚举模式（首先…其次…最后…）——AI典型的列举结构，考虑用段落自然衔接替代'
    : 'Sequential enumeration pattern (First… Second… Third…) — a strong AI structural signal. Consider flowing prose instead of a numbered list.';

  const matches: Highlight[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    // Trim leading whitespace so highlight covers only the keyword
    const raw = match[0];
    const trimmed = raw.replace(/^\s+/, '');
    const trimOffset = raw.length - trimmed.length;
    matches.push({
      start: match.index + trimOffset,
      end: match.index + raw.length,
      type: 'connector',
      tip,
      text: trimmed,
    });
  }

  // Only flag if 3+ sequential markers found — pattern, not individual words
  return matches.length >= 3 ? matches : [];
}

/**
 * Remove overlapping highlights, keeping the longer match.
 * Input must be sorted by start position.
 */
export function resolveOverlaps(highlights: Highlight[]): Highlight[] {
  const sorted = [...highlights].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: Highlight[] = [];
  let lastEnd = -1;
  for (const h of sorted) {
    if (h.start >= lastEnd) {
      result.push(h);
      lastEnd = h.end;
    }
  }
  return result;
}

/**
 * Count highlights by pattern type.
 */
function countByType(highlights: Highlight[]): PatternCounts {
  const counts: PatternCounts = { filler: 0, hedge: 0, connector: 0, template: 0, passive: 0 };
  for (const h of highlights) {
    counts[h.type]++;
  }
  return counts;
}

/**
 * Generate diagnostic issues based on detected patterns and stats.
 */
function generateIssues(
  counts: PatternCounts,
  stats: ReturnType<typeof computeStats>,
  language: Language,
): Issue[] {
  const issues: Issue[] = [];
  const isZh = language === 'zh';

  if (counts.filler > 0) {
    issues.push({
      severity: counts.filler > 4 ? 'high' : counts.filler > 2 ? 'medium' : 'low',
      title: isZh
        ? `检测到 ${counts.filler} 处废话/填充词`
        : `${counts.filler} filler phrase${counts.filler > 1 ? 's' : ''} detected`,
      description: isZh
        ? '填充词增加字数但不增加信息量，让文本显得空洞、不够真诚。'
        : 'Filler phrases add words without adding meaning. They make text feel padded and impersonal.',
      suggestion: isZh
        ? '删除每个填充词，检查句子是否仍然成立。通常是可以的。'
        : 'Delete each filler phrase and check if the sentence still works. Usually it does.',
    });
  }

  if (counts.hedge > 0) {
    issues.push({
      severity: counts.hedge > 3 ? 'high' : counts.hedge > 1 ? 'medium' : 'low',
      title: isZh
        ? `检测到 ${counts.hedge} 处模糊限定`
        : `${counts.hedge} hedge expression${counts.hedge > 1 ? 's' : ''} detected`,
      description: isZh
        ? '过度限定让你显得对自己的工作不够确信。在学术写作中，这会削弱你的贡献。'
        : 'Excessive hedging makes you sound uncertain about your own work.',
      suggestion: isZh
        ? '只在真正存在不确定性的地方保留限定词。对自己的实验结果要自信。'
        : 'Keep hedges only where genuine uncertainty exists. For your own results, commit to your findings.',
    });
  }

  if (counts.connector > 3) {
    issues.push({
      severity: counts.connector > 6 ? 'high' : 'medium',
      title: isZh
        ? `${counts.connector} 个正式连接词——密度偏高`
        : `${counts.connector} formal connectors — high density`,
      description: isZh
        ? 'AI文本使用"此外"、"与此同时"、"不仅如此"等连接词的频率远高于人类写作。这是最强的AI信号之一。'
        : 'AI text uses connectors like "Furthermore", "Moreover" at a much higher rate than human writing.',
      suggestion: isZh
        ? '删除大部分连接词。如果句子之间的逻辑关系清晰，不需要额外的路标。'
        : 'Remove most connectors. If the logic is clear, you don\'t need an explicit signpost.',
    });
  }

  if (counts.passive > 3 && stats.sentenceCount > 0 && counts.passive / stats.sentenceCount > 0.3) {
    issues.push({
      severity: 'medium',
      title: isZh
        ? `被动语态使用率偏高 (${Math.round((counts.passive / stats.sentenceCount) * 100)}%)`
        : `High passive voice usage (${Math.round((counts.passive / stats.sentenceCount) * 100)}% of sentences)`,
      description: isZh
        ? '学术写作中适量被动语态是正常的，但过多会造成距离感，模糊行为主体。'
        : 'Some passive voice is normal in academic writing, but excessive use creates distance.',
      suggestion: isZh
        ? '描述你自己的方法和决策时，用主动语态："我们选择X是因为……"而非"X被选择……"'
        : 'For your own methods, use active voice: "We chose X because..." rather than "X was chosen..."',
    });
  }

  if (stats.coefficientOfVariation < 0.3 && stats.sentenceCount > 3) {
    issues.push({
      severity: 'medium',
      title: isZh
        ? '句子长度过于均匀'
        : 'Very uniform sentence length',
      description: isZh
        ? `你的句子平均 ${stats.avgSentenceLength.toFixed(1)} 个词，变异系数很低 (${stats.coefficientOfVariation.toFixed(2)})。人类写作通常有更多的长短句交替。`
        : `Sentences average ${stats.avgSentenceLength.toFixed(1)} words with low variation (CV: ${stats.coefficientOfVariation.toFixed(2)}).`,
      suggestion: isZh
        ? '混合使用长句和短句。复杂句之后跟一个简短的判断句，创造节奏感。'
        : 'Mix short punchy sentences with longer ones. After a complex sentence, try a short declarative one.',
    });
  }

  if (counts.template > 0) {
    issues.push({
      severity: counts.template > 3 ? 'high' : 'medium',
      title: isZh
        ? `${counts.template} 处模板化表达`
        : `${counts.template} template expression${counts.template > 1 ? 's' : ''}`,
      description: isZh
        ? '这些是AI频繁使用的学术套话。单独出现不是问题，但聚集在一起会让文本显得公式化。'
        : 'These are stock academic phrases that AI uses very frequently.',
      suggestion: isZh
        ? '用具体陈述替换。不要说"结果表明X"，而说"X提升了23% (p<0.01)，说明……"'
        : 'Replace with specific statements. Instead of "The results demonstrate X", try leading with the actual finding.',
    });
  }

  return issues;
}

/**
 * Analyze text for AI-typical patterns.
 * This is the main entry point of the engine.
 */
export function analyzeText(text: string, language: Language = 'en'): AnalysisResult {
  if (!text.trim()) {
    return {
      highlights: [],
      issues: [],
      score: 0,
      counts: { filler: 0, hedge: 0, connector: 0, template: 0, passive: 0 },
      stats: {
        wordCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        avgSentenceLength: 0,
        coefficientOfVariation: 0,
        sentenceLengths: [],
      },
    };
  }

  const patterns = getPatterns(language);

  // First pass: strong patterns (always flagged)
  const strongHighlights: Highlight[] = [
    ...findMatches(text, patterns.filler, 'filler'),
    ...findMatches(text, patterns.hedge, 'hedge'),
    ...findMatches(text, patterns.connector, 'connector'),
    ...findMatches(text, patterns.template, 'template'),
    ...findPassive(text, language),
    ...findEnumeration(text, language),
  ];

  // Second pass: soft fillers only included when 2+ strong signals exist
  const softMatches = findMatches(text, patterns.softFiller, 'filler');
  const allHighlights = strongHighlights.length >= 2
    ? [...strongHighlights, ...softMatches]
    : strongHighlights;

  // Resolve overlapping highlights
  const highlights = resolveOverlaps(allHighlights);

  // Count by type
  const counts = countByType(highlights);

  // Compute text statistics
  const stats = computeStats(text, language);

  // Calculate score
  const score = calculateScore(counts, stats, highlights.length);

  // Generate issues
  const issues = generateIssues(counts, stats, language);

  return { highlights, issues, score, counts, stats };
}
