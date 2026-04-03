import { useState, useRef, useCallback } from 'react';
import type { Language } from '@/types';
import { t } from '@/i18n';

interface PDFUploaderProps {
  language: Language;
  isProcessing: boolean;
  onUpload: (files: File[]) => void;
}

export function PDFUploader({ language, isProcessing, onUpload }: PDFUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      );
      if (files.length > 0) onUpload(files);
    },
    [onUpload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onUpload(files);
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = '';
    },
    [onUpload],
  );

  return (
    <div
      className={`pdf-upload ${isDragOver ? 'pdf-upload-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="pdf-upload-input"
        onChange={handleFileChange}
      />
      {isProcessing ? (
        <div className="pdf-upload-processing">
          <span className="pdf-upload-spinner" />
          <span>{t('style.upload.processing', language)}</span>
        </div>
      ) : (
        <div className="pdf-upload-prompt">
          <span className="pdf-upload-icon">📄</span>
          <span className="pdf-upload-text">{t('style.upload.prompt', language)}</span>
          <span className="pdf-upload-hint">{t('style.upload.hint', language)}</span>
        </div>
      )}
    </div>
  );
}
