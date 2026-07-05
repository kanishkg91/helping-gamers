# Session Handoff — KillSwitch

> **For the next Claude session.** Read this top to bottom before writing code.
> Delete this file before the final ship (or when the user says the project is done).

## What this project is

**KillSwitch** — *"You bought it. Find out if you get to keep it."*
A consumer-rights PWA for gamers: every game gets a transparent **Survival Grade (A–F)** answering one question no storefront will: **can this game be taken away from you?** Plus a Graveyard of killed games, a Publisher Accountability Index, a personal library risk report ("My Shelf"), live shutdown countdowns ("Death Watch"), and per-storefront Know-Your-Rights guides.

**Why now (all verified by web research in the previous session):**
- June 16, 2026: the European Commission formally **rejected** the 1.29M-signature "Stop Destroying Videogames" initiative — no law, just a voluntary code of conduct and "awareness of existing rights". This app IS that awareness, weaponized.
- 52 games were shut down in H1 2026 alone (Anthem died Jan 12 2026 — discs included; Highguard lived ~6 weeks; PUBG: Blindspot ~8 weeks).
- California AB-1921 ("Protect Our Games Act") passed the Assembly, now in Senate. AB 2426 (license-disclosure law) already in force. The Crew lawsuit vs Ubisoft ongoing.

**The user's requirements (all locked in, do not re-litigate):**
- Web-first PWA, deployable **free on Vercel**; architecture decoupled & cross-platform-ready (Tauri/Capacitor wrap later, no rewrite). Pure Vite SPA + Vercel serverless `/api` functions — deliberately NOT Next.js.
- **Supabase free tier** for DB + auth (Google login) with a hard rule: **zero-knowledge** — we must never be able to read user library data. Implemented: client-side AES-256-GCM, key never leaves device except as a 12-word BIP39 recovery phrase.
- Gaming-account connectors: Steam works (public-profile proxy, no API key); PSN/Epic/Xbox get honest "no public API — that's part of the problem" cards. **App must work perfectly with zero accounts/keys** (anonymous local-first; manual add is primary).
- Core dataset **updates automatically server-side** (daily GitHub Action → commits → Vercel redeploy; clients fetch `/data/dataset.json` remote-first with bundled fallback).
- Optional **donations** (Ko-fi/GitHub Sponsors/BMC via `VITE_DONATE_*` env), never gating any feature.
- User said "don't ask me questions, full go-ahead" — build autonomously, blow minds. Deliverables: pushed branch + live Artifact demo.

## State of the build — DONE ✅

Everything below is written, and **`npx vitest run` passes 21/21**; `node scripts/compose-dataset.mjs` validates:
`dataset v1 (2026-07-04): 105 rated, 54 in the graveyard, 58 publishers, 8 stores, 6 laws`.

- **Scaffold**: `package.json` (React 19, Vite 8, TS 6, vitest, @supabase/supabase-js, vite-plugin-singlefile, @vercel/node; scripts incl. `predev`/`prebuild` → compose, `build:single` for the Artifact demo), `tsconfig.json`, `vite.config.ts` (BUILD_SINGLE env toggles single-file build), `index.html` (meta/OG/inline power-symbol favicon), `vercel.json` (CDN caching for `/data/*`, no-cache for `sw.js`), `.env.example`, `.gitignore` (ignores generated `public/data/`).
- **Core engine (`src/core/`)** — pure TS, zero DOM imports (this purity is a hard rule):
  - `types.ts` (full domain model), `format.ts`, `score.ts` (conditional weighted factors → 0–100 → A–F; shutdown announced ⇒ doomed/F; passed ⇒ dead/0), `verdicts.ts` (plain-language generator, deterministic headline pick), `publisherStats.ts` (kill counts/median lifespan/score from graveyard; refunds soften penalty), `search.ts` (tiered fuzzy: exact>prefix>word>substring>tokens>subsequence; aliases; diacritic-stripping), `aging.ts` (`applyAging` moves expired games to graveyard; loss = everything iff `online==='required' || spServerDependent`), `sync.ts` (union merge, earliest addedAt wins), `vault.ts` (128-bit entropy ⇄ 12-word BIP39 phrase w/ checksum; HKDF-SHA256 → AES-256-GCM; base64 helpers, no Buffer), `wordlist.ts` (2048 BIP39 words, vendored).
  - `engine.test.ts` — 21 passing tests covering all the above.
- **Dataset (`data/`)** — the crown jewels, all entries source-cited:
  - `games.json` (105 rated; includes 5 **doomed** Death Watch entries with real dates: Aliens: Fireteam Elite †2026-08-05 (becomes fully unplayable), NHL 22 & NHL 23 †2026-08-31 (online modes), GRID Legends †~2026-09-30 approx, NBA 2K25 †~2026-12-31 approx), `graveyard.json` (54 dead games, Concord 14 days → KartRider 19 years), `publishers.json` (58, with rap sheets; Ubisoft has the "comfortable not owning" quote), `stores.json` (8: GOG=A … PlayStation/Nintendo/EA App=D, physical=B), `laws.json` (6: EU ECI response, Digital Fairness Act, AB-1921, AB-2426, Crew lawsuit, UK petition), `meta.json` (version 1, updated 2026-07-04).
  - Convention: `approx: true` on dates known only to month precision (render month+year).
- **Pipeline**: `scripts/lib.mjs` (load/validate/compose — strict referential integrity), `scripts/compose-dataset.mjs` (→ `public/data/dataset.json`, runs via npm pre-hooks), `scripts/update-dataset.mjs` (1. ages doomed→graveyard [logic mirrored from `core/aging.ts` — keep in sync], 2. harvests Wikipedia category `Online games shut down in <year>` via MediaWiki API into `data/candidates.json` for **human review, never auto-merge**, 3. bumps version), `.github/workflows/update-data.yml` (daily 06:17 UTC cron + manual dispatch; commits `data/` if changed → Vercel auto-redeploys). The Wikipedia API was tested live and works.
- **Platform adapters (`src/platform/`)**: `storage.ts` (KeyValueStore interface + localStorage impl w/ private-mode fallbacks), `share.ts` (Web Share w/ download fallback for PNG blobs).
- **Services (`src/services/`)**: `datasetLoader.ts` (bundled snapshot import from `../../data/*.json` + remote-first fetch of `BASE_URL + data/dataset.json`, client-side aging applied either way), `userStore.ts` (reactive store + `useUserState()` hook; add/remove shelf, toggleWatch), `syncService.ts` (full zero-knowledge machine: phases `unconfigured|signed_out|needs_vault|needs_phrase|ready`; Google OAuth PKCE `signInWithGoogle`; `createVault()` returns the 12 words to show ONCE; `unlockWithPhrase` validates against remote ciphertext; `syncNow` pull→merge→push; 4s debounced auto-push on store changes; `forgetVaultKeyOnThisDevice`).
- **Supabase**: `supabase/migrations/001_vaults.sql` — single `vaults` table (user_id PK, iv, ciphertext, version, updated_at), owner-only RLS on all four verbs, touch trigger. Nothing plaintext, by design.

## Remaining work — TODO ⬜ (in this order)

1. **The entire UI** (`src/ui/` — nothing exists yet) + `src/main.tsx`. Decisions already made:
   - Hand-rolled **hash router**. Routes: `#/`, `#/game/:id`, `#/graveyard`, `#/publishers`, `#/publisher/:id`, `#/shelf`, `#/watch`, `#/rights`, `#/connect`, `#/sync`, `#/support`, `#/about` (methodology/"show the math" explainer), 404.
   - **Dark-only editorial theme** (deliberate commitment): bg `#0a0c0f`, cards `#12161d`, borders `#222a35`, ink `#e9edf3`/dim `#9aa7b5`, brand red `#ff4545`, grade colors A `#2fd483` B `#a6d34d` C `#f5b83d` D `#f28444` F `#f4655f` (grade color ALWAYS paired with the letter — never color alone). `system-ui` sans (heavy weights for display), `ui-monospace` for data labels/dates. Max-width ~1100px, sticky top nav (desktop), bottom tab bar on mobile (<720px): Home, Graveyard, Watch, Shelf, More.
   - Components: GradeBadge (sm/lg), SearchBox w/ ranked dropdown (uses `searchGames`, shows rated + dead hits), FactorRow ("show the math" expandable), Countdown (live ticking), TombstoneCard, PublisherCard, charts, ShareCard.
   - **Charts** (dataviz skill was loaded; rules honored): single-series = ONE hue + direct labels + hover tooltips; no dual axes; deaths-per-year column chart on Graveyard (brand red on dark passes contrast); Shelf risk breakdown = grade-colored stacked bar/donut with letters+counts visible; publisher kill-count horizontal bars. Text in ink colors, never series color.
   - **My Shelf share card**: canvas-rendered PNG (1200×630), grade distribution + "$X of my library can be switched off remotely" + app name; `sharePngBlob()`.
   - Page content pulls from dataset + `computeAllPublisherStats(dataset, nowISO)` + `computeGraveyardTotals`; `scoreGame(game, stats.get(publisherId), nowISO)` + `buildVerdict(...)`. `nowISO = new Date().toISOString().slice(0,10)`.
   - Home: big search, headline stats (deaths this year — computed, currently 14 in 2026 incl. aged entries; total graveyard; shortest life = Concord 14 days), EU-ruling banner line, grade-A vs grade-F contrast strip, links into sections.
2. **Connectors** (`src/services/connectors/` + `api/connect/steam.ts` + Connect page):
   - `api/connect/steam.ts` (Vercel Node function, `@vercel/node` types): GET `?id=<vanity-or-steamid64>` → fetch `https://steamcommunity.com/id/<vanity>/games?tab=all&xml=1` (or `/profiles/<id64>/...`), parse XML for `<game><appID><name>`, return JSON `{games:[{appid,name}]}`; map private/empty → friendly 4xx JSON error. No key, no storage, request/response only. Client connector matches returned names against dataset via `searchGames`, adds matches to shelf, reports unmatched count honestly.
   - PSN/Epic/Xbox cards: status `unavailable`, copy explains no consumer export API exists and links Rights page. Framework interface in `src/services/connectors/types.ts`.
3. **PWA**: `public/manifest.webmanifest` (name KillSwitch, theme `#0a0c0f`, icons), generate `public/icons/icon-192.png`/`icon-512.png` (+ maskable) from the power-symbol SVG (node canvas not installed — either write SVG→PNG via Playwright screenshot trick or ship SVG icons; manifest accepts SVG for most but include PNG for iOS via simple render), `public/sw.js` (cache-first app shell, stale-while-revalidate for `/data/dataset.json`), register in `main.tsx` inside try/catch (must not break single-file demo build).
4. **Support page** + footer: donation links from `import.meta.env.VITE_DONATE_*` (already in `.env.example`); "every feature is free forever" copy; no gating anywhere.
5. **README.md**: mission + screenshots + architecture diagram (text) + 10-minute deploy guide (Vercel import → set env vars optional → done; Supabase: run migration SQL, enable Google provider, add redirect URL) + zero-knowledge explainer + data-correction PR guide (link `data/candidates.json` flow).
6. **Verify** (task list #8): `npm run build` clean (tsc + vite); vitest green; **Playwright** drive (Chromium at `/opt/pw-browsers`, launch `executablePath: '/opt/pw-browsers/chromium'` if needed, PLAYWRIGHT_BROWSERS_PATH already set): load every route, search "concord" → tombstone, open `#/game/gran-turismo-7` (should be D/F with sp-server finding), add to shelf → localStorage persists across reload, share-card PNG generates, countdown ticks on `#/watch` (NHL 22 ~58 days from 2026-07-04), 375px + desktop screenshots of every page for the final summary. Updater dry-run: temporarily set a doomed game's date to yesterday → `node scripts/update-dataset.mjs` moves it to graveyard (then `git checkout -- data`).
7. **Ship**: commit & push to `claude/gaming-problem-solver-sszrwc` (this handoff commit already pushed the foundation; push -u origin, retry w/ backoff on network errors; do NOT create a PR unless the user asks). Then `npm run build:single` → `dist-single/index.html` → **Artifact** (load `artifact-design` skill first; favicon suggestion "⏻" isn't emoji — use "🎮" or "💀"; CSP blocks network so the bundled dataset + unconfigured sync mode carry the demo; Supabase phases show "not configured" gracefully — verify that looks good in the demo). Final chat summary: lead with demo link + what it is; include screenshots.

## Gotchas & conventions

- **Core purity**: nothing in `src/core` may import DOM/platform/react. UI depends on core, never the reverse.
- `public/data/` is **generated & gitignored**; never hand-edit; `npm run dev`/`build` regenerate it via pre-hooks.
- Supabase OAuth: PKCE flow returns `?code=` (query, not hash) so it won't fight the hash router; after `initSync()` resolves you may want to strip the query with `history.replaceState`. `initSync()` must be called once at app boot (main.tsx) — it's written but not yet wired.
- The `deriveDeadGame` logic exists in BOTH `src/core/aging.ts` and `scripts/update-dataset.mjs` (JS mirror, commented) — change both or neither.
- Grade thresholds: A≥85 B≥70 C≥55 D≥40 F<40; doomed forces F/≤5; dead forces 0. Weights renormalize when EOL factor is dropped for fully-offline games. Tests pin all this.
- Dates with `approx: true` render as "May 2026" via `formatDate(iso, approx)`.
- Model-identity rule: never put the model id in commits/PRs/code.
- User's stated wish: impressive, non-basic, dead-simple for non-technical users. Polish matters as much as function. The copy voice is confident consumer-advocacy ("plain language, receipts attached") — match the existing dataset epitaphs/verdicts.

## Quick env notes

- Node 22, npm 10. Playwright Chromium preinstalled at `/opt/pw-browsers` (`chromium`, `chromium_headless_shell`); do NOT `playwright install`.
- Outbound HTTPS via proxy w/ CA bundle `/root/.ccr/ca-bundle.crt` (curl needs `--cacert` sometimes). WebFetch 403s on many news sites; WebSearch works. Wikipedia API works direct.
- GitHub via MCP tools only (no `gh`). Branch: `claude/gaming-problem-solver-sszrwc` (repo `kanishkg91/helping-gamers`, currently has no other content).
- Scratchpad: `/tmp/claude-0/-home-user-helping-gamers/6efbd21a-2ecf-53e9-9b01-d3bd300c246c/scratchpad`.
