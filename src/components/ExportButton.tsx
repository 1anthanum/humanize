import { useState, useRef, useEffect } from 'react';
import type { AnalysisResult, Language } from '@/types';
import { t } from '@/i18n';
import { exportAsJSON, exportAsMarkdown } from '@/utils/export';

interface ExportButtonProps {
  result: AnalysisResult;
  text: string;
  language: Language;
}

export function ExportButton({ result, text, language }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="export-wrapper" ref={ref}>
      <button className="btn btn-secondary btn-sm" onClick={() => setOpen(!open)}>
        {t('export.button', language)} ▾
      </button>
      {open && (
        <div className="export-dropdown">
          <button
            className="export-option"
            onClick={() => {
              exportAsJSON(result, text);
              setOpen(false);
            }}
          >
            {t('export.json', language)}
          </button>
          <button
            className="export-option"
            onClick={() => {
              exportAsMarkdown(result, text);
              setOpen(false);
            }}
          >
            {t('export.markdown', language)}
          </button>
        </div>
      )}
    </div>
  );
}
