import { describe, it, expect } from 'vitest';
import { buildMarkdownReport } from '../export';
import { analyzeText } from '@/engine/analyzer';

describe('buildMarkdownReport', () => {
  it('generates valid Markdown with all sections', () => {
    const text = `Furthermore, it is worth noting that this study aims to leverage cutting-edge approaches. Moreover, the results demonstrate that our method seamlessly bridges the gap.`;
    const result = analyzeText(text, 'en');
    const md = buildMarkdownReport(result, text);

    expect(md).toContain('# Humanize Diagnostic Report');
    expect(md).toContain('**Score:**');
    expect(md).toContain('## Pattern Breakdown');
    expect(md).toContain('| Category | Count |');
    expect(md).toContain('## Highlighted Patterns');
    expect(md).toContain('## Analyzed Text');
  });

  it('includes score and stats', () => {
    const text = 'Simple clean text without AI patterns.';
    const result = analyzeText(text, 'en');
    const md = buildMarkdownReport(result, text);

    expect(md).toContain(`**Score:** ${result.score}/100`);
    expect(md).toContain(`**Words:** ${result.stats.wordCount}`);
    expect(md).toContain(`**Sentences:** ${result.stats.sentenceCount}`);
  });

  it('includes issues when present', () => {
    const text = `It is worth noting that furthermore, moreover, additionally this leverages seamless holistic paradigm shifts.`;
    const result = analyzeText(text, 'en');
    const md = buildMarkdownReport(result, text);

    // Should have at least one issue section
    if (result.issues.length > 0) {
      expect(md).toContain('## Issues Found');
    }
  });

  it('truncates very long text at 2000 chars', () => {
    const longText = 'A '.repeat(1500); // 3000 chars
    const result = analyzeText(longText, 'en');
    const md = buildMarkdownReport(result, longText);

    expect(md).toContain('[... truncated]');
  });

  it('handles empty highlights gracefully', () => {
    const text = 'Clean simple text.';
    const result = analyzeText(text, 'en');
    const md = buildMarkdownReport(result, text);

    // Should still be valid markdown
    expect(md).toContain('# Humanize Diagnostic Report');
    expect(md).toContain('## Pattern Breakdown');
  });

  it('limits highlighted patterns to 30', () => {
    // Generate text with many patterns
    const phrases = Array(35).fill('Furthermore, it is worth noting that this is important.').join(' ');
    const result = analyzeText(phrases, 'en');
    const md = buildMarkdownReport(result, phrases);

    if (result.highlights.length > 30) {
      expect(md).toContain('more');
    }
  });
});
