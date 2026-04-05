import { describe, it, expect } from 'vitest';
import { extractKeywords, buildSemanticScholarUrl } from '../keywordExtractor';

// ── extractKeywords (English) ─────────────────────────────────────

describe('extractKeywords — English', () => {
  it('extracts keywords from English text', () => {
    const text = 'Interactive visualization techniques for large-scale network analysis and graph exploration.';
    const keywords = extractKeywords(text, 'en', 5);

    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.length).toBeLessThanOrEqual(5);
    // Should contain domain-relevant words, not stop words
    for (const kw of keywords) {
      expect(kw.length).toBeGreaterThanOrEqual(3);
      expect(['the', 'and', 'for', 'this', 'that']).not.toContain(kw);
    }
  });

  it('filters out common stop words', () => {
    const text = 'The visualization of the data was presented in the study using the proposed approach.';
    const keywords = extractKeywords(text, 'en', 5);

    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('was');
    expect(keywords).not.toContain('using');
  });

  it('returns frequent words first', () => {
    const text = 'visualization visualization visualization network network analysis';
    const keywords = extractKeywords(text, 'en', 3);

    expect(keywords[0]).toBe('visualization');
    expect(keywords[1]).toBe('network');
  });

  it('respects topN parameter', () => {
    const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda';
    const keywords = extractKeywords(text, 'en', 3);
    expect(keywords).toHaveLength(3);
  });

  it('handles empty text', () => {
    const keywords = extractKeywords('', 'en', 5);
    expect(keywords).toHaveLength(0);
  });

  it('handles text with only stop words', () => {
    const keywords = extractKeywords('the and is was are for to of', 'en', 5);
    expect(keywords).toHaveLength(0);
  });

  it('filters out academic boilerplate words', () => {
    const text = 'This paper proposes a method using a novel approach based on the results of the study and figure table section.';
    const keywords = extractKeywords(text, 'en', 10);

    expect(keywords).not.toContain('paper');
    expect(keywords).not.toContain('method');
    expect(keywords).not.toContain('figure');
    expect(keywords).not.toContain('table');
    expect(keywords).not.toContain('section');
  });
});

// ── extractKeywords (Chinese) ─────────────────────────────────────

describe('extractKeywords — Chinese', () => {
  it('extracts bigram keywords from Chinese text', () => {
    const text = '数据可视化技术在大规模网络分析中的应用研究';
    const keywords = extractKeywords(text, 'zh', 5);

    expect(keywords.length).toBeGreaterThan(0);
    // Each keyword should be a 2-character bigram
    for (const kw of keywords) {
      expect(kw.length).toBe(2);
    }
  });

  it('filters out Chinese stop words', () => {
    const text = '我们的方法在一定程度上通过进行使用基于';
    const keywords = extractKeywords(text, 'zh', 10);

    expect(keywords).not.toContain('我们');
    expect(keywords).not.toContain('通过');
    expect(keywords).not.toContain('使用');
  });

  it('handles empty Chinese text', () => {
    const keywords = extractKeywords('', 'zh', 5);
    expect(keywords).toHaveLength(0);
  });

  it('returns frequent bigrams first', () => {
    const text = '可视化可视化可视化网络网络分析';
    const keywords = extractKeywords(text, 'zh', 2);

    expect(keywords[0]).toBe('可视');
  });
});

// ── buildSemanticScholarUrl ───────────────────────────────────────

describe('buildSemanticScholarUrl', () => {
  it('builds a valid Semantic Scholar URL', () => {
    const url = buildSemanticScholarUrl(['visualization', 'network', 'analysis']);

    expect(url).toContain('https://www.semanticscholar.org/search');
    expect(url).toContain('visualization');
    expect(url).toContain('network');
    expect(url).toContain('analysis');
  });

  it('encodes special characters in keywords', () => {
    const url = buildSemanticScholarUrl(['graph & network', 'data flow']);

    expect(url).toContain('semanticscholar.org');
    // Should be URL-encoded
    expect(url).not.toContain(' & ');
  });

  it('includes sort parameter', () => {
    const url = buildSemanticScholarUrl(['visualization']);
    expect(url).toContain('sort=relevance');
  });

  it('handles empty keywords', () => {
    const url = buildSemanticScholarUrl([]);
    expect(url).toContain('https://www.semanticscholar.org/search');
  });
});
