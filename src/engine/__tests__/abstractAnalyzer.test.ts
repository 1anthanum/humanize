import { describe, it, expect } from 'vitest';
import { analyzeAbstract, getAbstractText } from '../abstractAnalyzer';

// ── Sample abstracts ─────────────────────────────────────────────────

const WELL_STRUCTURED_EN = `
Abstract
Data visualization has become increasingly important in many domains in recent years. However, existing approaches lack the ability to handle large-scale dynamic networks effectively. We propose a novel interactive framework that combines multi-scale rendering with real-time layout optimization. Our evaluation with 32 participants demonstrates that our system achieves 40% faster task completion compared to the baseline. This work contributes new techniques that can be broadly applied to visual analytics systems.
`;

const MISSING_MOVES_EN = `
Abstract
We present a new method for graph visualization. The system uses a force-directed layout algorithm with GPU acceleration. Results show improved rendering performance.
`;

const NO_ABSTRACT_HEADING = `
Interactive visualization has gained significant attention in recent years. However, few tools support real-time exploration of streaming data. We develop a system that enables analysts to monitor and explore live data feeds. Experiments with domain experts show the system is effective for anomaly detection. Our approach opens new directions for real-time visual analytics research.
`;

const WELL_STRUCTURED_ZH = `
摘要
近年来，数据可视化在许多领域日益重要。然而，现有方法在处理大规模动态网络时存在不足。我们提出了一种新的交互式分析框架，结合多尺度渲染和实时布局优化。实验结果表明，我们的系统在任务完成时间上比基线系统提升了40%。本研究为可视分析系统贡献了新的技术方案，有望推动该领域的发展。
`;

const SHORT_TEXT = 'Hello world.';
const EMPTY_TEXT = '';

// ── getAbstractText ──────────────────────────────────────────────────

describe('getAbstractText', () => {
  it('extracts abstract section when heading is present', () => {
    const text = getAbstractText(WELL_STRUCTURED_EN, 'en');
    expect(text).not.toBeNull();
    expect(text!).toContain('visualization');
  });

  it('falls back to first paragraph when no abstract heading', () => {
    const text = getAbstractText(NO_ABSTRACT_HEADING, 'en');
    expect(text).not.toBeNull();
    expect(text!).toContain('Interactive visualization');
  });

  it('returns null for empty text', () => {
    expect(getAbstractText(EMPTY_TEXT, 'en')).toBeNull();
  });

  it('returns null for very short text', () => {
    expect(getAbstractText(SHORT_TEXT, 'en')).toBeNull();
  });

  it('extracts Chinese abstract', () => {
    const text = getAbstractText(WELL_STRUCTURED_ZH, 'zh');
    expect(text).not.toBeNull();
    expect(text!).toContain('数据可视化');
  });
});

// ── analyzeAbstract ──────────────────────────────────────────────────

describe('analyzeAbstract', () => {
  it('detects all 5 moves in a well-structured English abstract', () => {
    const analysis = analyzeAbstract(WELL_STRUCTURED_EN, 'en');
    expect(analysis).not.toBeNull();

    const moveTypes = new Set(analysis!.moves.map((m) => m.move));
    expect(moveTypes.has('background')).toBe(true);
    expect(moveTypes.has('gap')).toBe(true);
    expect(moveTypes.has('method')).toBe(true);
    expect(moveTypes.has('result')).toBe(true);
    expect(moveTypes.has('impact')).toBe(true);

    expect(analysis!.missing).toHaveLength(0);
  });

  it('detects moves in a well-structured Chinese abstract', () => {
    const analysis = analyzeAbstract(WELL_STRUCTURED_ZH, 'zh');
    expect(analysis).not.toBeNull();

    const moveTypes = new Set(analysis!.moves.map((m) => m.move));
    expect(moveTypes.has('background')).toBe(true);
    expect(moveTypes.has('gap')).toBe(true);
    expect(moveTypes.has('method')).toBe(true);
    expect(moveTypes.has('result')).toBe(true);

    // Should have at most 1 missing move
    expect(analysis!.missing.length).toBeLessThanOrEqual(1);
  });

  it('flags missing moves in an incomplete abstract', () => {
    const analysis = analyzeAbstract(MISSING_MOVES_EN, 'en');
    expect(analysis).not.toBeNull();

    // Should be missing at least background and gap (and possibly impact)
    expect(analysis!.missing.length).toBeGreaterThanOrEqual(1);
    // Should still detect method and result
    const moveTypes = new Set(analysis!.moves.map((m) => m.move));
    expect(moveTypes.has('method')).toBe(true);
  });

  it('returns null for empty text', () => {
    expect(analyzeAbstract(EMPTY_TEXT, 'en')).toBeNull();
  });

  it('returns null for very short text', () => {
    expect(analyzeAbstract(SHORT_TEXT, 'en')).toBeNull();
  });

  it('assigns valid character indices to detected moves', () => {
    const analysis = analyzeAbstract(WELL_STRUCTURED_EN, 'en');
    expect(analysis).not.toBeNull();

    for (const move of analysis!.moves) {
      expect(move.startIdx).toBeGreaterThanOrEqual(0);
      expect(move.endIdx).toBeGreaterThan(move.startIdx);
      expect(move.confidence).toBeGreaterThan(0);
      expect(move.confidence).toBeLessThanOrEqual(1);
      expect(move.text.length).toBeGreaterThan(0);
    }
  });

  it('assigns confidence scores between 0 and 1', () => {
    const analysis = analyzeAbstract(WELL_STRUCTURED_EN, 'en');
    expect(analysis).not.toBeNull();

    for (const move of analysis!.moves) {
      expect(move.confidence).toBeGreaterThan(0);
      expect(move.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('works with text that has no abstract heading (fallback)', () => {
    const analysis = analyzeAbstract(NO_ABSTRACT_HEADING, 'en');
    expect(analysis).not.toBeNull();
    expect(analysis!.moves.length).toBeGreaterThanOrEqual(3);
  });

  it('detected moves contain valid AbstractMove values', () => {
    const validMoves = ['background', 'gap', 'method', 'result', 'impact'];
    const analysis = analyzeAbstract(WELL_STRUCTURED_EN, 'en');
    expect(analysis).not.toBeNull();

    for (const move of analysis!.moves) {
      expect(validMoves).toContain(move.move);
    }
    for (const missing of analysis!.missing) {
      expect(validMoves).toContain(missing);
    }
  });
});
