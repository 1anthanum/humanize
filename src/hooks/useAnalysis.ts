import { useState, useCallback } from 'react';
import type { AnalysisResult, Language } from '@/types';
import { analyzeText } from '@/engine/analyzer';

export function useAnalysis() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = useCallback(
    (language: Language) => {
      if (!text.trim()) {
        setResult(null);
        return;
      }
      setResult(analyzeText(text, language));
    },
    [text],
  );

  const clear = useCallback(() => {
    setText('');
    setResult(null);
  }, []);

  return { text, setText, result, analyze, clear };
}
