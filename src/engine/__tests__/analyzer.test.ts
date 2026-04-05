import { describe, it, expect } from 'vitest';
import { analyzeText, resolveOverlaps } from '../analyzer';
import type { Highlight } from '@/types';

describe('analyzeText', () => {
  describe('English', () => {
    it('returns empty result for empty text', () => {
      const result = analyzeText('', 'en');
      expect(result.highlights).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
      expect(result.score).toBe(0);
      expect(result.stats.wordCount).toBe(0);
    });

    it('returns empty result for whitespace-only text', () => {
      const result = analyzeText('   \n\n  ', 'en');
      expect(result.highlights).toHaveLength(0);
      expect(result.score).toBe(0);
    });

    it('detects filler phrases', () => {
      const result = analyzeText('It is worth noting that the results are good.', 'en');
      expect(result.counts.filler).toBeGreaterThanOrEqual(1);
      const fillerHighlights = result.highlights.filter((h) => h.type === 'filler');
      expect(fillerHighlights.length).toBeGreaterThan(0);
      expect(fillerHighlights[0]!.tip).toContain('Filler');
    });

    it('detects hedge words', () => {
      const result = analyzeText('This may potentially cause issues.', 'en');
      expect(result.counts.hedge).toBeGreaterThanOrEqual(1);
    });

    it('detects overused connectors', () => {
      const result = analyzeText(
        'Furthermore, this is good. Moreover, it works. Additionally, it is fast.',
        'en',
      );
      expect(result.counts.connector).toBe(3);
    });

    it('detects template expressions', () => {
      const result = analyzeText('This paper presents a novel approach to data visualization.', 'en');
      expect(result.counts.template).toBeGreaterThanOrEqual(1);
    });

    it('detects passive voice', () => {
      const result = analyzeText('The system was designed to be efficient.', 'en');
      expect(result.counts.passive).toBeGreaterThanOrEqual(1);
    });

    it('produces score between 0 and 100', () => {
      const cleanText = 'I built a tool that checks text. It works by matching patterns.';
      const aiText = `In today's rapidly evolving landscape, it is worth noting that this research has gained significant traction. Furthermore, our approach leverages cutting-edge techniques. Moreover, the system seamlessly integrates holistic methods. Additionally, the transformative framework fosters robust engagement. Consequently, stakeholders may potentially benefit from this groundbreaking paradigm shift. The results demonstrate that our work paves the way for future research.`;

      const cleanResult = analyzeText(cleanText, 'en');
      const aiResult = analyzeText(aiText, 'en');

      expect(cleanResult.score).toBeGreaterThanOrEqual(0);
      expect(cleanResult.score).toBeLessThanOrEqual(100);
      expect(aiResult.score).toBeGreaterThanOrEqual(0);
      expect(aiResult.score).toBeLessThanOrEqual(100);

      // AI-heavy text should score higher
      expect(aiResult.score).toBeGreaterThan(cleanResult.score);
    });

    it('generates issues for heavy AI text', () => {
      const text = `Furthermore, it is worth noting that this study aims to leverage cutting-edge approaches. Moreover, the results demonstrate that our method seamlessly bridges the gap. Additionally, the holistic framework fosters robust synergy among stakeholders. Consequently, future work should explore transformative paradigms.`;
      const result = analyzeText(text, 'en');
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('handles text with no AI patterns gracefully', () => {
      const text = 'I ran the experiment on Tuesday. Three users finished early. One got stuck on task 4.';
      const result = analyzeText(text, 'en');
      // Should have few or no pattern-based highlights (may still flag passive etc.)
      expect(result.counts.filler).toBe(0);
      expect(result.counts.connector).toBe(0);
      expect(result.counts.template).toBe(0);
    });
  });

  describe('sequential enumeration detection', () => {
    it('flags First/Second/Third pattern as connectors when 3+ found', () => {
      const text =
        'First, we collect the data. Second, we clean it. Third, we train the model. Finally, we evaluate.';
      const result = analyzeText(text, 'en');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('Sequential enumeration'),
      );
      expect(enumHighlights.length).toBeGreaterThanOrEqual(3);
    });

    it('does NOT flag when fewer than 3 sequential markers', () => {
      const text = 'First, we define the problem. Second, we build the solution. The rest follows naturally.';
      const result = analyzeText(text, 'en');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('Sequential enumeration'),
      );
      expect(enumHighlights).toHaveLength(0);
    });

    it('detects Firstly/Secondly/Thirdly variants', () => {
      const text =
        'Firstly, the design is modern. Secondly, the implementation is efficient. Thirdly, the tests pass. Lastly, we ship.';
      const result = analyzeText(text, 'en');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('Sequential enumeration'),
      );
      expect(enumHighlights.length).toBeGreaterThanOrEqual(3);
    });

    it('detects Chinese sequential enumeration', () => {
      const text =
        '首先，我们收集数据。其次，我们清洗数据。第三，我们训练模型。最后，我们评估结果。';
      const result = analyzeText(text, 'zh');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('序列枚举'),
      );
      expect(enumHighlights.length).toBeGreaterThanOrEqual(3);
    });

    it('handles double-space after periods (copy-paste artifacts)', () => {
      const text =
        'Step one is clear.  First, collect data.  Second, clean it.  Third, train the model.';
      const result = analyzeText(text, 'en');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('Sequential enumeration'),
      );
      expect(enumHighlights.length).toBeGreaterThanOrEqual(3);
    });

    it('highlight text does not include leading whitespace', () => {
      const text =
        'Setup is done. First, we start. Second, we continue. Third, we finish.';
      const result = analyzeText(text, 'en');
      const enumHighlights = result.highlights.filter(
        (h) => h.type === 'connector' && h.tip.includes('Sequential enumeration'),
      );
      for (const h of enumHighlights) {
        expect(h.text).not.toMatch(/^\s/);
      }
    });
  });

  describe('AI code explanation patterns', () => {
    it('detects "It works by iterating" pattern', () => {
      const text = 'It works by iterating through each element in the array.';
      const result = analyzeText(text, 'en');
      expect(result.counts.template).toBeGreaterThanOrEqual(1);
    });

    it('detects "This approach ensures" pattern', () => {
      const text = 'This approach ensures that all edge cases are handled correctly.';
      const result = analyzeText(text, 'en');
      expect(result.counts.template).toBeGreaterThanOrEqual(1);
    });

    it('detects "Let\'s break this down" pattern', () => {
      const text = "Let's break this down step by step.";
      const result = analyzeText(text, 'en');
      expect(result.counts.template).toBeGreaterThanOrEqual(1);
    });
  });

  describe('soft filler gating', () => {
    it('does NOT flag isolated soft fillers like "fosters" when no other signals', () => {
      const text = 'The program fosters collaboration among team members.';
      const result = analyzeText(text, 'en');
      const fosterHighlight = result.highlights.find((h) => h.text.toLowerCase().includes('foster'));
      expect(fosterHighlight).toBeUndefined();
    });

    it('does NOT flag "robust" alone in technical context', () => {
      const text = 'The system provides a robust interface for data entry.';
      const result = analyzeText(text, 'en');
      const robustHighlight = result.highlights.find((h) => h.text.toLowerCase().includes('robust'));
      expect(robustHighlight).toBeUndefined();
    });

    it('DOES flag soft fillers when co-occurring with other AI signals', () => {
      const text =
        'Furthermore, the framework fosters robust engagement. Moreover, it leverages cutting-edge techniques to empower stakeholders.';
      const result = analyzeText(text, 'en');
      // With strong signals (Furthermore, Moreover), soft fillers should appear
      const softHits = result.highlights.filter((h) =>
        ['fosters', 'robust', 'leverages', 'cutting-edge', 'empower', 'stakeholders'].some((w) =>
          h.text.toLowerCase().includes(w),
        ),
      );
      expect(softHits.length).toBeGreaterThan(0);
    });

    it('does NOT flag Chinese soft fillers alone', () => {
      const text = '这次数字化转型帮助了很多企业。';
      const result = analyzeText(text, 'zh');
      const softHit = result.highlights.find((h) => h.text.includes('转型'));
      expect(softHit).toBeUndefined();
    });
  });

  describe('Chinese', () => {
    it('detects Chinese filler phrases', () => {
      const result = analyzeText('值得注意的是，这个方法在当今快速发展的时代有重要意义。', 'zh');
      expect(result.counts.filler).toBeGreaterThanOrEqual(1);
    });

    it('detects Chinese connectors', () => {
      const result = analyzeText('此外，我们还发现了新的模式。与此同时，系统表现稳定。', 'zh');
      expect(result.counts.connector).toBeGreaterThanOrEqual(1);
    });

    it('detects Chinese template expressions', () => {
      const result = analyzeText('本文旨在探讨可视化分析中的交互设计问题。', 'zh');
      expect(result.counts.template).toBeGreaterThanOrEqual(1);
    });

    it('computes word count correctly for Chinese', () => {
      const result = analyzeText('这是一个测试句子。', 'zh');
      // 8 CJK chars (excluding punctuation)
      expect(result.stats.wordCount).toBeGreaterThan(0);
    });
  });
});

describe('resolveOverlaps', () => {
  it('removes overlapping highlights, keeping earlier one', () => {
    const highlights: Highlight[] = [
      { start: 0, end: 10, type: 'filler', tip: 'A', text: 'aaaaaaaaaa' },
      { start: 5, end: 15, type: 'hedge', tip: 'B', text: 'bbbbbbbbbb' },
      { start: 20, end: 30, type: 'connector', tip: 'C', text: 'cccccccccc' },
    ];
    const result = resolveOverlaps(highlights);
    expect(result).toHaveLength(2);
    expect(result[0]!.tip).toBe('A');
    expect(result[1]!.tip).toBe('C');
  });

  it('handles empty array', () => {
    expect(resolveOverlaps([])).toHaveLength(0);
  });

  it('handles non-overlapping highlights', () => {
    const highlights: Highlight[] = [
      { start: 0, end: 5, type: 'filler', tip: 'A', text: 'aaaaa' },
      { start: 10, end: 15, type: 'hedge', tip: 'B', text: 'bbbbb' },
    ];
    const result = resolveOverlaps(highlights);
    expect(result).toHaveLength(2);
  });

  it('prefers longer match at same start position', () => {
    const highlights: Highlight[] = [
      { start: 0, end: 20, type: 'filler', tip: 'long', text: 'long match here now!' },
      { start: 0, end: 10, type: 'hedge', tip: 'short', text: 'short matc' },
    ];
    const result = resolveOverlaps(highlights);
    expect(result).toHaveLength(1);
    expect(result[0]!.tip).toBe('long');
  });
});
