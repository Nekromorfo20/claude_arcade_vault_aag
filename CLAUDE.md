# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Arcade Vault** (`Arcade Vault` in `references/templates/Arcade Vault.html`) is a retro-neon arcade platform where users play browser mini-games and compete on a leaderboard ("Salón de la Fama"). Copy and UI strings are in Spanish.

The repo currently is an unmodified `create-next-app` scaffold (`app/page.tsx` is still the default Next.js welcome page) — the real product has not been built yet. The intended design and data model live as static HTML/JSX reference mockups in `references/templates/`, which future work should port into the Next.js `app/` directory.

There is no test runner configured in this repo yet. `npm run lint` currently reports errors inside `references/templates/*.jsx` (undefined `React`, undefined components) — expected, since those files are CDN-React prototype code, not part of the compiled app; don't try to "fix" them into lint-clean state.

## Spec-driven workflow

This project follows a spec-driven design flow using `/spec` and `/spec-impl` commands, based on https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). Prefer writing/updating a spec before implementing non-trivial features if these commands are available.

## Architecture

### Current state vs. target

- `app/layout.tsx` + `app/page.tsx`: default Next.js App Router boilerplate (Geist fonts, Tailwind). Not yet reflecting the Arcade Vault UI.
- `references/templates/`: a standalone (non-Next.js, CDN React via `React.createElement`/global `window.X` assignments, no bundler) prototype of the full app. Treat this as the design/behavior spec to translate into proper Next.js components — don't copy it verbatim (no `window.Foo = Foo` globals, no hash-based router, no CDN React idioms in the real app).

### Reference prototype structure (`references/templates/`)

The prototype is a single-page app assembled from global-scope scripts, meant to be read as a cohesive spec:

- `data.jsx` — mock data: a `GAMES` array (id, title, short/long description, category, cover art key, accent color, best score, play count) that stands in for a future games database/API.
- `app.jsx` — root `App` component and routing. Uses a hand-rolled hash-based router (`location.hash` holds a JSON-encoded `{ name, ...params }` route object) and `localStorage` for session (`av_user`) and score persistence (`av_scores`). Routes: `biblioteca` (library/home), `detalle` (game detail), `player` (game player/runner), `auth` (login), `salon` (hall of fame / leaderboard).
- `nav.jsx` — top nav + mobile slide-out panel, highlights active route, shows credits counter and auth state.
- `biblioteca.jsx` — game library/browse grid.
- `detalle.jsx` — single game detail page.
- `reproductor.jsx` — the actual game player/runner screen.
- `salon.jsx` — Hall of Fame / global leaderboard.
- `auth.jsx` — login/sign-up screen.
- `styles.css` — neon/pixel-art visual theme (CSS custom properties for neon colors: cyan, magenta, green, yellow; `pixel`/`mono` typography classes).
- `Arcade Vault.html` — the shell that wires all the above scripts together outside of Next.js.

When implementing real features, map these concerns onto Next.js App Router conventions (file-based routes under `app/`, real data fetching instead of the `GAMES` mock, proper auth instead of `localStorage`), while preserving the visual language and UX flows the prototype defines.

### Styling

Tailwind CSS v4 via `@tailwindcss/turbopack` (configured in `next.config.ts` as a Turbopack loader rule for `*.css`, not a `tailwind.config.js`). Dark mode is used (`dark:` variants present in `app/layout.tsx`/`app/page.tsx`).

### TypeScript

Path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Skills
Always use /frontend-design to design the user interface.