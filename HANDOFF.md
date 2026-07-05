# Session Handoff — KillSwitch

> **For the next Claude session.** Read this top to bottom before writing code.
> Delete this file before the final ship (or when the user says the project is done).

## What this project is

**KillSwitch** — *"You bought it. Find out if you get to keep it."*
A consumer-rights PWA for gamers: every game gets a transparent **Survival Grade (A–F)**, plus a
Graveyard of killed games, a Publisher Accountability Index, My Shelf risk reports, Death Watch
countdowns, and per-storefront Know-Your-Rights guides. See README.md for the full pitch,
architecture, and deploy guide.

**Locked-in requirements (do not re-litigate):** web-first Vite SPA + Vercel serverless (NOT
Next.js), free-tier only, zero-knowledge sync (client-side AES-256-GCM, 12-word BIP39 recovery
phrase), works perfectly with zero accounts/keys, dataset auto-updates daily server-side,
optional donations never gate features.

## State of the build — EVERYTHING IS BUILT ✅

As of 2026-07-05 the app is **feature-complete and verified**:

- **Core engine + dataset + pipeline + services** (from the first session): `npx vitest run`
  passes 21/21; `node scripts/compose-dataset.mjs` validates 105 rated / 54 graveyard /
  58 publishers / 8 stores / 6 laws.
- **Full UI** (`src/ui/` + `src/main.tsx`, this session): hash router, all 13 routes
  (`#/`, game/:id, graveyard, publishers, publisher/:id, shelf, watch, rights, connect, sync,
  support, about, 404), dark editorial theme per spec, GradeBadge/SearchBox/FactorRow/
  Countdown/TombstoneCard/PublisherCard, SVG charts (deaths-per-year columns, publisher kill
  bars, stacked grade bar), canvas share-card PNG (1200×630) with Web Share + download fallback.
- **Connectors**: `api/connect/steam.ts` (stateless public-XML proxy, friendly 4xx errors),
  `src/services/connectors/` (framework + Steam client matching via searchGames with ≥700 score
  threshold; PSN/Epic/Xbox honest "no public API" cards).
- **PWA**: `public/manifest.webmanifest`, SVG + PNG icons (192 from canvas render, 512 drawn via
  GDI+), `public/sw.js` (cache-first shell, SWR dataset), registered in main.tsx PROD-only and
  skipped in single-file build via `import.meta.env.BUILD_SINGLE` (defined in vite.config.ts).
- **README.md** written (mission, architecture, 10-min deploy, zero-knowledge explainer,
  data-correction guide).

**Verified in a real browser** (Claude Preview, dev server + static single-file build):
every route renders with zero console errors; search "concord" → tombstone; gran-turismo-7 = F
with sp-server finding; shelf add persists across reload; share PNG generates ($130 / F×2 card);
countdowns tick live on #/watch; mobile 375px bottom-tab layout works; sync page shows
"not configured" gracefully. `npm run build` clean. Updater dry-run: expired game aged to
graveyard (loss=everything), 50 Wikipedia candidates harvested, version bumped — then data
restored.

**Fixes made this session** (beyond new code): removed unused param in `src/core/score.ts`
(`publisherRecord` no longer takes `g` — tsc noUnusedParameters); removed wrong `approx: true`
from shutdowns of aliens-fireteam-elite / nhl-22 / nhl-23 (their own notes cite exact dates;
only grid-legends and nba-2k25 are genuinely month-approximate).

## Environment notes (THIS session — Windows, differs from first session!)

- Local Windows 11 copy at
  `C:\Users\kanis\Downloads\helping-gamers-claude-gaming-problem-solver-sszrwc\helping-gamers-claude-gaming-problem-solver-sszrwc`
  (note the nested duplicate folder name). **No GitHub remote configured**; git history was
  initialized locally this session (branch `claude/gaming-problem-solver-sszrwc`). The first
  session's cloud checkout pushed the foundation to `kanishkg91/helping-gamers` — reconcile
  before pushing from here (this tree is foundation + everything new).
- `npm run build:single` uses bash env syntax; on Windows run
  `$env:BUILD_SINGLE='1'; npx vite build --outDir dist-single --emptyOutDir` instead.
  Output: `dist-single/index.html` (~610 KB, fully self-contained demo).
- Browser driving: Claude Preview MCP + `.claude/launch.json` in the OUTER folder
  (killswitch-dev on 5173, killswitch-single on 4173).

## Remaining work — TODO ⬜

1. **Push to GitHub** — user must connect the remote (or run from the original cloud checkout).
   Then Vercel import → live. Do NOT create a PR unless asked.
2. Optional polish ideas (only if asked): OG image endpoint, more dataset entries from
   `data/candidates.json` review flow.

## Gotchas & conventions (unchanged, still binding)

- **Core purity**: nothing in `src/core` may import DOM/platform/react. UI depends on core, never the reverse.
- `public/data/` is generated & gitignored; `npm run dev`/`build` regenerate via pre-hooks.
- `deriveDeadGame` logic exists in BOTH `src/core/aging.ts` and `scripts/update-dataset.mjs` — change both or neither.
- Grade thresholds: A≥85 B≥70 C≥55 D≥40 F<40; doomed ⇒ ≤5/F; dead ⇒ 0. Tests pin this.
- `approx: true` dates render month+year via `formatDate(iso, approx)`; Countdown shows a month
  tag instead of false-precision seconds.
- Grade color is ALWAYS paired with the letter — never color alone.
- Model-identity rule: never put the model id in commits/PRs/code.
- Copy voice: confident consumer-advocacy, "plain language, receipts attached."
