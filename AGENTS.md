# sd — Next.js chat app

## Next.js version

This is **Next.js 16.2.9**, which differs from public docs. Read the bundled guide before writing any code:

```
node_modules/next/dist/docs/
```

Heed deprecation notices.

## Commands

| Action | Command |
|--------|---------|
| dev server | `npm run dev` |
| build | `npm run build` |
| lint | `npm run lint` (ESLint 9) |
| typecheck | `npx tsc --noEmit` (no npm script) |

No test framework is installed.

## Stack notes

- **Tailwind v4** — uses `@theme` directive and `@tailwindcss/postcss` plugin; not the old `@tailwind` / `tailwind.config.js` approach
- **State management** — zustand v5
- **Fonts** — Geist via `next/font/google`; also hardcodes `'JetBrains Mono', monospace` inline
- **App Router** — `app/` directory layout
- **Package manager** — npm (lockfile present)

## Skills

Superpowers skills are installed (see `skills-lock.json`). Use the `skill` tool when relevant. `CLAUDE.md` delegates to this file.
