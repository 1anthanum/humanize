import type { Language, StyleDeviationAnalysis, DeviationFinding, StyleMetricKey } from '@/types';
import { t } from '@/i18n';

interface StyleDeviationViewProps {
  analysis: StyleDeviationAnalysis;
  language: Language;
}

/** Color per severity level */
function severityColor(severity: 'high' | 'medium' | 'low'): string {
  switch (severity) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#22c55e';
  }
}

/** Format metric value for display */
function formatVal(key: StyleMetricKey, value: number): string {
  if (key === 'passiveVoiceRatio' || key === 'typeTokenRatio') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(1);
}

function DeviationRow({ d, language }: { d: DeviationFinding; language: Language }) {
  const levelIcon = d.level === 'above' ? '↑' : '↓';
  const color = severityColor(d.severity);

  return (
    <tr className={`deviation-row deviation-${d.severity}`}>
      <td className="deviation-metric">{t(`style.metric.${d.metric}`, language)}</td>
      <td className="deviation-user" style={{ color }}>
        {formatVal(d.metric, d.userValue)} {levelIcon}
      </td>
      <td className="deviation-ref">
        {formatVal(d.metric, d.referenceRange.mean)}{' '}
        <span className="deviation-ref-range">
          ({formatVal(d.metric, d.referenceRange.lower)}–
          {formatVal(d.metric, d.referenceRange.upper)})
        </span>
      </td>
      <td className="deviation-severity">
        <span className="deviation-badge" style={{ backgroundColor: color }}>
          {d.severity}
        </span>
      </td>
    </tr>
  );
}

export function StyleDeviationView({ analysis, language }: StyleDeviationViewProps) {
  const { deviations, suggestions } = analysis;

  if (deviations.length === 0) {
    return (
      <div className="deviation-empty">
        <h3>{t('style.deviation.none.title', language)}</h3>
        <p>{t('style.deviation.none.desc', language)}</p>
      </div>
    );
  }

  return (
    <div className="deviation-container">
      <h3 className="deviation-title">{t('style.deviation.title', language)}</h3>

      {/* Deviation table */}
      <div className="deviation-table-wrap">
        <table className="deviation-table">
          <thead>
            <tr>
              <th>{t('style.deviation.col.metric', language)}</th>
              <th>{t('style.deviation.col.yours', language)}</th>
              <th>{t('style.deviation.col.reference', language)}</th>
              <th>{t('style.deviation.col.severity', language)}</th>
            </tr>
          </thead>
          <tbody>
            {deviations.map((d, i) => (
              <DeviationRow key={i} d={d} language={language} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="deviation-suggestions">
          <h3 className="deviation-suggestions-title">
            {t('style.deviation.suggestions', language)}
          </h3>
          {suggestions.map((issue, i) => (
            <div key={i} className={`issue-card issue-${issue.severity}`}>
              <div className="issue-title">{issue.title}</div>
              <div className="issue-desc">{issue.description}</div>
              <div className="issue-suggestion">{issue.suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
