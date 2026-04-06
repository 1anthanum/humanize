import { useMemo, useState } from 'react';
import type { Language, AnalysisResult, StyleProfile, StyleDeviationAnalysis, LLMConfig, StylePreset } from '@/types';
import type { SectionDeviation } from '@/types';
import { t } from '@/i18n';
import { PDFUploader } from './PDFUploader';
import { ProfileSummary } from './ProfileSummary';
import { StyleDeviationView } from './StyleDeviationView';
import { SentenceLengthChart } from './SentenceLengthChart';
import { SettingsPanel } from './SettingsPanel';
import { RewritePanel } from './RewritePanel';
import { PresetSelector } from './PresetSelector';
import { SectionAnalysisView } from './SectionAnalysisView';
import { AbstractStructureView } from './AbstractStructureView';
import { analyzeSections, compareSections } from '@/engine/sectionAnalyzer';
import { analyzeAbstract } from '@/engine/abstractAnalyzer';

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
  /** LLM configuration */
  llmConfig: LLMConfig;
  onLLMConfigUpdate: (updates: Partial<LLMConfig>) => void;
  isLLMConfigured: boolean;
  /** User text for rewrite */
  text: string;
  /** Preset support */
  onLoadPreset: (preset: StylePreset) => void;
  activePresetName: string | null;
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
  llmConfig,
  onLLMConfigUpdate,
  isLLMConfigured,
  text,
  onLoadPreset,
  activePresetName,
}: StyleProfileTabProps) {
  const [refExpanded, setRefExpanded] = useState(true);

  // Compute section-level deviations when both reference and user data exist
  const sectionDeviations = useMemo<SectionDeviation[]>(() => {
    if (!mergedProfile?.sectionProfile || !userResult || !text) return [];
    try {
      const userSections = analyzeSections(text, language);
      return compareSections(userSections, mergedProfile.sectionProfile);
    } catch {
      return [];
    }
  }, [mergedProfile, userResult, text, language]);

  // Compute abstract structure analysis
  const abstractAnalysis = useMemo(() => {
    if (!text || !userResult) return null;
    try {
      return analyzeAbstract(text, language);
    } catch {
      return null;
    }
  }, [text, userResult, language]);

  // Whether reference diagnostics section has content to show
  const hasRefContent = !!mergedProfile;

  return (
    <div className="style-profile-tab">
      {/* Preset selector — load/save style profiles */}
      <PresetSelector
        language={language}
        currentProfile={mergedProfile}
        currentFiles={uploadedPDFs.map((p) => p.name)}
        onLoadPreset={onLoadPreset}
      />

      {/* Active preset indicator */}
      {activePresetName && (
        <div className="preset-active-badge">
          {t('preset.active', language)}: <strong>{activePresetName}</strong>
        </div>
      )}

      {/* ── LLM Rewrite section — placed at top for immediate access ── */}
      {userResult && userResult.highlights.length > 0 && (
        <div className="rewrite-section-wrapper">
          <SettingsPanel
            config={llmConfig}
            onUpdate={onLLMConfigUpdate}
            language={language}
          />
          <RewritePanel
            text={text}
            highlights={userResult.highlights}
            deviations={styleDeviations?.deviations ?? []}
            config={llmConfig}
            isConfigured={isLLMConfigured}
            language={language}
          />
        </div>
      )}

      {/* ── Reference Profile Section (collapsible) ── */}
      {hasRefContent && (
        <div className="ref-section">
          <button
            className="ref-section-toggle"
            onClick={() => setRefExpanded(!refExpanded)}
            aria-expanded={refExpanded}
          >
            <span className="ref-section-arrow">{refExpanded ? '▼' : '▶'}</span>
            <span className="ref-section-label">
              {language === 'zh' ? '参考文献分析' : 'Reference Analysis'}
            </span>
            {!refExpanded && mergedProfile && (
              <span className="ref-section-summary">
                {mergedProfile.documentCount} {language === 'zh' ? '篇' : 'docs'} · {mergedProfile.totalWords.toLocaleString()} {language === 'zh' ? '词' : 'words'}
              </span>
            )}
          </button>

          {refExpanded && (
            <div className="ref-section-content">
              {/* Upload section */}
              <PDFUploader language={language} isProcessing={isProcessing} onUpload={onUpload} />

              {/* Error display */}
              {error && (
                <div className="style-error">
                  {error.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              {/* Profile summary */}
              {mergedProfile && (
                <ProfileSummary
                  profile={mergedProfile}
                  language={language}
                  uploadedPDFs={uploadedPDFs}
                  onRemovePDF={onRemovePDF}
                  onClear={onClear}
                />
              )}

              {/* Sentence length histogram */}
              {mergedProfile && mergedProfile.sentenceLengths.length > 0 && (
                <SentenceLengthChart
                  referenceLengths={mergedProfile.sentenceLengths}
                  userLengths={userResult?.stats.sentenceLengths}
                  language={language}
                />
              )}

              {/* Deviation diagnostics */}
              {mergedProfile && userResult && styleDeviations && (
                <StyleDeviationView analysis={styleDeviations} language={language} />
              )}

              {/* Section-level structural analysis */}
              {mergedProfile?.sectionProfile && userResult && (
                <SectionAnalysisView
                  referenceProfile={mergedProfile.sectionProfile}
                  deviations={sectionDeviations}
                  language={language}
                  userText={text}
                />
              )}

              {/* Abstract structure diagnosis */}
              {userResult && abstractAnalysis && (
                <AbstractStructureView analysis={abstractAnalysis} language={language} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload section when no profile exists yet */}
      {!hasRefContent && (
        <PDFUploader language={language} isProcessing={isProcessing} onUpload={onUpload} />
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
