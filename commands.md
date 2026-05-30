# commands.md

Handy commands for working on this project.

## Setup

```bash
npm install                  # install dependencies
```

Create `.env.local` with a key for at least one provider:

```bash
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
```

## Development

```bash
npm run dev                  # start the dev server (Turbopack) on :3000
npm run build                # production build
npm run start                # serve the production build
```

## Quality

```bash
npm run lint                 # run ESLint
npx tsc --noEmit             # type-check without emitting
```

## Testing

```bash
npm test                     # run all tests once (vitest run)
npm run test:watch           # watch mode (re-run on change)
```

Targeted runs:

```bash
npx vitest run tests/models.test.ts          # a single file
npx vitest run tests/components              # a directory
npx vitest run -t "submits trimmed text"    # tests matching a name
```

Tests live under `tests/`, mirroring the `app/` layout.
