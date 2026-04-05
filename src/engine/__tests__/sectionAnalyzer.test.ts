import { describe, it, expect } from 'vitest';
import {
  detectSections,
  computeSectionMetrics,
  analyzeSections,
  buildSectionProfile,
  compareSections,
} from '../sectionAnalyzer';

// ── Sample texts ──────────────────────────────────────────────────

const SAMPLE_PAPER_EN = `
1. Introduction
Data visualization has become essential for exploring complex datasets.
We propose a novel framework for interactive visual analytics.
Our approach builds on prior work in information visualization [1] [2].

2. Related Work
Several studies have addressed the challenge of scalable visualization [3].
Smith et al. (2022) introduced a multi-scale rendering technique [4].
Jones and Lee (2021) proposed a hybrid layout algorithm [5] [6].
We extend their work by incorporating real-time interaction.

3. Method
Our system consists of three main components.
The first component handles data preprocessing.
The second component manages the rendering pipeline.
We use a GPU-accelerated approach to achieve interactive frame rates.
Our implementation leverages WebGL for cross-platform compatibility.

4. Results
We conducted a user study with 24 participants.
The results show that our system outperforms the baseline.
Participants completed tasks 35% faster on average.
The error rate decreased significantly compared to the control condition.

5. Discussion
Our findings suggest that real-time interaction improves exploration.
However, the study has limitations.
The sample size was relatively small.
Future work should address scalability to larger datasets.

6. Conclusion
We presented a novel visual analytics framework.
Our evaluation demonstrates improved task performance.
We plan to extend this work to collaborative settings.
`;

const SAMPLE_PAPER_ZH = `
1. 引言
数据可视化已成为探索复杂数据集的重要手段。我们提出了一种新的交互式可视分析框架。该框架旨在帮助用户更高效地理解大规模数据集中的模式和趋势。

2. 相关工作
多项研究已经解决了可扩展可视化的挑战[1][2]。在过去的十年中，研究者们探索了各种交互技术以提升用户的数据探索效率。我们在前人工作的基础上进行了扩展和改进。

3. 方法
我们的系统由三个主要组件构成。第一个组件负责数据预处理和清洗。第二个组件管理渲染管道，支持多种可视化编码方式。第三个组件提供交互支持。

4. 实验
我们对24名参与者进行了用户研究。参与者完成了一系列数据探索任务，包括趋势识别、异常检测和模式比较。实验结果表明我们的系统在任务完成时间和准确率方面均优于基线系统。

5. 结论
我们提出了一种新的可视分析框架。该框架在大规模数据集上展现了良好的性能和交互响应速度。未来的工作将探索协作式分析场景。
`;

// ── detectSections ────────────────────────────────────────────────

describe('detectSections', () => {
  it('detects standard English sections', () => {
    const sections = detectSections(SAMPLE_PAPER_EN, 'en');
    const names = sections.map((s) => s.name);

    expect(names).toContain('introduction');
    expect(names).toContain('related_work');
    expect(names).toContain('method');
    expect(names).toContain('results');
    expect(names).toContain('discussion');
    expect(names).toContain('conclusion');
  });

  it('detects standard Chinese sections', () => {
    const sections = detectSections(SAMPLE_PAPER_ZH, 'zh');
    const names = sections.map((s) => s.name);

    expect(names).toContain('introduction');
    expect(names).toContain('related_work');
    expect(names).toContain('method');
    expect(names).toContain('results');
    expect(names).toContain('conclusion');
  });

  it('assigns text content to each section', () => {
    const sections = detectSections(SAMPLE_PAPER_EN, 'en');
    const intro = sections.find((s) => s.name === 'introduction');

    expect(intro).toBeDefined();
    expect(intro!.text.length).toBeGreaterThan(20);
    expect(intro!.text).toContain('Data visualization');
  });

  it('handles text with no section headings', () => {
    const sections = detectSections('Just a plain paragraph with no headings.', 'en');

    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toBe('other');
  });

  it('handles empty text', () => {
    const sections = detectSections('', 'en');
    expect(sections).toHaveLength(0);
  });
});

// ── computeSectionMetrics ─────────────────────────────────────────

describe('computeSectionMetrics', () => {
  it('computes proportion correctly', () => {
    const metrics = computeSectionMetrics('One two three four five.', 20, 'en');
    expect(metrics.proportion).toBeCloseTo(0.25, 1);
  });

  it('computes citation density', () => {
    const text = 'This is cited [1] and also cited [2] in a short passage of about twenty words total here.';
    const metrics = computeSectionMetrics(text, 1000, 'en');
    expect(metrics.citationDensity).toBeGreaterThan(0);
  });

  it('counts parenthetical citations', () => {
    // Engine expects (Author, Year) or (Author Year) format inside parens
    const text = 'As shown by (Smith, 2024) and extended by (Jones et al., 2023), the results are promising and noteworthy.';
    const metrics = computeSectionMetrics(text, 1000, 'en');
    expect(metrics.citationDensity).toBeGreaterThan(0);
  });

  it('computes first-person frequency for English', () => {
    const text = 'We propose a method. Our approach is novel. We believe this helps us understand.';
    const metrics = computeSectionMetrics(text, 1000, 'en');
    expect(metrics.firstPersonFrequency).toBeGreaterThan(0);
  });

  it('computes first-person frequency for Chinese', () => {
    const text = '我们提出了一种方法。我们的方法非常新颖。';
    const metrics = computeSectionMetrics(text, 1000, 'zh');
    expect(metrics.firstPersonFrequency).toBeGreaterThan(0);
  });

  it('computes average sentence length', () => {
    const text = 'Short. This is a longer sentence with more words.';
    const metrics = computeSectionMetrics(text, 100, 'en');
    expect(metrics.avgSentenceLength).toBeGreaterThan(0);
  });

  it('handles zero total words gracefully', () => {
    const metrics = computeSectionMetrics('Some text.', 0, 'en');
    expect(metrics.proportion).toBe(0);
  });

  it('handles empty section text', () => {
    const metrics = computeSectionMetrics('', 100, 'en');
    expect(metrics.proportion).toBe(0);
    expect(metrics.citationDensity).toBe(0);
    expect(metrics.avgSentenceLength).toBe(0);
  });
});

// ── analyzeSections ───────────────────────────────────────────────

describe('analyzeSections', () => {
  it('returns section analysis for a structured paper', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_EN, 'en');

    expect(analysis.sections.length).toBeGreaterThanOrEqual(5);
    const names = analysis.sections.map((s) => s.name);
    expect(names).toContain('introduction');
    expect(names).toContain('method');
  });

  it('section proportions sum to a meaningful fraction', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const totalProportion = analysis.sections.reduce((sum, s) => sum + s.metrics.proportion, 0);

    // Heading lines are excluded from section text, so proportions won't
    // sum to exactly 1. Short fragments (< 50 chars) are also filtered.
    // We just verify the bulk of the text is accounted for.
    expect(totalProportion).toBeGreaterThan(0.5);
    expect(totalProportion).toBeLessThanOrEqual(1.05);
  });

  it('returns empty sections for very short text', () => {
    const analysis = analyzeSections('Hi.', 'en');
    expect(analysis.sections).toHaveLength(0);
  });

  it('works with Chinese text', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_ZH, 'zh');
    expect(analysis.sections.length).toBeGreaterThanOrEqual(3);
  });
});

// ── buildSectionProfile ───────────────────────────────────────────

describe('buildSectionProfile', () => {
  it('aggregates multiple analyses into a profile', () => {
    const a1 = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const a2 = analyzeSections(SAMPLE_PAPER_EN, 'en'); // same doc twice for testing
    const profile = buildSectionProfile([a1, a2]);

    expect(profile.entries.length).toBeGreaterThanOrEqual(5);

    const intro = profile.entries.find((e) => e.section === 'introduction');
    expect(intro).toBeDefined();
    expect(intro!.metrics.mean).toBeGreaterThan(0);
    // With identical docs, stdDev should be 0
    expect(intro!.metrics.stdDev).toBeCloseTo(0, 5);
    // samples should have 2 values
    expect(intro!.metrics.samples).toHaveLength(2);
  });

  it('handles single document', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const profile = buildSectionProfile([analysis]);

    expect(profile.entries.length).toBeGreaterThanOrEqual(5);
    for (const entry of profile.entries) {
      expect(entry.metrics.samples).toHaveLength(1);
      expect(entry.metrics.stdDev).toBe(0);
    }
  });

  it('handles empty analysis list', () => {
    const profile = buildSectionProfile([]);
    expect(profile.entries).toHaveLength(0);
  });
});

// ── compareSections ───────────────────────────────────────────────

describe('compareSections', () => {
  it('returns no deviations when user matches reference', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const profile = buildSectionProfile([analysis]);
    const deviations = compareSections(analysis, profile);

    // Same document compared to its own profile → should have no/minimal deviations
    const significant = deviations.filter((d) => d.severity !== 'low');
    expect(significant).toHaveLength(0);
  });

  it('detects missing sections as deviations', () => {
    // Create a reference profile from full paper
    const fullAnalysis = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const profile = buildSectionProfile([fullAnalysis]);

    // Create a user analysis from incomplete text (no discussion/conclusion)
    const incompleteText = `
1. Introduction
We present a framework for visualization.

2. Method
Our system uses a multi-component architecture.
The pipeline processes data in three stages.

3. Results
The evaluation shows improved performance.
`;
    const userAnalysis = analyzeSections(incompleteText, 'en');
    const deviations = compareSections(userAnalysis, profile);

    // Should flag missing related_work, discussion, or conclusion
    const missingSection = deviations.find(
      (d) => d.metric === 'proportion' && d.userValue === 0
    );
    expect(missingSection).toBeDefined();
  });

  it('flags deviations when citation density differs significantly', () => {
    // Build a reference with high citation density in related work
    const highCiteText = `
1. Introduction
Data visualization is important.

2. Related Work
Many studies exist [1] [2] [3] [4] [5] [6] [7] [8] [9] [10].
Further work by Smith (2022) and Jones (2023) explored this topic [11] [12].

3. Method
We use a simple approach.

4. Results
Results are good.

5. Conclusion
We conclude.
`;
    const refAnalysis = analyzeSections(highCiteText, 'en');
    const profile = buildSectionProfile([refAnalysis]);

    // User text with no citations in related work
    const userText = `
1. Introduction
Data visualization is important.

2. Related Work
Many studies have addressed this topic over the years.
Researchers have explored various approaches to solve this problem.
The field has evolved significantly in the past decade.

3. Method
We use a simple approach.

4. Results
Results are good.

5. Conclusion
We conclude.
`;
    const userAnalysis = analyzeSections(userText, 'en');
    const deviations = compareSections(userAnalysis, profile);

    const citeDev = deviations.find(
      (d) => d.section === 'related_work' && d.metric === 'citationDensity'
    );
    expect(citeDev).toBeDefined();
    expect(citeDev!.level).toBe('below');
  });

  it('returns deviation level and severity fields', () => {
    const analysis = analyzeSections(SAMPLE_PAPER_EN, 'en');
    const profile = buildSectionProfile([analysis]);

    // Fabricate a user analysis with extreme values
    const userAnalysis = {
      sections: [
        { name: 'introduction' as const, metrics: { proportion: 0.9, citationDensity: 0, firstPersonFrequency: 0, avgSentenceLength: 5 } },
      ],
    };

    const deviations = compareSections(userAnalysis, profile);
    for (const d of deviations) {
      expect(['high', 'medium', 'low']).toContain(d.severity);
      expect(['above', 'below']).toContain(d.level);
      expect(d.referenceRange).toHaveProperty('mean');
      expect(d.referenceRange).toHaveProperty('lower');
      expect(d.referenceRange).toHaveProperty('upper');
    }
  });
});
