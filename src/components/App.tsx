import { useState, useCallback, useMemo } from 'react';
import type { Language, StyleDeviationAnalysis } from '@/types';
import { t } from '@/i18n';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useStyleProfile } from '@/hooks/useStyleProfile';
import { useLLMConfig } from '@/hooks/useLLMConfig';
import { compareToProfile } from '@/engine/styleProfiler';
import { Editor } from './Editor';
import { ScoreBar } from './ScoreBar';
import { Legend } from './Legend';
import { AnnotatedText } from './AnnotatedText';
import { IssuesList } from './IssuesList';
import { Statistics } from './Statistics';
import { LanguageSwitch } from './LanguageSwitch';
import { ExportButton } from './ExportButton';
import { ComparisonView } from './ComparisonView';
import { StyleProfileTab } from './StyleProfileTab';

type Tab = 'annotated' | 'issues' | 'stats' | 'comparison' | 'style';

const SAMPLE_EN = `In today's rapidly evolving landscape of data visualization, it is worth noting that the field has gained significant traction in recent years. Furthermore, interactive visualization plays a crucial role in enabling users to explore complex datasets. Moreover, our approach leverages cutting-edge techniques to foster a more holistic understanding of the data.

This paper presents a novel visualization framework that seamlessly integrates multiple coordinated views. The results demonstrate that participants generally found the system intuitive and easy to use. Additionally, the findings suggest that our method could potentially bridge the gap between novice and expert users.

Consequently, our work paves the way for future research in this domain. The proposed system was designed to be robust and transformative. It should be noted that further studies are needed to validate these findings. To some extent, the evaluation was somewhat limited by the relatively small sample size. Nonetheless, we believe this contribution sheds new light on the challenges of visual analytics.

In conclusion, this study aims to empower stakeholders by providing a groundbreaking tool for navigating the complexities of modern data analysis. Future work should explore additional use cases and leverage emerging technologies to enhance the overall user experience. Please do not hesitate to reach out if you have any questions regarding this research.`;

const SAMPLE_ZH = `在当今快速发展的时代，数据可视化领域发挥着至关重要的作用。值得注意的是，众所周知，该领域已经受到了广泛的关注。此外，丰富的研究表明交互式可视化具有不可或缺的价值。

本文旨在探讨一种新的可视化框架。实验结果表明，该系统在一定程度上填补了该领域的空白。与此同时，我们的方法被广泛认为是相对有效的。不仅如此，该框架为后续研究提供了新的思路。

综上所述，本研究在某种意义上为相关领域的发展赋能。总而言之，未来研究可以进一步探索更多的应用场景，进而推动整个生态系统的数字化转型。`;

const TAB_LIST: Tab[] = ['annotated', 'issues', 'stats', 'comparison', 'style'];

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<Tab>('annotated');
  const { text, setText, result, analyze, clear } = useAnalysis();
  const {
    uploadedPDFs,
    mergedProfile,
    isProcessing: isProfileProcessing,
    error: profileError,
    addPDFs,
    removePDF,
    clearProfiles,
    hasProfile,
  } = useStyleProfile();
  const { config: llmConfig, setConfig: setLLMConfig, isConfigured: isLLMConfigured } = useLLMConfig();

  // Compute style deviations when both profile and result exist
  const styleDeviations = useMemo<StyleDeviationAnalysis | null>(() => {
    if (!mergedProfile || !result || !text.trim()) return null;
    return compareToProfile(text, mergedProfile, language);
  }, [mergedProfile, result, text, language]);

  const handleAnalyze = useCallback(() => {
    analyze(language);
  }, [analyze, language]);

  const handleLoadSample = useCallback(() => {
    setText(language === 'zh' ? SAMPLE_ZH : SAMPLE_EN);
  }, [language, setText]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      if (result && text.trim()) {
        setTimeout(() => analyze(lang), 0);
      }
    },
    [result, text, analyze],
  );

  const handlePDFUpload = useCallback(
    (files: File[]) => {
      addPDFs(files, language);
    },
    [addPDFs, language],
  );

  const handleRemovePDF = useCallback(
    (index: number) => {
      removePDF(index);
    },
    [removePDF],
  );

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>{t('title', language)}</h1>
          <p className="subtitle">{t('subtitle', language)}</p>
        </div>
        <LanguageSwitch language={language} onLanguageChange={handleLanguageChange} />
      </header>

      <Editor
        text={text}
        language={language}
        onTextChange={setText}
        onAnalyze={handleAnalyze}
        onClear={clear}
        onLoadSample={handleLoadSample}
      />

      {(result || hasProfile) && (
        <div className="results">
          {result && (
            <div className="results-header">
              <ScoreBar score={result.score} language={language} />
              <ExportButton result={result} text={text} language={language} />
            </div>
          )}

          <div className="tabs" role="tablist">
            {TAB_LIST.map((tab) => {
              // Non-style tabs require analysis result
              const disabled = tab !== 'style' && !result;
              return (
                <button
                  key={tab}
                  className={`tab ${activeTab === tab ? 'tab-active' : ''} ${disabled ? 'tab-disabled' : ''}`}
                  onClick={() => !disabled && setActiveTab(tab)}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-disabled={disabled}
                >
                  {t(`tab.${tab}`, language)}
                </button>
              );
            })}
          </div>

          {activeTab === 'annotated' && result && (
            <div role="tabpanel">
              <Legend language={language} />
              <AnnotatedText text={text} highlights={result.highlights} />
            </div>
          )}

          {activeTab === 'issues' && result && (
            <div role="tabpanel">
              <IssuesList issues={result.issues} language={language} />
            </div>
          )}

          {activeTab === 'stats' && result && (
            <div role="tabpanel">
              <Statistics stats={result.stats} counts={result.counts} language={language} />
            </div>
          )}

          {activeTab === 'comparison' && result && (
            <div role="tabpanel">
              <ComparisonView
                originalText={text}
                originalResult={result}
                language={language}
              />
            </div>
          )}

          {activeTab === 'style' && (
            <div role="tabpanel">
              <StyleProfileTab
                language={language}
                mergedProfile={mergedProfile}
                uploadedPDFs={uploadedPDFs}
                isProcessing={isProfileProcessing}
                error={profileError}
                onUpload={handlePDFUpload}
                onRemovePDF={handleRemovePDF}
                onClear={clearProfiles}
                userResult={result}
                styleDeviations={styleDeviations}
                llmConfig={llmConfig}
                onLLMConfigUpdate={setLLMConfig}
                isLLMConfigured={isLLMConfigured}
                text={text}
              />
            </div>
          )}
        </div>
      )}

      <footer className="footer-note">{t('footer', language)}</footer>
    </div>
  );
}
