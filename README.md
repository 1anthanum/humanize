# Humanize

**Detect AI-typical patterns in your writing. Compare against reference styles. Get actionable diagnostics.**

Humanize scans English and Chinese text for surface-level AI patterns — filler phrases, hedge words, overused connectors, template expressions, and passive voice — and highlights them with specific suggestions for improvement.

No ML model, no server calls, no login. Runs entirely in your browser.

## Features

- **5 pattern categories** — filler, hedging, connectors, templates, passive voice (35+ EN / 30+ ZH rules)
- **Annotated highlighting** — color-coded inline markers with hover tooltips
- **AI-likeness score** — 0–100 based on pattern density, sentence uniformity, and more
- **Before/After comparison** — side-by-side view to track improvement between drafts
- **Style Profile** — upload reference PDFs from target journals/conferences, extract 8 quantitative style metrics, and see how your text deviates with severity levels and suggestions
- **Sentence length histogram** — visual comparison of your sentence length distribution vs. the reference profile
- **Export** — download diagnostic reports as JSON or Markdown
- **English + Chinese** — separate pattern sets and localized UI for each language
- **Offline-first** — everything runs client-side, your text never leaves the browser
- **Profile persistence** — style profiles saved to localStorage across page reloads

## Quick Start

### Use Online

Visit the [live demo](https://YOUR_USERNAME.github.io/humanize) — paste text and click Analyze.

### Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/humanize.git
cd humanize
npm install
npm run dev
```

Open `http://localhost:5173/humanize/` in your browser.

## How It Works

Humanize uses **rule-based heuristics**, not machine learning. The detection engine (`src/engine/`) is framework-agnostic and can be used independently:

```typescript
import { analyzeText } from './src/engine/analyzer';

const result = analyzeText('Furthermore, it is worth noting that...', 'en');

console.log(result.score);       // 0–100
console.log(result.highlights);  // [{start, end, type, tip, text}, ...]
console.log(result.issues);      // [{severity, title, description, suggestion}, ...]
console.log(result.stats);       // {wordCount, sentenceCount, coefficientOfVariation, ...}
```

### What It Detects

| Category | Examples | Why It Matters |
|----------|----------|----------------|
| **Filler phrases** | "It is worth noting that", "leverage", "seamless" | Adds words without adding meaning |
| **Hedge words** | "may potentially", "to some extent", "relatively" | Undermines confidence in your claims |
| **Overused connectors** | "Furthermore", "Moreover", "Additionally" | Strongest single AI signal |
| **Template expressions** | "This paper presents", "The results demonstrate" | Makes text feel formulaic |
| **Passive voice** | "was designed", "is considered" | Creates unnecessary distance |

### Score Calculation

The score (0–100, lower = more human-like) is a weighted composite of:
- Pattern density relative to word count (40%)
- Sentence length uniformity (25%)
- Excess formal connectors (15%)
- Filler phrase density (10%)
- Template expression density (10%)

### Style Profile

Upload academic papers from your target venue. Humanize extracts 8 quantitative metrics from the reference texts:

| Metric | What it measures |
|--------|-----------------|
| Avg sentence length | Words per sentence |
| Passive voice ratio | % of sentences using passive constructions |
| Connector frequency | Connectors per sentence |
| Filler density | Filler phrases per 100 words |
| Hedge density | Hedge words per 100 words |
| Vocabulary diversity | Type-token ratio (unique/total words) |
| Avg word length | Characters per word |
| Sentences/paragraph | Average paragraph length |

Profiles are merged across multiple documents and persisted in localStorage. PDF text extraction runs entirely in the browser using pdf.js (lazy-loaded — the 1.3MB worker only loads when you first upload a PDF).

## Architecture

```
src/
├── engine/                 # Framework-agnostic core (zero React deps)
│   ├── analyzer.ts         # Main analyzeText() pipeline
│   ├── scoring.ts          # Score calculation
│   ├── stats.ts            # Text statistics
│   ├── styleProfiler.ts    # Style profiling + deviation analysis
│   └── patterns/           # EN + ZH pattern definitions
├── components/             # React UI
│   ├── App.tsx             # Root (tabs, state wiring)
│   ├── AnnotatedText.tsx   # Highlighted text view
│   ├── ComparisonView.tsx  # Before/after comparison
│   ├── StyleProfileTab.tsx # Style profile container
│   ├── PDFUploader.tsx     # Drag-and-drop PDF upload
│   ├── ProfileSummary.tsx  # Metrics display
│   ├── StyleDeviationView.tsx  # Deviation diagnostics
│   ├── SentenceLengthChart.tsx # Histogram visualization
│   └── ...
├── hooks/                  # useAnalysis, useStyleProfile
├── utils/                  # PDF extraction, export
├── i18n/                   # Localization (EN + ZH)
├── types/                  # Shared TypeScript interfaces
└── styles/                 # CSS
```

The engine has **zero React dependencies** — it can be used in CLI tools, browser extensions, or any other JavaScript environment.

## Development

```bash
npm run dev          # Dev server
npm test             # Run tests (62 tests)
npm run lint         # ESLint
npm run type-check   # TypeScript strict
npm run validate     # All checks (lint + types + test + build)
npm run build        # Production build
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 |
| Language | TypeScript (strict mode) |
| Build | Vite + SWC |
| Testing | Vitest + React Testing Library |
| Linting | ESLint + Prettier |
| CI/CD | GitHub Actions |
| Deploy | GitHub Pages |
| PDF | pdfjs-dist (lazy-loaded via dynamic import) |

## FAQ

**Is this ML-based?**
No. It uses regex-based pattern matching with linguistically motivated rules.

**Is my text private?**
Yes. Everything runs in your browser. Nothing is sent to any server.

**What languages are supported?**
English and Simplified Chinese.

**Can I use the engine in my own tool?**
Yes. The `src/engine/` module has no framework dependencies. Import `analyzeText` or `extractStyleProfile` directly.

## Limitations

This is a heuristic, rule-based tool. It detects surface-level patterns, not deep semantic features. A low score doesn't guarantee the text is human-written, and a high score doesn't mean the text is bad — it means certain stylistic patterns correlate with AI-generated text.

The style profile compares quantitative metrics only. It cannot assess content quality, argument structure, or domain-specific conventions beyond what the pattern rules cover.

## License

[MIT](./LICENSE)
