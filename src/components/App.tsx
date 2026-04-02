import { useState, useCallback } from 'react';
import type { Language } from '@/types';
import { t } from '@/i18n';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Editor } from './Editor';
import { ScoreBar } from './ScoreBar';
import { Legend } from './Legend';
import { AnnotatedText } from './AnnotatedText';
import { IssuesList } from './IssuesList';
import { Statistics } from './Statistics';
import { LanguageSwitch } from './LanguageSwitch';

type Tab = 'annotated' | 'issues' | 'stats';

const SAMPLE_EN = `In today's rapidly evolving landscape of data visualization, it is worth noting that the field has gained significant traction in recent years. Furthermore, interactive visualization plays a crucial role in enabling users to explore complex datasets. Moreover, our approach leverages cutting-edge techniques to foster a more holistic understanding of the data.

This paper presents a novel visualization framework that seamlessly integrates multiple coordinated views. The results demonstrate that participants generally found the system intuitive and easy to use. Additionally, the findings suggest that our method could potentially bridge the gap between novice and expert users.

Consequently, our work paves the way for future research in this domain. The proposed system was designed to be robust and transformative. It should be noted that further studies are needed to validate these findings. To some extent, the evaluation was somewhat limited by the relatively small sample size. Nonetheless, we believe this contribution sheds new light on the challenges of visual analytics.

In conclusion, this study aims to empower stakeholders by providing a groundbreaking tool for navigating the complexities of modern data analysis. Future work should explore additional use cases and leverage emerging technologies to enhance the overall user experience. Please do not hesitate to reach out if you have any questions regarding this research.`;

const SAMPLE_ZH = `在当今快速发展的时代，数据可视化领域发挥着至关重要的作用。值得注意的是，众所周知，该领域已经受到了广泛的关注。此外，丰富的研究表明交互式可视化具有不可或缺的价值。

本文旨在探讨一种新的可视化框架。实验结果表明，该系统在一定程度上填补了该领域的空白。与此同时，我们的方法被广泛认为是相对有效的。不仅如此，该框架为后续研究提供了新的思路。

综上所述，本研究在某种意义上为相关领域的发展赋能。总而言之，未来研究可以进一步探索更多的应用场景，进而推动整个生态系统的数字化转型。`;

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<Tab>('annotated');
  const { text, setText, result, analyze, clear } = useAnalysis();

  const handleAnalyze = useCallback(() => {
    analyze(language);
  }, [analyze, language]);

  const handleLoadSample = useCallback(() => {
    setText(language === 'zh' ? SAMPLE_ZH : SAMPLE_EN);
  }, [language, setText]);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      // Re-analyze if there's existing text
      if (result && text.trim()) {
        // Small delay to let state update
        setTimeout(() => analyze(lang), 0);
      }
    },
    [result, text, analyze],
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

      {result && (
        <div className="results">
          <ScoreBar score={result.score} language={language} />

          <div className="tabs" role="tablist">
            {(['annotated', 'issues', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {t(`tab.${tab}`, language)}
              </button>
            ))}
          </div>

          {activeTab === 'annotated' && (
            <div role="tabpanel">
              <Legend language={language} />
              <AnnotatedText text={text} highlights={result.highlights} />
            </div>
          )}

          {activeTab === 'issues' && (
            <div role="tabpanel">
              <IssuesList issues={result.issues} language={language} />
            </div>
          )}

          {activeTab === 'stats' && (
            <div role="tabpanel">
              <Statistics stats={result.stats} counts={result.counts} language={language} />
            </div>
          )}
        </div>
      )}

      <footer className="footer-note">{t('footer', language)}</footer>
    </div>
  );
}
