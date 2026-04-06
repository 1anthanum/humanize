import { useMemo } from 'react';
import type { AbstractAnalysis, AbstractMove, Language } from '@/types';
import { t } from '@/i18n';

interface AbstractStructureViewProps {
  analysis: AbstractAnalysis | null;
  language: Language;
}

const MOVE_COLORS: Record<AbstractMove, string> = {
  background: '#3b82f6', // blue
  gap: '#f59e0b',        // amber
  method: '#8b5cf6',     // violet
  result: '#22c55e',     // green
  impact: '#ec4899',     // pink
};

const MOVE_BG_COLORS: Record<AbstractMove, string> = {
  background: 'rgba(59, 130, 246, 0.12)',
  gap: 'rgba(245, 158, 11, 0.12)',
  method: 'rgba(139, 92, 246, 0.12)',
  result: 'rgba(34, 197, 94, 0.12)',
  impact: 'rgba(236, 72, 153, 0.12)',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function AbstractStructureView({ analysis, language }: AbstractStructureViewProps) {
  const annotatedHtml = useMemo(() => {
    if (!analysis) return '';
    if (analysis.moves.length === 0) return escapeHtml(analysis.text);

    // Sort moves by startIdx
    const sorted = [...analysis.moves].sort((a, b) => a.startIdx - b.startIdx);
    const parts: string[] = [];
    let pos = 0;

    for (const move of sorted) {
      // Text before this move
      if (move.startIdx > pos) {
        parts.push(escapeHtml(analysis.text.slice(pos, move.startIdx)));
      }
      // Highlighted move text
      const color = MOVE_COLORS[move.move];
      const bgColor = MOVE_BG_COLORS[move.move];
      const moveLabel = t(`abstract.move.${move.move}`, language);
      parts.push(
        `<span class="abstract-move" style="border-left: 3px solid ${color}; background: ${bgColor}; padding: 2px 6px; display: inline;" title="${moveLabel}">${escapeHtml(analysis.text.slice(move.startIdx, move.endIdx))}</span>`,
      );
      pos = move.endIdx;
    }

    // Remaining text
    if (pos < analysis.text.length) {
      parts.push(escapeHtml(analysis.text.slice(pos)));
    }

    return parts.join('');
  }, [analysis, language]);

  if (!analysis) return null;

  return (
    <div className="abstract-structure">
      <h4 className="abstract-structure-title">{t('abstract.title', language)}</h4>

      {/* Move legend */}
      <div className="abstract-legend">
        {(['background', 'gap', 'method', 'result', 'impact'] as AbstractMove[]).map((move) => (
          <span key={move} className="abstract-legend-item">
            <span
              className="abstract-legend-dot"
              style={{ backgroundColor: MOVE_COLORS[move] }}
            />
            {t(`abstract.move.${move}`, language)}
          </span>
        ))}
      </div>

      {/* Annotated abstract text */}
      <div
        className="abstract-text"
        dangerouslySetInnerHTML={{ __html: annotatedHtml }}
      />

      {/* Missing moves warning */}
      {analysis.missing.length > 0 && (
        <div className="abstract-missing">
          <strong>{t('abstract.missing', language)}</strong>
          <ul>
            {analysis.missing.map((move) => (
              <li key={move} style={{ color: MOVE_COLORS[move] }}>
                {t(`abstract.move.${move}`, language)} — {t(`abstract.missingTip.${move}`, language)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
