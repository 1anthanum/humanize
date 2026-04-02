import type { Language } from '@/types';
import { t } from '@/i18n';

interface LegendProps {
  language: Language;
}

const LEGEND_ITEMS = [
  { type: 'filler', key: 'legend.filler' },
  { type: 'hedge', key: 'legend.hedge' },
  { type: 'connector', key: 'legend.connector' },
  { type: 'template', key: 'legend.template' },
  { type: 'passive', key: 'legend.passive' },
] as const;

export function Legend({ language }: LegendProps) {
  return (
    <div className="legend">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.type} className="legend-item">
          <div className={`legend-swatch highlight-${item.type}`} />
          <span>{t(item.key, language)}</span>
        </div>
      ))}
    </div>
  );
}
