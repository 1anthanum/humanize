#!/usr/bin/env node
/**
 * 预设生成脚本 — 批量处理 PDF 论文，输出内置风格预设数据
 *
 * 使用方法：
 *   1. 在项目根目录创建 papers/ 文件夹，按会议/track 建子目录：
 *      papers/
 *        ieee-vis-infovis/    ← 3 篇 InfoVis best paper
 *          paper1.pdf
 *          paper2.pdf
 *        ieee-vis-scivis/     ← 3 篇 SciVis best paper
 *          paper1.pdf
 *        ieee-vis-vast/       ← 3 篇 VAST best paper
 *          paper1.pdf
 *        chi/                 ← 5 篇 CHI best paper
 *          paper1.pdf
 *        eurovis/             ← 3 篇
 *          paper1.pdf
 *        neurips/             ← 3 篇
 *          paper1.pdf
 *
 *   2. 运行脚本：
 *      node scripts/buildPresets.mjs
 *
 *   3. 生成文件：src/data/builtinPresets.ts
 *
 * 会议名称映射（子目录名 → 显示名）：
 *   ieee-vis-infovis → IEEE VIS · InfoVis
 *   ieee-vis-scivis  → IEEE VIS · SciVis
 *   ieee-vis-vast    → IEEE VIS · VAST
 *   ieee-vis         → IEEE VIS (TVCG)  ← 如果不想分 track 也可以
 *   chi              → CHI
 *   eurovis          → EuroVis (CGF)
 *   neurips          → NeurIPS
 *
 * 子目录名不在上面列表里的，会直接用目录名作为显示名。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAPERS_DIR = path.join(ROOT, 'papers');
const OUTPUT_FILE = path.join(ROOT, 'src/data/builtinPresets.ts');

const VENUE_LABELS = {
  // IEEE VIS — 按 track 拆分
  'ieee-vis-infovis': 'IEEE VIS · InfoVis',
  'ieee-vis-scivis': 'IEEE VIS · SciVis',
  'ieee-vis-vast': 'IEEE VIS · VAST',
  // 也支持不分 track 的整体版本
  'ieee-vis': 'IEEE VIS (TVCG)',
  // 其他会议
  'chi': 'CHI',
  'eurovis': 'EuroVis (CGF)',
  'neurips': 'NeurIPS',
};

// ── PDF text extraction (Node.js version, mirrors pdfExtraction.ts) ────

async function getPdfjs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsLib;
}

async function extractPDFText(filePath) {
  const pdfjsLib = await getPdfjs();
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    pages.push(text);
  }
  return stripNoise(pages.join('\n'));
}

function stripNoise(text) {
  // Truncate at References / Bibliography
  const refIdx = text.search(/\n\s*(References|Bibliography|REFERENCES)\s*\n/);
  if (refIdx > 500) text = text.slice(0, refIdx);
  // Remove page numbers
  text = text.replace(/\n\s*\d+\s*\n/g, '\n');
  return text.trim();
}

// ── Style profiling (mirrors styleProfiler.ts core logic) ──────────

function computeStats(values) {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, samples: [] };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  return {
    mean,
    stdDev: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
    samples: values,
  };
}

function extractStyleProfile(text, language = 'en') {
  const sentences = language === 'zh'
    ? text.split(/[。！？；]+/).filter((s) => s.trim())
    : text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

  const words = language === 'zh'
    ? [...text.replace(/\s/g, '')].filter(Boolean)
    : text.split(/\s+/).filter(Boolean);

  const totalWords = words.length;
  if (totalWords === 0 || sentences.length === 0) {
    throw new Error('Text too short for analysis');
  }

  const sentenceLengths = sentences.map((s) => {
    if (language === 'zh') return [...s.replace(/\s/g, '')].length;
    return s.split(/\s+/).filter(Boolean).length;
  });

  // Passive voice (English only)
  const passiveRe = /\b(?:am|is|are|was|were|be|been|being)\s+\w+(?:ed|en|t)\b/gi;
  const passiveCount = (text.match(passiveRe) || []).length;

  // Connectors
  const connectorReEn = /\b(?:furthermore|moreover|additionally|consequently|therefore|however|nevertheless|nonetheless|thus|hence|accordingly|meanwhile|subsequently)\b/gi;
  const connectorReZh = /(?:此外|而且|另外|因此|所以|然而|不过|同时|随后|与此同时|不仅如此|综上所述)/g;
  const connectorRe = language === 'zh' ? connectorReZh : connectorReEn;
  const connectorCount = (text.match(connectorRe) || []).length;

  // Fillers
  const fillerReEn = /\b(?:it is worth noting|needless to say|it goes without saying|as a matter of fact|in today's .{0,20} (?:world|landscape|era)|in the realm of|at the end of the day)\b/gi;
  const fillerReZh = /(?:众所周知|值得注意的是|不言而喻|事实上|在当今.*?时代|在.*?领域|归根结底)/g;
  const fillerRe = language === 'zh' ? fillerReZh : fillerReEn;
  const fillerCount = (text.match(fillerRe) || []).length;

  // Hedges
  const hedgeReEn = /\b(?:somewhat|relatively|to some extent|could potentially|generally|in a sense|to a certain degree|arguably|might possibly)\b/gi;
  const hedgeReZh = /(?:在一定程度上|相对而言|某种意义上|可能|或许|大概|一般来说)/g;
  const hedgeRe = language === 'zh' ? hedgeReZh : hedgeReEn;
  const hedgeCount = (text.match(hedgeRe) || []).length;

  // Type-token ratio
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const ttr = uniqueWords.size / totalWords;

  // Word length
  const wordLengths = language === 'zh'
    ? [2]  // placeholder for Chinese
    : words.map((w) => w.replace(/[^a-zA-Z]/g, '').length).filter((l) => l > 0);

  // Sentences per paragraph
  const sentencesPerParagraph = paragraphs.map((p) => {
    const pSentences = language === 'zh'
      ? p.split(/[。！？；]+/).filter((s) => s.trim()).length
      : p.split(/(?<=[.!?])\s+/).filter((s) => s.trim()).length;
    return pSentences;
  }).filter((n) => n > 0);

  return {
    avgSentenceLength: computeStats(sentenceLengths),
    passiveVoiceRatio: computeStats([passiveCount / sentences.length]),
    connectorFrequency: computeStats([connectorCount / totalWords * 1000]),
    fillerDensity: computeStats([fillerCount / totalWords * 1000]),
    hedgeDensity: computeStats([hedgeCount / totalWords * 1000]),
    typeTokenRatio: computeStats([ttr]),
    avgWordLength: computeStats(wordLengths),
    avgSentencesPerParagraph: computeStats(sentencesPerParagraph),
    documentCount: 1,
    totalWords,
    sentenceLengths,
  };
}

function mergeProfiles(profiles) {
  const mergedSamples = {};
  const metricKeys = [
    'avgSentenceLength', 'passiveVoiceRatio', 'connectorFrequency',
    'fillerDensity', 'hedgeDensity', 'typeTokenRatio',
    'avgWordLength', 'avgSentencesPerParagraph',
  ];

  for (const key of metricKeys) {
    mergedSamples[key] = [];
  }

  let totalDocs = 0;
  let totalWords = 0;
  let allSentenceLengths = [];

  for (const p of profiles) {
    totalDocs += p.documentCount;
    totalWords += p.totalWords;
    allSentenceLengths = allSentenceLengths.concat(p.sentenceLengths);
    for (const key of metricKeys) {
      mergedSamples[key] = mergedSamples[key].concat(p[key].samples);
    }
  }

  const merged = {};
  for (const key of metricKeys) {
    merged[key] = computeStats(mergedSamples[key]);
  }
  merged.documentCount = totalDocs;
  merged.totalWords = totalWords;
  merged.sentenceLengths = allSentenceLengths;
  return merged;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(PAPERS_DIR)) {
    console.log('');
    console.log('  请先创建 papers/ 目录并放入论文 PDF：');
    console.log('');
    console.log('  papers/');
    console.log('    ieee-vis/');
    console.log('      paper1.pdf');
    console.log('      paper2.pdf');
    console.log('    chi/');
    console.log('      paper1.pdf');
    console.log('    eurovis/');
    console.log('      paper1.pdf');
    console.log('    neurips/');
    console.log('      paper1.pdf');
    console.log('');
    process.exit(1);
  }

  const venues = fs.readdirSync(PAPERS_DIR).filter((d) =>
    fs.statSync(path.join(PAPERS_DIR, d)).isDirectory()
  );

  if (venues.length === 0) {
    console.error('papers/ 目录下没有找到子目录。');
    process.exit(1);
  }

  const presets = [];

  for (const venue of venues) {
    const label = VENUE_LABELS[venue] || venue;
    const venueDir = path.join(PAPERS_DIR, venue);
    const pdfs = fs.readdirSync(venueDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

    if (pdfs.length === 0) {
      console.log(`  ⚠ ${label}: 没有 PDF 文件，跳过`);
      continue;
    }

    console.log(`  📄 ${label}: 处理 ${pdfs.length} 篇论文...`);

    const profiles = [];
    const fileNames = [];

    for (const pdf of pdfs) {
      const filePath = path.join(venueDir, pdf);
      try {
        const text = await extractPDFText(filePath);
        if (text.length < 200) {
          console.log(`     ⚠ ${pdf}: 文本过短，跳过`);
          continue;
        }
        const profile = extractStyleProfile(text, 'en');
        profiles.push(profile);
        fileNames.push(pdf);
        console.log(`     ✓ ${pdf} (${profile.totalWords} 词)`);
      } catch (err) {
        console.log(`     ✗ ${pdf}: ${err.message}`);
      }
    }

    if (profiles.length === 0) {
      console.log(`  ⚠ ${label}: 没有成功处理的论文`);
      continue;
    }

    const merged = mergeProfiles(profiles);

    presets.push({
      id: `builtin_${venue}`,
      venue,
      label,
      profile: merged,
      sourceFiles: fileNames,
      paperCount: profiles.length,
    });

    console.log(`  ✓ ${label}: ${profiles.length} 篇, ${merged.totalWords} 总词数`);
  }

  if (presets.length === 0) {
    console.error('没有生成任何预设。');
    process.exit(1);
  }

  // Generate TypeScript file
  // Strip sentenceLengths samples to reduce bundle size (keep only the histogram-relevant data)
  // Also strip individual metric samples for the same reason
  const slimPresets = presets.map((p) => {
    const profile = { ...p.profile };
    // Keep sentenceLengths for histogram but limit size
    if (profile.sentenceLengths.length > 500) {
      // Sample down to 500 representative values
      const step = Math.ceil(profile.sentenceLengths.length / 500);
      profile.sentenceLengths = profile.sentenceLengths.filter((_, i) => i % step === 0);
    }
    // Strip samples from metrics (they're only needed for merging, not display)
    const metricKeys = [
      'avgSentenceLength', 'passiveVoiceRatio', 'connectorFrequency',
      'fillerDensity', 'hedgeDensity', 'typeTokenRatio',
      'avgWordLength', 'avgSentencesPerParagraph',
    ];
    for (const key of metricKeys) {
      profile[key] = { ...profile[key], samples: [] };
    }
    return {
      id: p.id,
      venue: p.venue,
      label: p.label,
      profile,
      sourceFiles: p.sourceFiles,
      paperCount: p.paperCount,
    };
  });

  const tsContent = `// Auto-generated by scripts/buildPresets.mjs — DO NOT EDIT
// Generated at: ${new Date().toISOString()}
import type { StyleProfile } from '@/types';

export interface BuiltinPreset {
  id: string;
  venue: string;
  label: string;
  profile: StyleProfile;
  sourceFiles: string[];
  paperCount: number;
}

export const BUILTIN_PRESETS: BuiltinPreset[] = ${JSON.stringify(slimPresets, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');

  console.log('');
  console.log(`  ✅ 生成成功: src/data/builtinPresets.ts`);
  console.log(`     ${presets.length} 个会议预设, ${presets.reduce((s, p) => s + p.paperCount, 0)} 篇论文`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
