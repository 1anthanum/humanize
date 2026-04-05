import type { MetricDiff, Language } from '@/types';
import { t } from '@/i18n';

interface StyleDiffTableProps {
  diffs: MetricDiff[];
  language: Language;
}

function formatValue(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.1) return value.toFixed(3);
  if (Math.abs(value) < 10) return value.toFixed(2);
  return value.toFixed(1);
}

function formatDelta(delta: number): string {
  const prefix = delta > 0 ? '+' : '';
  return prefix + formatValue(delta);
}

function DirectionIcon({ direction }: { direction: MetricDiff['direction'] }) {
  switch (direction) {
    case 'improved':
      return <span className="style-diff-icon improved" title="Improved">↑</span>;
    case 'worsened':
      return <span className="style-diff-icon worsened" title="Worsened">↓</span>;
    case 'unchanged':
      return <span className="style-diff-icon unchanged" title="Unchanged">→</span>;
  }
}

export function StyleDiffTable({ diffs, language }: StyleDiffTableProps) {
  if (diffs.length === 0) return null;

  const hasReference = diffs.some((d) => d.referenceValue !== undefined);

  return (
    <div className="style-diff">
      <h4 className="style-diff-title">{t('diff.title', language)}</h4>

      <table className="style-diff-table">
        <thead>
          <tr>
            <th>{t('diff.metric', language)}</th>
            <th>{t('diff.original', language)}</th>
            <th>{t('diff.revised', language)}</th>
            <th>Δ</th>
            <th>{t('diff.direction', language)}</th>
            {hasReference && <th>{t('diff.reference', language)}</th>}
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => (
            <tr key={diff.metric} className={`style-diff-row ${diff.direction}`}>
              <td className="style-diff-label">{diff.label}</td>
              <td className="style-diff-value">{formatValue(diff.originalValue)}</td>
              <td className="style-diff-value">{formatValue(diff.revisedValue)}</td>
              <td className="style-diff-delta">{formatDelta(diff.delta)}</td>
              <td><DirectionIcon direction={diff.direction} /></td>
              {hasReference && (
                <td className="style-diff-ref">
                  {diff.referenceValue !== undefined ? formatValue(diff.referenceValue) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
