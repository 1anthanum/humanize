import { useState, useCallback, useMemo } from 'react';
import type { AnalysisResult, Language, StyleProfile, MetricDiff } from '@/types';
import { analyzeText } from '@/engine/analyzer';
import { getScoreColor } from '@/engine/scoring';
import { computeStyleDiff } from '@/engine/styleMetricsDiff';
import { t } from '@/i18n';
import { AnnotatedText } from './AnnotatedText';
import { Legend } from './Legend';
import { StyleDiffTable } from './StyleDiffTable';

interface ComparisonViewProps {
  originalText: string;
  originalResult: AnalysisResult;
  language: Language;
  referenceProfile?: StyleProfile;
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  return (
    <div className="comparison-score">
      <span className="comparison-score-value" style={{ color: getScoreColor(score) }}>
        {score}
      </span>
      <span className="comparison-score-label">{label}</span>
    </div>
  );
}

function PatternSummary({ result, language }: { result: AnalysisResult; language: Language }) {
  const c = result.counts;
  const labels = language === 'zh'
    ? { f: '填充', h: '限定', c: '衔接', t: '模板', p: '被动' }
    : { f: 'F', h: 'H', c: 'C', t: 'T', p: 'P' };
  return (
    <div className="comparison-patterns">
      {c.filler}{labels.f} · {c.hedge}{labels.h} · {c.connector}{labels.c} · {c.template}{labels.t} · {c.passive}{labels.p}
    </div>
  );
}

export function ComparisonView({ originalText, originalResult, language, referenceProfile }: ComparisonViewProps) {
  const [revisedText, setRevisedText] = useState('');
  const [revisedResult, setRevisedResult] = useState<AnalysisResult | null>(null);

  const analyzeRevised = useCallback(() => {
    if (!revisedText.trim()) {
      setRevisedResult(null);
      return;
    }
    setRevisedResult(analyzeText(revisedText, language));
  }, [revisedText, language]);

  const delta = revisedResult ? revisedResult.score - originalResult.score : null;

  // Compute style metrics diff when both texts are analyzed
  const styleDiffs = useMemo<MetricDiff[]>(() => {
    if (!revisedResult || !revisedText.trim()) return [];
    return computeStyleDiff(originalText, revisedText, language, referenceProfile);
  }, [originalText, revisedText, revisedResult, language, referenceProfile]);

  return (
    <div className="comparison">
      {/* Delta summary */}
      {revisedResult && delta !== null && (
        <div className="comparison-delta">
          <span className="comparison-delta-label">{t('comparison.delta', language)}</span>
          <span
            className="comparison-delta-value"
            style={{ color: delta < 0 ? '#22c55e' : delta > 0 ? '#ef4444' : '#78716c' }}
          >
            {originalResult.score} → {revisedResult.score}
            {delta !== 0 && ` (${delta > 0 ? '+' : ''}${delta})`}
          </span>
        </div>
      )}

      <Legend language={language} />

      <div className="comparison-columns">
        {/* Original column */}
        <div className="comparison-col">
          <div className="comparison-col-header">
            <h3>{t('comparison.original', language)}</h3>
            <ScoreBadge score={originalResult.score} label={t('score.label', language)} />
          </div>
          <PatternSummary result={originalResult} language={language} />
          <AnnotatedText text={originalText} highlights={originalResult.highlights} />
        </div>

        {/* Revised column */}
        <div className="comparison-col">
          <div className="comparison-col-header">
            <h3>{t('comparison.revised', language)}</h3>
            {revisedResult && (
              <ScoreBadge score={revisedResult.score} label={t('score.label', language)} />
            )}
          </div>

          {!revisedResult ? (
            <div className="comparison-input">
              <textarea
                className="editor-textarea"
                value={revisedText}
                onChange={(e) => setRevisedText(e.target.value)}
                placeholder={t('comparison.placeholder', language)}
              />
              <button className="btn btn-primary" onClick={analyzeRevised} style={{ marginTop: '0.5rem' }}>
                {t('comparison.analyze', language)}
              </button>
            </div>
          ) : (
            <>
              <PatternSummary result={revisedResult} language={language} />
              <AnnotatedText text={revisedText} highlights={revisedResult.highlights} />
              <button
                className="btn btn-ghost"
                onClick={() => setRevisedResult(null)}
                style={{ marginTop: '0.5rem' }}
              >
                {t('comparison.edit', language)}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Style metrics diff table */}
      {styleDiffs.length > 0 && (
        <StyleDiffTable diffs={styleDiffs} language={language} />
      )}
    </div>
  );
}
