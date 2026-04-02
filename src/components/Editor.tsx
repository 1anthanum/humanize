import type { Language } from '@/types';
import { t } from '@/i18n';

interface EditorProps {
  text: string;
  language: Language;
  onTextChange: (text: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  onLoadSample: () => void;
}

export function Editor({ text, language, onTextChange, onAnalyze, onClear, onLoadSample }: EditorProps) {
  return (
    <div className="editor">
      <textarea
        className="editor-textarea"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t('placeholder', language)}
        aria-label="Text input"
      />
      <div className="btn-row">
        <button className="btn btn-primary" onClick={onAnalyze}>
          {t('button.analyze', language)}
        </button>
        <button className="btn btn-secondary" onClick={onClear}>
          {t('button.clear', language)}
        </button>
        <button className="btn btn-ghost" onClick={onLoadSample}>
          {t('button.sample', language)}
        </button>
      </div>
    </div>
  );
}
