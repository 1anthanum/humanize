import type { Language, PatternSet } from '@/types';
import { EN_PATTERNS } from './en';
import { ZH_PATTERNS } from './zh';

const PATTERN_MAP: Record<Language, PatternSet> = {
  en: EN_PATTERNS,
  zh: ZH_PATTERNS,
};

export function getPatterns(language: Language): PatternSet {
  return PATTERN_MAP[language];
}

export { EN_PATTERNS, ZH_PATTERNS };
