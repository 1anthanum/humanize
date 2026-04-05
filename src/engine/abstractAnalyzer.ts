/**
 * Abstract structure analysis based on the Swales CARS model.
 *
 * Detects 5 rhetorical moves in academic abstracts:
 *   1. Background — establishes the research territory
 *   2. Gap — identifies the problem or knowledge gap
 *   3. Method — describes the approach or methodology
 *   4. Result — reports findings
 *   5. Impact — states significance, contributions, or future work
 *
 * Works for both English and Chinese academic text.
 */

import type {
  Language,
  AbstractMove,
  AbstractMoveDetection,
  AbstractAnalysis,
} from '@/types';
import { detectSections } from './sectionAnalyzer';
import { splitSentences } from './stats';

// ── Move detection patterns ───────────────────────────────────────────

const ALL_MOVES: AbstractMove[] = ['background', 'gap', 'method', 'result', 'impact'];

interface MovePattern {
  move: AbstractMove;
  re: RegExp;
  weight: number; // base confidence contribution
}

const EN_MOVE_PATTERNS: MovePattern[] = [
  // Background
  { move: 'background', re: /\b(?:recent(?:ly)?|growing|increasing(?:ly)?|important|essential|significant|widespread|emerging|rapid(?:ly)?|crucial|fundamental|extensively|plays?\s+(?:a\s+)?(?:key|crucial|important|vital|critical)\s+role)\b/i, weight: 0.6 },
  { move: 'background', re: /\b(?:has\s+(?:become|been|gained|attracted|received)|have\s+(?:become|been|gained|attracted|received))\b/i, weight: 0.5 },
  { move: 'background', re: /\b(?:in\s+(?:recent\s+years|the\s+past\s+decade|many\s+(?:fields|domains|applications)))\b/i, weight: 0.7 },

  // Gap
  { move: 'gap', re: /\b(?:however|yet|but|although|despite|nonetheless|nevertheless|unfortunately|limited|lack(?:s|ing)?|gap|challenge|problem|difficult(?:y|ies)?|remain(?:s)?|unsolved|unresolved|insufficien(?:t|cy)|few\s+(?:studies|works|methods))\b/i, weight: 0.6 },
  { move: 'gap', re: /\b(?:no\s+(?:existing|prior|previous)|has\s+not\s+been|have\s+not\s+been|poorly\s+understood|little\s+is\s+known|rarely\s+(?:addressed|explored|studied))\b/i, weight: 0.7 },

  // Method
  { move: 'method', re: /\b(?:we\s+(?:propose|present|introduce|develop|design|implement|build|create|employ|adopt|use|leverage|utilize|apply|extend|combine)|this\s+(?:paper|work|study)\s+(?:proposes?|presents?|introduces?|develops?|describes?))\b/i, weight: 0.8 },
  { move: 'method', re: /\b(?:our\s+(?:approach|method|system|framework|technique|model|algorithm|tool|pipeline)|the\s+proposed\s+(?:method|approach|system|framework))\b/i, weight: 0.7 },
  { move: 'method', re: /\b(?:based\s+on|by\s+(?:leveraging|combining|integrating|using)|consists?\s+of|comprises?|incorporat(?:es?|ing))\b/i, weight: 0.4 },

  // Result
  { move: 'result', re: /\b(?:results?\s+(?:show|demonstrate|indicate|suggest|reveal|confirm)|(?:experiments?|evaluation|study|analysis)\s+(?:shows?|demonstrates?|indicates?|reveals?|confirms?))\b/i, weight: 0.8 },
  { move: 'result', re: /\b(?:outperform(?:s|ed|ing)?|improve(?:s|d|ment)?|achiev(?:es?|ed|ing)|(?:\d+%|\d+\.\d+)\s*(?:improvement|increase|decrease|faster|better|higher|lower|accuracy|precision|reduction))\b/i, weight: 0.7 },
  { move: 'result', re: /\b(?:effective(?:ly|ness)?|efficien(?:t|cy)|superior|state-of-the-art|competitive|comparable|promising)\b/i, weight: 0.4 },

  // Impact
  { move: 'impact', re: /\b(?:contribut(?:e|es|ion|ions)|significance|implication(?:s)?|potential(?:ly)?|pave(?:s)?\s+the\s+way|open(?:s)?\s+(?:up|new)|enabl(?:e|es|ing)|empower(?:s|ing)?)\b/i, weight: 0.6 },
  { move: 'impact', re: /\b(?:future\s+(?:work|research|direction|study)|can\s+be\s+(?:applied|extended|used)|we\s+(?:plan|aim|hope|envision|anticipate)|broadly\s+applicable)\b/i, weight: 0.7 },
  { move: 'impact', re: /\b(?:first\s+(?:to|time)|novel\s+(?:contribution|insight)|new\s+(?:insight|perspective|understanding|paradigm))\b/i, weight: 0.6 },
];

const ZH_MOVE_PATTERNS: MovePattern[] = [
  // Background
  { move: 'background', re: /(?:近年来|随着|日益|越来越|广泛|快速发展|重要性|关键|至关重要|不可或缺|在.*?领域|发挥着.*?作用|受到.*?关注)/, weight: 0.6 },

  // Gap
  { move: 'gap', re: /(?:然而|但是|尽管|不足|缺乏|有限|挑战|问题|困难|尚未|仍然|鲜有|较少|不够|亟需|亟待|难以)/, weight: 0.6 },

  // Method
  { move: 'method', re: /(?:我们提出|本文提出|本文设计|本研究|我们开发|我们设计|我们实现|本文介绍|采用|基于|利用|通过.*?方法|构建了|设计了|实现了)/, weight: 0.7 },

  // Result
  { move: 'result', re: /(?:实验(?:结果)?(?:表明|证明|显示|验证)|结果(?:表明|显示|证明)|评估(?:表明|结果)|优于|提升了?|改进了?|提高了?|达到了?|准确率|性能)/, weight: 0.7 },

  // Impact
  { move: 'impact', re: /(?:贡献|意义|启示|潜力|未来|展望|前景|为.*?提供|为.*?奠定|开辟|推动|促进|有望|拓展)/, weight: 0.6 },
];

// ── Position-based confidence boost ───────────────────────────────────

/**
 * Abstracts tend to follow Background → Gap → Method → Result → Impact.
 * Award a small confidence bonus for moves that appear in expected positions.
 */
function positionBoost(move: AbstractMove, relativePosition: number): number {
  const expectedPositions: Record<AbstractMove, [number, number]> = {
    background: [0.0, 0.3],
    gap: [0.1, 0.4],
    method: [0.2, 0.6],
    result: [0.4, 0.8],
    impact: [0.6, 1.0],
  };
  const [lo, hi] = expectedPositions[move];
  if (relativePosition >= lo && relativePosition <= hi) return 0.15;
  return 0;
}

// ── Core analysis ─────────────────────────────────────────────────────

interface SentenceScore {
  move: AbstractMove;
  confidence: number;
}

/**
 * Score a single sentence against all move patterns.
 * Returns the best-matching move (if any) with confidence.
 */
function scoreSentence(
  sentence: string,
  relativePosition: number,
  language: Language,
): SentenceScore | null {
  const patterns = language === 'zh' ? ZH_MOVE_PATTERNS : EN_MOVE_PATTERNS;
  const scores = new Map<AbstractMove, number>();

  for (const pattern of patterns) {
    if (pattern.re.test(sentence)) {
      const current = scores.get(pattern.move) || 0;
      scores.set(pattern.move, current + pattern.weight);
    }
  }

  if (scores.size === 0) return null;

  // Find the move with highest score
  let bestMove: AbstractMove = 'background';
  let bestScore = 0;
  for (const [move, score] of scores.entries()) {
    const boosted = score + positionBoost(move, relativePosition);
    if (boosted > bestScore) {
      bestScore = boosted;
      bestMove = move;
    }
  }

  // Normalize confidence to 0–1 range (cap at 1.0)
  const confidence = Math.min(bestScore, 1.0);
  return { move: bestMove, confidence };
}

/**
 * Extract the abstract text from a full paper.
 *
 * Strategy:
 *   1. Use detectSections() to find an explicit "abstract" section
 *   2. Fallback: use the first substantial paragraph (> 80 chars) if no heading found
 */
export function getAbstractText(fullText: string, language: Language): string | null {
  if (!fullText.trim()) return null;

  const sections = detectSections(fullText, language);
  const abstractSection = sections.find((s) => s.name === 'abstract');
  if (abstractSection && abstractSection.text.trim().length > 30) {
    return abstractSection.text.trim();
  }

  // Fallback: first paragraph longer than 80 chars
  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 80);
  if (paragraphs.length > 0) {
    return paragraphs[0]!.trim();
  }

  return null;
}

/**
 * Analyze the abstract structure of an academic text.
 *
 * Returns detected rhetorical moves with positions, plus a list of missing moves.
 */
export function analyzeAbstract(text: string, language: Language): AbstractAnalysis | null {
  const abstractText = getAbstractText(text, language);
  if (!abstractText) return null;

  const sentences = splitSentences(abstractText, language);
  if (sentences.length === 0) return null;

  const moves: AbstractMoveDetection[] = [];
  let searchPos = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]!;
    const relativePos = sentences.length > 1 ? i / (sentences.length - 1) : 0.5;
    const result = scoreSentence(sentence, relativePos, language);

    // Find character position of this sentence in the abstract text
    const startIdx = abstractText.indexOf(sentence, searchPos);
    const endIdx = startIdx >= 0 ? startIdx + sentence.length : searchPos;
    if (startIdx >= 0) searchPos = endIdx;

    if (result) {
      moves.push({
        move: result.move,
        startIdx: Math.max(0, startIdx),
        endIdx,
        confidence: result.confidence,
        text: sentence,
      });
    }
  }

  // Determine missing moves
  const detectedMoves = new Set(moves.map((m) => m.move));
  const missing = ALL_MOVES.filter((m) => !detectedMoves.has(m));

  return { moves, missing, text: abstractText };
}
