# Humanize

**Detect AI-typical patterns in your writing. Get actionable rewrite suggestions.**

Humanize scans English and Chinese text for surface-level AI patterns — filler phrases, hedge words, overused connectors, template expressions, and passive voice — and highlights them with specific suggestions for improvement.

No ML model, no server calls, no login. Runs entirely in your browser.

## Features

- **5 pattern categories** — filler, hedging, connectors, templates, passive voice
- **Annotated highlighting** — color-coded inline markers with hover tooltips
- **Actionable suggestions** — each highlight explains *why* it's flagged and *how* to fix it
- **AI-likeness score** — 0–100 score based on pattern density, sentence uniformity, and more
- **Text statistics** — word count, sentence variation coefficient, pattern breakdown
- **English + Chinese** — separate pattern sets for each language
- **Offline-first** — everything runs client-side, your text never leaves the browser
- **Responsive** — works on desktop and mobile

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

The score (0–100) is a weighted composite of:
- Pattern density relative to word count (40%)
- Sentence length uniformity (25%)
- Excess formal connectors (15%)
- Filler phrase density (10%)
- Template expression density (10%)

## Architecture

```
src/
├── engine/              # Framework-agnostic core
│   ├── analyzer.ts      # Main analyzeText() function
│   ├── patterns/        # EN + ZH pattern definitions
│   ├── scoring.ts       # Score calculation
│   └── stats.ts         # Text statistics
├── components/          # React UI
├── hooks/               # React hooks
├── i18n/                # Localization (EN + ZH)
├── types/               # Shared TypeScript interfaces
└── styles/              # CSS
```

The engine has **zero React dependencies** — it can be used in CLI tools, browser extensions, or any other JavaScript environment.

## Development

```bash
npm run dev          # Dev server
npm test             # Run tests
npm run test:coverage # Tests with coverage
npm run lint         # ESLint
npm run type-check   # TypeScript
npm run validate     # All checks
npm run build        # Production build
```

## Tech Stack

- React 18 + TypeScript (strict mode)
- Vite + SWC
- Vitest + React Testing Library
- ESLint + Prettier
- GitHub Actions CI/CD
- GitHub Pages deployment

## FAQ

**Is this ML-based?**
No. It uses regex-based pattern matching with linguistically motivated rules.

**Is my text private?**
Yes. Everything runs in your browser. Nothing is sent to any server.

**What languages are supported?**
English and Simplified Chinese (v1.0).

**Can I use the engine in my own tool?**
Yes. The `src/engine/` module has no framework dependencies. Import `analyzeText` directly.

## Roadmap

- [ ] Browser extension (Chrome, Firefox)
- [ ] CLI tool (`npx humanize-cli check text.txt`)
- [ ] Configurable rules UI
- [ ] Before/after comparison mode
- [ ] Export diagnostic report
- [ ] More languages

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
