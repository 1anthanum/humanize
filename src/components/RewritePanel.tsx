import { useState, useCallback } from 'react';
import type { Language, LLMConfig, DeviationFinding, Highlight, RewriteResult } from '@/types';
import { t } from '@/i18n';
import { requestRewrite } from '@/engine/rewriteSuggestion';

/** Fallback copy for contexts where navigator.clipboard is unavailable (HTTP, iframes) */
function execCommandCopy(text: string) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch {
    // Last resort — user saw "Copied!" but clipboard may not have updated
  }
}

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
    if (!result) return;
    // Show visual feedback immediately — don't gate on clipboard API success
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Attempt clipboard write; fall back to execCommand for HTTP / iframe contexts
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(result.rewritten).catch(() => {
          execCommandCopy(result.rewritten);
        });
      } else {
        execCommandCopy(result.rewritten);
      }
    } catch {
      execCommandCopy(result.rewritten);
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
