import { useState, useCallback } from 'react';
import type { LLMConfig } from '@/types';

const STORAGE_KEY = 'humanize_llm_config';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  proxyUrl: '',
};

function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<LLMConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: LLMConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable
  }
}

export function useLLMConfig() {
  const [config, setConfigState] = useState<LLMConfig>(loadConfig);

  const setConfig = useCallback((updates: Partial<LLMConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  // Only proxyUrl is required — public mode works without apiKey
  const isConfigured = config.proxyUrl.length > 0;

  return { config, setConfig, isConfigured };
}
