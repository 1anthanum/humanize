# Contributing to Humanize

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/humanize.git
cd humanize
npm install
npm run dev      # Start dev server at localhost:5173
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run validate` | Run all checks (types + lint + test + build) |

## Architecture

The project separates the **analysis engine** from the **UI**:

- `src/engine/` — Framework-agnostic detection logic. No React imports. Can be used standalone.
- `src/components/` — React UI components.
- `src/types/` — Shared TypeScript interfaces.

When adding new detection patterns, edit files in `src/engine/patterns/`. Each pattern needs:
- A regex (`re`) — tested against the input text
- A tip (`tip`) — shown to the user as a rewrite suggestion

## Adding a New Pattern

1. Open `src/engine/patterns/en.ts` (or `zh.ts` for Chinese)
2. Add your pattern to the appropriate category array
3. Add a test case in `src/engine/__tests__/analyzer.test.ts`
4. Run `npm test` to verify

## Pull Request Guidelines

- Run `npm run validate` before submitting
- Add tests for new patterns or features
- Keep PRs focused — one feature or fix per PR
