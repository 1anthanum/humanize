import { useMemo } from 'react';
import type { Language, SectionProfile, SectionDeviation, SectionName } from '@/types';
import { t } from '@/i18n';
import { detectSections } from '@/engine/sectionAnalyzer';
import { extractKeywords, buildSemanticScholarUrl } from '@/utils/keywordExtractor';

interface SectionAnalysisViewProps {
  referenceProfile: SectionProfile;
  deviations: SectionDeviation[];
  language: Language;
  /** User's full text — used to extract keywords for search links */
  userText?: string;
}

const SECTION_LABELS: Record<Language, Record<SectionName, string>> = {
  en: {
    abstract: 'Abstract',
    introduction: 'Introduction',
    related_work: 'Related Work',
    method: 'Method',
    results: 'Results',
    discussion: 'Discussion',
    conclusion: 'Conclusion',
    other: 'Other',
  },
  zh: {
    abstract: '摘要',
    introduction: '引言',
    related_work: '相关工作',
    method: '方法',
    results: '实验/结果',
    discussion: '讨论',
    conclusion: '结论',
    other: '其他',
  },
};

const METRIC_LABELS: Record<Language, Record<SectionDeviation['metric'], string>> = {
  en: {
    proportion: 'Length',
    citationDensity: 'Citations',
    firstPersonFrequency: 'First person',
    avgSentenceLength: 'Sentence length',
  },
  zh: {
    proportion: '篇幅',
    citationDensity: '引用密度',
    firstPersonFrequency: '第一人称',
    avgSentenceLength: '句长',
  },
};

function formatValue(metric: SectionDeviation['metric'], value: number): string {
  if (metric === 'proportion') return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(1);
}

function formatRange(metric: SectionDeviation['metric'], mean: number, lower: number, upper: number): string {
  if (metric === 'proportion') {
    return `${(mean * 100).toFixed(1)}% (${(lower * 100).toFixed(1)}–${(upper * 100).toFixed(1)}%)`;
  }
  return `${mean.toFixed(1)} (${lower.toFixed(1)}–${upper.toFixed(1)})`;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

export function SectionAnalysisView({
  referenceProfile,
  deviations,
  language,
  userText,
}: SectionAnalysisViewProps) {
  const sectionOrder: SectionName[] = [
    'abstract', 'introduction', 'related_work', 'method',
    'results', 'discussion', 'conclusion',
  ];

  const significantDeviations = deviations.filter((d) => d.severity !== 'low');

  // Pre-compute search URLs for citation density deviations
  const searchUrls = useMemo(() => {
    if (!userText) return new Map<string, string>();
    const urls = new Map<string, string>();

    const citationDevs = significantDeviations.filter((d) => d.metric === 'citationDensity');
    if (citationDevs.length === 0) return urls;

    // Detect sections to get per-section text
    const detected = detectSections(userText, language);
    const sectionTextMap = new Map<SectionName, string>();
    for (const s of detected) {
      sectionTextMap.set(s.name, (sectionTextMap.get(s.name) || '') + '\n' + s.text);
    }

    for (const dev of citationDevs) {
      const sectionText = sectionTextMap.get(dev.section);
      if (!sectionText) continue;
      const keywords = extractKeywords(sectionText, language, 5);
      if (keywords.length === 0) continue;
      const key = `${dev.section}:${dev.metric}`;
      urls.set(key, buildSemanticScholarUrl(keywords));
    }

    return urls;
  }, [userText, language, significantDeviations]);

  return (
    <div className="section-analysis">
      <h3 className="section-analysis-title">{t('section.title', language)}</h3>

      {/* Reference structure bar chart */}
      <div className="section-bar-chart">
        <p className="section-bar-label">{t('section.referenceStructure', language)}</p>
        <div className="section-bars">
          {referenceProfile.entries
            .filter((e) => sectionOrder.includes(e.section))
            .sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section))
            .map((entry) => {
              const pct = entry.metrics.mean * 100;
              if (pct < 1) return null;
              return (
                <div
                  key={entry.section}
                  className="section-bar-segment"
                  style={{ flex: pct }}
                  title={`${SECTION_LABELS[language][entry.section]}: ${pct.toFixed(1)}%`}
                >
                  <span className="section-bar-text">
                    {pct > 5 ? SECTION_LABELS[language][entry.section] : ''}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Deviation table */}
      {significantDeviations.length > 0 ? (
        <div className="section-deviation-list">
          <p className="section-deviation-subtitle">{t('section.deviations', language)}</p>
          <div className="deviation-table-wrap">
            <table className="deviation-table">
              <thead>
                <tr>
                  <th>{t('section.col.section', language)}</th>
                  <th>{t('section.col.metric', language)}</th>
                  <th>{t('section.col.yours', language)}</th>
                  <th>{t('section.col.reference', language)}</th>
                  <th>{t('section.col.severity', language)}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {significantDeviations.map((d, i) => {
                  const searchKey = `${d.section}:${d.metric}`;
                  const url = searchUrls.get(searchKey);
                  return (
                    <tr key={i} className="deviation-row">
                      <td className="deviation-metric">
                        {SECTION_LABELS[language][d.section]}
                      </td>
                      <td>{METRIC_LABELS[language][d.metric]}</td>
                      <td className="deviation-user">
                        {formatValue(d.metric, d.userValue)}
                      </td>
                      <td className="deviation-ref">
                        {formatRange(d.metric, d.referenceRange.mean, d.referenceRange.lower, d.referenceRange.upper)}
                      </td>
                      <td>
                        <span
                          className="deviation-badge"
                          style={{ backgroundColor: SEVERITY_COLORS[d.severity] }}
                        >
                          {d.severity}
                        </span>
                      </td>
                      <td>
                        {url && (
                          <a
                            className="section-search-link"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t('section.searchTooltip', language)}
                          >
                            {t('section.searchLink', language)}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="deviation-empty">
          <h3>{t('section.noDeviations.title', language)}</h3>
          <p>{t('section.noDeviations.desc', language)}</p>
        </div>
      )}
    </div>
  );
}
