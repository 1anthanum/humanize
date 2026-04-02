import { getScoreColor } from '@/engine/scoring';
import type { Language } from '@/types';
import { t } from '@/i18n';

interface ScoreBarProps {
  score: number;
  language: Language;
}

export function ScoreBar({ score, language }: ScoreBarProps) {
  const color = getScoreColor(score);

  // Use localized labels
  const labelKey =
    score < 25 ? 'score.human' : score < 50 ? 'score.some' : score < 75 ? 'score.notable' : 'score.strong';

  return (
    <div className="score-bar">
      <span className="score-bar-label">{t('score.label', language)}</span>
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${score}%`, background: color }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="score-value" style={{ color }}>
        {score}
      </span>
      <span className="score-desc">{t(labelKey, language)}</span>
    </div>
  );
}
