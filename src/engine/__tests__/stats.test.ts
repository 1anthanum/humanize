import { describe, it, expect } from 'vitest';
import { computeStats, splitSentences, countWords } from '../stats';

describe('splitSentences', () => {
  it('splits English text by sentence-ending punctuation', () => {
    const sentences = splitSentences('Hello world. How are you? I am fine!', 'en');
    expect(sentences).toHaveLength(3);
  });

  it('handles single sentence', () => {
    expect(splitSentences('Just one sentence.', 'en')).toHaveLength(1);
  });

  it('handles empty text', () => {
    expect(splitSentences('', 'en')).toHaveLength(0);
  });

  it('splits Chinese text by Chinese punctuation', () => {
    const sentences = splitSentences('这是第一句。这是第二句！这是第三句？', 'zh');
    expect(sentences).toHaveLength(3);
  });
});

describe('countWords', () => {
  it('counts English words correctly', () => {
    expect(countWords('Hello world', 'en')).toBe(2);
    expect(countWords('One two three four five', 'en')).toBe(5);
  });

  it('returns 0 for empty text', () => {
    expect(countWords('', 'en')).toBe(0);
  });

  it('counts CJK characters for Chinese', () => {
    const count = countWords('这是测试', 'zh');
    expect(count).toBe(4); // 4 CJK characters
  });

  it('counts mixed Chinese and English', () => {
    const count = countWords('这是一个test', 'zh');
    // 4 CJK + 1 English word
    expect(count).toBe(5);
  });
});

describe('computeStats', () => {
  it('computes correct stats for English text', () => {
    const text = 'Short sentence. This is a longer sentence with more words.';
    const stats = computeStats(text, 'en');

    expect(stats.wordCount).toBe(10);
    expect(stats.sentenceCount).toBe(2);
    expect(stats.paragraphCount).toBe(1);
    expect(stats.avgSentenceLength).toBe(5); // (2 + 8) / 2
  });

  it('computes coefficient of variation', () => {
    // Very uniform sentences
    const uniform = 'I am good. He is bad. We are ok.';
    const uniformStats = computeStats(uniform, 'en');

    // Very varied sentences
    const varied = 'Yes. This is a much longer sentence with many more words in it than the other one.';
    const variedStats = computeStats(varied, 'en');

    expect(variedStats.coefficientOfVariation).toBeGreaterThan(uniformStats.coefficientOfVariation);
  });

  it('handles paragraphs correctly', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const stats = computeStats(text, 'en');
    expect(stats.paragraphCount).toBe(3);
  });
});
