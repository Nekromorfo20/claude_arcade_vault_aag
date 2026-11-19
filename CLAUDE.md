# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Arcade Vault** is a retro-neon arcade platform where users play browser mini-games and compete on a leaderboard ("Salón de la Fama"). Copy and UI strings are in Spanish — write new UI copy, spec files, and code comments in Spanish too.

The product is built: Next.js 16 App Router + React 19, Supabase (auth + Postgres) for accounts/scores, Resend for the contact form, and four real playable games (Asteroides, Tetris, Arkanoid, Serpiente). The static prototype in `references/templates/` has already been ported and now serves only as the visual/UX reference, not as the plan.

`npm run lint` reports errors inside `references/templates/*.jsx` (undefined `React`, undefined components) — expected, since those files are CDN-React prototype code excluded from the compiled app; don't try to "fix" them into lint-clean state. There is no test runner configured; verification is `npm run lint && npm run build` plus manual play-through.

## Commands

- `npm run dev` — dev server (Turbopack).
- `npm run build` / `npm start` — production build and serve.
- `npm run lint` — ESLint (see caveat above about `references/`).

## Spec-driven workflow

Non-trivial features go through a spec first. Skills live in `.agents/skills/` (mirrored into `.claude/skills/`), originally based on https://github.com/Klerith/fernando-skills. Subagents live in `.claude/agents/`.

For a new game the full chain is `game-planner` (which game?) → `/port-game` (write the spec) → `/spec-impl` (build it). Each stage stops at its own boundary: the planner never writes a spec, and `/port-game` never writes app code.

- `/spec` — write a spec into `specs/NN-slug.md`, status `Borrador`.
- `/spec-impl NN-slug` — implement an approved spec. `specs/.spec-config.yml` has `AutoCreateBranch: true`, so it creates/switches to `spec-NN-slug` without asking.
- `game-planner` — subagent (`.claude/agents/game-planner.md`) that decides **which** game to port next: it scores candidates against fit criteria and recommends one. Keeps memory of past suggestions in `references/game-suggestions-todo.md`. Runs before `/port-game`; it never writes specs or app code.
- `/port-game` — project-specific skill (`.agents/skills/port-game/SKILL.md`) that analyzes a source game and generates a porting + Supabase-leaderboard spec following the 05/07/08/09 pattern. It only writes a spec; it never writes app code.
- `/frontend-design` — always use it when designing or reshaping UI.

Existing specs (all `Implementado`): `01` MVP visual · `02` home landing · `03` about + contacto · `04` Supabase base · `05` Asteroides · `06` leaderboard + tabla de juegos · `07` Tetris · `08` Arkanoid · `09` Serpiente.

## Architecture

### Routes (`app/`)

| Route                       | Component                     | Notes                              |
| --------------------------- | ----------------------------- | ---------------------------------- |
| `/`                         | `components/home.tsx`         | landing                            |
| `/biblioteca`               | `components/library.tsx`      | catalog, grid/table toggle         |
| `/juego/[id]`               | `components/game-detail.tsx`  | detail; 404s on unknown id         |
| `/juego/[id]/jugar`         | per-game player               | if-chain selecting the real engine |
| `/salon`                    | `components/hall-of-fame.tsx` | top-10 per game from Supabase      |
| `/ingresar`                 | `components/auth.tsx`         | sign in / sign up                  |
| `/acerca-de`                | `components/about.tsx`        | about + contact form               |
| `/api/contacto`             | route handler                 | sends mail via Resend              |
| `/api/supabase-healthcheck` | route handler                 | session smoke test                 |

see `references/implemented-games.md` when you need to check which games are implemented and how to implement new ones; `references/game-suggestions-todo.md` records which games were already evaluated as candidates and with what verdict.

`app/layout.tsx` loads the pixel/mono fonts (`Press_Start_2P`, `JetBrains_Mono`, `Courier_Prime`) as CSS variables, renders `Nav` inside `<Suspense>`, and the neon background/noise/footer chrome. Dynamic pages wrap their content in `<Suspense>` and `await params` (Next 16 async params).

`next.config.ts` enables `cacheComponents` and `partialPrefetching`, plus `experimental.agentFeedback` (which is what writes the `AGENTS.md` blocks — commit them, don't strip them).

### Data layer

- `lib/data.ts` — `GAMES` catalog array (`Game`: id, title, short, long, cat, cover, color, best, plays) plus `CATS`, `PLAYERS`, and `seededScores()`. Entries are a mix of **mock** games (visual-only placeholders like `rocas`, `serpentina`, `gloton`) and **real** games. Never rename or delete a mock entry when porting its real counterpart — add a new id alongside it.
- `lib/scores.ts` — Supabase reads/writes: `getRealGames`, `saveScore`, `getTopScores`, `getGameStats`, `getMyBestRank`.
- `lib/supabase/{client,server,middleware}.ts` — `@supabase/ssr` clients; `middleware.ts` at the root refreshes the session on every non-asset request.

### Supabase schema (`supabase/migrations/`)

- `profiles` — 1:1 with `auth.users`, holds `username` (uppercased, max 10 chars, set at sign-up).
- `games` — real-game catalog (`id` text PK). Only real games are seeded here; mock catalog entries exist solely in `lib/data.ts`.
- `scores` — `game_id` + `user_id` + `score`, indexed `(game_id, score desc)`.

RLS is on for all three: public select, own-row insert/update. The schema is generic — **adding a game needs only an `insert into public.games (...)` migration, never new DDL.** Apply migrations with `mcp__supabase__apply_migration` and re-check `mcp__supabase__get_advisors` afterwards.

### Game engine contract

Every real game lives in `components/games/<id>-player.tsx` as a `"use client"` component wrapping a plain `class <Name>Engine` that owns the canvas loop. The engine never touches the DOM or React state directly — it reports out through two callbacks:

```ts
onStatsChange: (score: number, a: number, b: number) => void; // fields vary per game
onStateChange: (state: GameState) => void; // "playing" | "paused" | "gameover" (+ "win" for Arkanoid)
```

Shared conventions:

- Engines dedupe callback emissions (`lastReported*` fields) so React doesn't re-render every frame.
- Canvas physics runs in fixed logical coordinates; CSS scales the canvas. Mouse-driven games must map coordinates through `getBoundingClientRect()`.
- Mount `useEffect` cancels the RAF loop and removes listeners on cleanup; the `[paused]` effect resets `lastTime` on resume so no delta-time jump occurs.
- **Score saving is always manual.** On game over, show the existing modal and let the player confirm "Guardar puntuación"; if there's no session, offer `/ingresar`. No auto-insert, no `localStorage` fallback.
- Assets go in `public/<game>/` and need SSR guards (`typeof window !== "undefined"`) before `new Image()` / `new Audio()` — App Router renders these modules on the server.
- Reuse existing CSS chrome (`av-player`, `player-hud`, `crt`, `crt-screen`, `modal-bd`). A game-specific stat extends the HUD row; it doesn't get a new widget.

Adding a real game touches four places: `lib/data.ts` (catalog entry), `app/juego/[id]/jugar/page.tsx` (one more `if (game.id === …)` branch), `REAL_GAME_IDS` in `components/library.tsx`, and a seed migration. The if-chain is kept for minimal diffs; with four games already ported, a `Record<string, Component>` registry is worth evaluating next time.

### Styling

Tailwind CSS v4 via `@tailwindcss/turbopack` (a Turbopack loader rule in `next.config.ts`, not a `tailwind.config.js`). The real theme is hand-written CSS in `app/globals.css` (~2.8k lines): neon custom properties (`--cyan`, `--magenta`, `--green`, `--yellow`, `--gold`…), `pixel`/`mono` font vars, and all the `av-*` / `cover-*` component classes. Components mostly use these classes plus inline styles — not Tailwind utilities. Existing covers: `cover-arkanoid`, `cover-bricks`, `cover-duelo`, `cover-glot`, `cover-invaders`, `cover-rana`, `cover-rocas`, `cover-snake`, `cover-tetro`.

### TypeScript

Path alias `@/*` maps to the repo root (see `tsconfig.json`).

## Tooling

- `.claude/hooks/format-on-write.sh` (PostToolUse on Write|Edit) runs Prettier, then ESLint `--fix` for JS/TS, then **strips all blank lines** and re-formats. Written code ends up dense with no blank lines — that's intentional, don't fight it or re-add spacing.
- `.mcp.json` configures the **supabase** MCP server (project `jkmqjfliuqbqazakqdsq`); it's enabled in `.claude/settings.local.json`. Use it for migrations, SQL, logs, and advisors.
- `.env.example` lists required vars: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `AGENTS.md` is generated by `next dev` (agentFeedback). Commit it with your work rather than deleting the blocks.

## References

- `references/templates/` — the original CDN-React prototype (hash router, `window.X` globals, `localStorage` session). Already ported; consult it for visual language only, never copy its idioms.
- `references/started-games/` — source games to port (`02-asteroids`, `03-tetris`, `04-arkanoid` are all done). New sources land here.
- `references/source-assets/` — raw sprites/audio before they're moved into `public/`.
- `references/game-suggestions-todo.md` — the `game-planner` subagent's memory: which games were evaluated, with what verdict and when. Read it before proposing a next game; never delete historical rows.
