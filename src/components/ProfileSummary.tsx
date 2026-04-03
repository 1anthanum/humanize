import type { Language, StyleProfile, StyleMetricKey } from '@/types';
import { t } from '@/i18n';

interface ProfileSummaryProps {
  profile: StyleProfile;
  language: Language;
  uploadedPDFs: { name: string; wordCount: number }[];
  onRemovePDF: (index: number) => void;
  onClear: () => void;
}

const METRIC_KEYS: StyleMetricKey[] = [
  'avgSentenceLength',
  'passiveVoiceRatio',
  'connectorFrequency',
  'fillerDensity',
  'hedgeDensity',
  'typeTokenRatio',
  'avgWordLength',
  'avgSentencesPerParagraph',
];

/** Format metric values for display — ratios as %, others as decimals */
function formatValue(key: StyleMetricKey, value: number): string {
  if (key === 'passiveVoiceRatio' || key === 'typeTokenRatio') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(1);
}

export function ProfileSummary({
  profile,
  language,
  uploadedPDFs,
  onRemovePDF,
  onClear,
}: ProfileSummaryProps) {
  return (
    <div className="profile-summary">
      {/* Uploaded files list */}
      <div className="profile-files">
        <div className="profile-files-header">
          <span className="profile-files-title">
            {t('style.profile.documents', language)} ({profile.documentCount})
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            {t('style.profile.clear', language)}
          </button>
        </div>
        <ul className="profile-files-list">
          {uploadedPDFs.map((pdf, i) => (
            <li key={i} className="profile-file-item">
              <span className="profile-file-name">📄 {pdf.name}</span>
              <span className="profile-file-words">
                {pdf.wordCount.toLocaleString()} {t('stats.words', language).toLowerCase()}
              </span>
              <button
                className="profile-file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePDF(i);
                }}
                aria-label={`Remove ${pdf.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Metrics grid */}
      <div className="profile-metrics-grid">
        {METRIC_KEYS.map((key) => {
          const metric = profile[key];
          return (
            <div key={key} className="profile-metric-card">
              <span className="profile-metric-label">{t(`style.metric.${key}`, language)}</span>
              <span className="profile-metric-value">{formatValue(key, metric.mean)}</span>
              <span className="profile-metric-range">
                ± {formatValue(key, metric.stdDev)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
