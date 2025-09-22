# Repository Guidelines

## Project Structure & Module Organization
- Root: workspace-managed monorepo (`workspaces: packages/*`).
- `packages/api`: Express API entry at `server.js`.
- `packages/cli`: Node-based CLI at `index.js`.
- `packages/core`: Shared logic (e.g., `simulation-engine.js`).
- Config: `.env` in repo root for shared environment variables.

## Build, Test, and Development Commands
- `npm run dev`: Runs API (with `nodemon`) and CLI concurrently for local development.
- `npm run api`: Starts API in watch mode (`packages/api/server.js`).
- `npm run cli`: Runs CLI (`packages/cli/index.js`).
- `npm start`: Starts API without watch (production-ish run).
Examples:
```
npm install
npm run dev         # API + CLI in watch
npm start           # API only
```

## Coding Style & Naming Conventions
- Language: Node.js (ES modules not enforced; current files are CommonJS style).
- Indentation: 2 spaces; keep lines < 100 chars.
- Naming: camelCase for variables/functions, PascalCase for classes, kebab-case for multiword files (e.g., `simulation-engine.js`).
- Imports: group Node/core, third-party, then local modules.
- Lint/format: No tool is configured; keep diffs small and consistent. Prefer single quotes and trailing commas where valid.

## Testing Guidelines
- Framework: Not set up yet. Prefer Jest or Vitest per package.
- File names: `*.test.js` next to source or under `__tests__/`.
- Commands: add `"test": "jest"` (or `vitest`) to each package when introducing tests.
- Coverage: Target ≥80% for new modules; focus on `packages/core` first.

## Commit & Pull Request Guidelines
- Commits: Short imperative subject (≤72 chars), optional scope. Example: `api: add /health route`.
- PRs: Clear description, linked issue (e.g., `Closes #123`), testing notes, and screenshots/CLI output if applicable.
- Small, focused PRs; include update notes for `.env` or breaking changes.

## Security & Configuration Tips
- Environment: Define `OPENAI_API_KEY` and `PORT` in root `.env`. Do not commit secrets.
- Network: The API uses `cors`; restrict origins for non-local deployments.
- Errors: Avoid leaking provider responses; sanitize logs before printing.

