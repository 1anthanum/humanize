import type { Language } from '@/types';
import en from './en.json';
import zh from './zh.json';

const messages: Record<Language, Record<string, string>> = { en, zh };

export function t(key: string, language: Language): string {
  return messages[language]?.[key] ?? key;
}
