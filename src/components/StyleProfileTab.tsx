import type { Language, AnalysisResult, StyleProfile, StyleDeviationAnalysis } from '@/types';
import { t } from '@/i18n';
import { PDFUploader } from './PDFUploader';
import { ProfileSummary } from './ProfileSummary';
import { StyleDeviationView } from './StyleDeviationView';

interface StyleProfileTabProps {
  language: Language;
  /** Merged reference profile (null if no PDFs uploaded) */
  mergedProfile: StyleProfile | null;
  /** Metadata for uploaded PDFs */
  uploadedPDFs: { name: string; wordCount: number }[];
  /** Whether PDFs are being processed */
  isProcessing: boolean;
  /** Error from PDF processing */
  error: string | null;
  /** Callbacks */
  onUpload: (files: File[]) => void;
  onRemovePDF: (index: number) => void;
  onClear: () => void;
  /** Current user analysis (null if text not yet analyzed) */
  userResult: AnalysisResult | null;
  /** Style deviation analysis (null if not computed yet) */
  styleDeviations: StyleDeviationAnalysis | null;
}

export function StyleProfileTab({
  language,
  mergedProfile,
  uploadedPDFs,
  isProcessing,
  error,
  onUpload,
  onRemovePDF,
  onClear,
  userResult,
  styleDeviations,
}: StyleProfileTabProps) {
  return (
    <div className="style-profile-tab">
      {/* Upload section — always visible so user can add more PDFs */}
      <PDFUploader language={language} isProcessing={isProcessing} onUpload={onUpload} />

      {/* Error display */}
      {error && (
        <div className="style-error">
          {error.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Profile summary — shown when at least one PDF is processed */}
      {mergedProfile && (
        <ProfileSummary
          profile={mergedProfile}
          language={language}
          uploadedPDFs={uploadedPDFs}
          onRemovePDF={onRemovePDF}
          onClear={onClear}
        />
      )}

      {/* Deviation diagnostics — shown when both profile and user analysis exist */}
      {mergedProfile && userResult && styleDeviations && (
        <StyleDeviationView analysis={styleDeviations} language={language} />
      )}

      {/* Hint when profile exists but no user text analyzed */}
      {mergedProfile && !userResult && (
        <div className="style-hint">
          <p>{t('style.hint.analyzeFirst', language)}</p>
        </div>
      )}
    </div>
  );
}
