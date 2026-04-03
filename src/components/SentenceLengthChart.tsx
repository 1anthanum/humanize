import type { HistogramBucket, Language } from '@/types';
import { t } from '@/i18n';

interface SentenceLengthChartProps {
  /** Raw sentence lengths from reference profile */
  referenceLengths: number[];
  /** Raw sentence lengths from user's text (optional) */
  userLengths?: number[];
  language: Language;
}

/** Build histogram buckets from raw values */
function buildBuckets(values: number[]): HistogramBucket[] {
  const ranges: [string, number, number][] = [
    ['1–5', 1, 5],
    ['6–10', 6, 10],
    ['11–15', 11, 15],
    ['16–20', 16, 20],
    ['21–25', 21, 25],
    ['26–30', 26, 30],
    ['31–40', 31, 40],
    ['40+', 41, Infinity],
  ];

  return ranges.map(([label, min, max]) => ({
    label,
    min,
    max,
    count: values.filter((v) => v >= min && v <= max).length,
  }));
}

/** Normalize bucket counts to percentages */
function normalize(buckets: HistogramBucket[]): number[] {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return buckets.map(() => 0);
  return buckets.map((b) => (b.count / total) * 100);
}

export function SentenceLengthChart({
  referenceLengths,
  userLengths,
  language,
}: SentenceLengthChartProps) {
  const refBuckets = buildBuckets(referenceLengths);
  const refPcts = normalize(refBuckets);
  const userBuckets = userLengths ? buildBuckets(userLengths) : null;
  const userPcts = userBuckets ? normalize(userBuckets) : null;

  const maxPct = Math.max(...refPcts, ...(userPcts || []), 1);

  return (
    <div className="histogram-container">
      <h4 className="histogram-title">{t('style.histogram.title', language)}</h4>
      <div className="histogram-legend">
        <span className="histogram-legend-item">
          <span className="histogram-dot histogram-dot-ref" />
          {t('style.histogram.reference', language)}
        </span>
        {userPcts && (
          <span className="histogram-legend-item">
            <span className="histogram-dot histogram-dot-user" />
            {t('style.histogram.yours', language)}
          </span>
        )}
      </div>
      <div className="histogram-chart">
        {refBuckets.map((bucket, i) => (
          <div key={bucket.label} className="histogram-col">
            <div className="histogram-bars">
              <div
                className="histogram-bar histogram-bar-ref"
                style={{ height: `${(refPcts[i]! / maxPct) * 100}%` }}
                title={`${refPcts[i]!.toFixed(1)}%`}
              />
              {userPcts && (
                <div
                  className="histogram-bar histogram-bar-user"
                  style={{ height: `${(userPcts[i]! / maxPct) * 100}%` }}
                  title={`${userPcts[i]!.toFixed(1)}%`}
                />
              )}
            </div>
            <span className="histogram-label">{bucket.label}</span>
          </div>
        ))}
      </div>
      <div className="histogram-axis-label">
        {t('style.histogram.axis', language)}
      </div>
    </div>
  );
}
