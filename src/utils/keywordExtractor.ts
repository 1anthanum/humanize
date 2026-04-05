/**
 * Lightweight keyword extraction for building search queries.
 * No external dependencies — uses stop-word filtering + frequency ranking.
 */

import type { Language } from '@/types';

const EN_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'we', 'our', 'us', 'they', 'their',
  'them', 'he', 'she', 'his', 'her', 'i', 'my', 'me', 'you', 'your',
  'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'also', 'such',
  'which', 'who', 'whom', 'how', 'what', 'when', 'where', 'why',
  'each', 'every', 'all', 'both', 'few', 'more', 'most', 'some',
  'any', 'other', 'new', 'one', 'two', 'three', 'first', 'well',
  'about', 'over', 'after', 'before', 'between', 'through', 'during',
  'into', 'up', 'out', 'above', 'below', 'same', 'different', 'very',
  'just', 'only', 'even', 'still', 'already', 'however', 'et', 'al',
  'figure', 'fig', 'table', 'section', 'paper', 'study', 'work',
  'approach', 'method', 'result', 'show', 'using', 'based', 'use',
  'used', 'propose', 'proposed', 'present', 'presented', 'provide',
]);

const ZH_STOP_WORDS = new Set([
  '的', '了', '在', '是', '和', '与', '或', '但', '而', '对', '从',
  '以', '为', '将', '被', '把', '到', '不', '有', '也', '都', '就',
  '中', '上', '下', '等', '如', '所', '这', '那', '其', '该', '可',
  '我们', '本文', '通过', '进行', '使用', '基于', '方法', '结果',
  '研究', '提出', '分析', '实验', '表明', '图', '表',
]);

/**
 * Extract top-N keywords from text for search query building.
 * Returns an array of keywords sorted by frequency.
 */
export function extractKeywords(text: string, language: Language, topN = 5): string[] {
  if (language === 'zh') {
    return extractZhKeywords(text, topN);
  }
  return extractEnKeywords(text, topN);
}

function extractEnKeywords(text: string, topN: number): string[] {
  // Tokenize: only keep alphabetical words ≥ 3 chars
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  const freq = new Map<string, number>();

  for (const word of words) {
    if (EN_STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function extractZhKeywords(text: string, topN: number): string[] {
  // Simple bigram extraction for Chinese (no segmentation library)
  const chars = [...text.replace(/[\s\d\w.,;:!?。，；：！？""''（）[\]{}《》\-—·…]+/g, '')];
  const freq = new Map<string, number>();

  for (let i = 0; i < chars.length - 1; i++) {
    const bigram = chars[i]! + chars[i + 1]!;
    if (ZH_STOP_WORDS.has(bigram)) continue;
    freq.set(bigram, (freq.get(bigram) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([bigram]) => bigram);
}

/**
 * Build a Semantic Scholar search URL from keywords.
 */
export function buildSemanticScholarUrl(keywords: string[]): string {
  const query = keywords.join(' ');
  return `https://www.semanticscholar.org/search?q=${encodeURIComponent(query)}&sort=relevance`;
}
