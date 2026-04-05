import { useState } from 'react';
import type { ParagraphScore, Language } from '@/types';
import { getHeatmapColor, getScoreLabel } from '@/engine/paragraphReadability';
import { t } from '@/i18n';

interface ParagraphHeatmapProps {
  scores: ParagraphScore[];
  language: Language;
}

export function ParagraphHeatmap({ scores, language }: ParagraphHeatmapProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (scores.length === 0) return null;

  return (
    <div className="paragraph-heatmap">
      <h4 className="paragraph-heatmap-title">{t('heatmap.title', language)}</h4>
      <p className="paragraph-heatmap-desc">{t('heatmap.description', language)}</p>

      <div className="paragraph-heatmap-list">
        {scores.map((para) => {
          const color = getHeatmapColor(para.score);
          const label = getScoreLabel(para.score, language);
          const isExpanded = expandedIndex === para.index;
          // Truncate display text for collapsed view
          const displayText = para.text.length > 120 && !isExpanded
            ? para.text.slice(0, 120) + '…'
            : para.text;

          return (
            <div
              key={para.index}
              className={`paragraph-heatmap-item ${isExpanded ? 'expanded' : ''}`}
              style={{ borderLeftColor: color }}
              onClick={() => setExpandedIndex(isExpanded ? null : para.index)}
            >
              <div className="paragraph-heatmap-header">
                <span className="paragraph-heatmap-index">
                  {t('heatmap.paragraph', language)} {para.index + 1}
                </span>
                <span
                  className="paragraph-heatmap-score"
                  style={{ backgroundColor: color }}
                >
                  {para.score} · {label}
                </span>
              </div>

              <div className="paragraph-heatmap-text">{displayText}</div>

              {isExpanded && (
                <div className="paragraph-heatmap-factors">
                  <span>{t('heatmap.sentenceLength', language)}: {para.factors.sentenceLength.toFixed(1)}</span>
                  <span>{t('heatmap.passiveRatio', language)}: {(para.factors.passiveRatio * 100).toFixed(0)}%</span>
                  <span>{t('heatmap.fillerDensity', language)}: {para.factors.fillerDensity.toFixed(1)}‰</span>
                  <span>{t('heatmap.hedgeDensity', language)}: {para.factors.hedgeDensity.toFixed(1)}‰</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
