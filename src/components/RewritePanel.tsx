import { useState, useCallback } from 'react';
import type { Language, LLMConfig, DeviationFinding, Highlight, RewriteResult } from '@/types';
import { t } from '@/i18n';
import { requestRewrite } from '@/engine/rewriteSuggestion';

interface RewritePanelProps {
  text: string;
  highlights: Highlight[];
  deviations: DeviationFinding[];
  config: LLMConfig;
  isConfigured: boolean;
  language: Language;
}

export function RewritePanel({
  text,
  highlights,
  deviations,
  config,
  isConfigured,
  language,
}: RewritePanelProps) {
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRewrite = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const rewrite = await requestRewrite(config, text, highlights, deviations, language);
      setResult(rewrite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [config, text, highlights, deviations, language]);

  const handleCopy = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result.rewritten).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback: select text for manual copy
      });
    }
  }, [result]);

  if (!isConfigured) {
    return (
      <div className="rewrite-hint">
        <p>{t('rewrite.configureFirst', language)}</p>
      </div>
    );
  }

  if (highlights.length === 0 && deviations.length === 0) return null;

  return (
    <div className="rewrite-panel">
      <div className="rewrite-header">
        <h3 className="rewrite-title">{t('rewrite.title', language)}</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleRewrite}
          disabled={isLoading}
        >
          {isLoading ? t('rewrite.loading', language) : t('rewrite.button', language)}
        </button>
      </div>

      {error && (
        <div className="style-error">
          {error}
        </div>
      )}

      {result && (
        <div className="rewrite-result">
          <div className="rewrite-section">
            <div className="rewrite-section-label">{t('rewrite.result', language)}</div>
            <div className="rewrite-text">{result.rewritten}</div>
            <button className="btn btn-ghost btn-sm rewrite-copy" onClick={handleCopy}>
              {copied
                ? (language === 'zh' ? '✓ 已复制' : '✓ Copied!')
                : t('rewrite.copy', language)}
            </button>
          </div>

          {result.explanation && (
            <div className="rewrite-explanation">
              <div className="rewrite-section-label">{t('rewrite.explanation', language)}</div>
              <p>{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
