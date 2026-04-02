import type { PatternCounts, TextStatistics, Language } from '@/types';
import { t } from '@/i18n';

interface StatisticsProps {
  stats: TextStatistics;
  counts: PatternCounts;
  language: Language;
}

export function Statistics({ stats, counts, language }: StatisticsProps) {
  const total = counts.filler + counts.hedge + counts.connector + counts.template + counts.passive;

  return (
    <div className="stats-grid">
      <StatCard value={stats.wordCount} label={t('stats.words', language)} />
      <StatCard value={stats.sentenceCount} label={t('stats.sentences', language)} />
      <StatCard
        value={stats.avgSentenceLength.toFixed(1)}
        label={t('stats.avgLength', language)}
      />
      <StatCard
        value={stats.coefficientOfVariation.toFixed(2)}
        label={t('stats.variation', language)}
        barPercent={Math.min(100, stats.coefficientOfVariation * 200)}
        barColor={
          stats.coefficientOfVariation > 0.35
            ? '#22c55e'
            : stats.coefficientOfVariation > 0.25
              ? '#f59e0b'
              : '#ef4444'
        }
      />
      <StatCard
        value={total}
        label={t('stats.totalMarkers', language)}
        barPercent={Math.min(100, total * 5)}
        barColor={total < 5 ? '#22c55e' : total < 10 ? '#f59e0b' : '#ef4444'}
      />
      <StatCard
        value={`${counts.filler}F · ${counts.hedge}H · ${counts.connector}C · ${counts.template}T · ${counts.passive}P`}
        label={t('stats.breakdown', language)}
        smallValue
      />
    </div>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  barPercent?: number;
  barColor?: string;
  smallValue?: boolean;
}

function StatCard({ value, label, barPercent, barColor, smallValue }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${smallValue ? 'stat-value-sm' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {barPercent !== undefined && barColor && (
        <div className="stat-bar">
          <div
            className="stat-bar-fill"
            style={{ width: `${barPercent}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  );
}
