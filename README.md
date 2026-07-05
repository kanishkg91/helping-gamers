# ⏻ KillSwitch

**You bought it. Find out if you get to keep it.**

KillSwitch is a consumer-rights PWA for gamers. Every game gets a transparent
**Survival Grade (A–F)** answering the one question no storefront will:
*can this game be taken away from you?*

On June 16, 2026 the European Commission rejected the 1.29-million-signature
*Stop Destroying Videogames* citizens' initiative — no law, just a voluntary
code of conduct and a promise of "awareness of existing consumer rights."
**This app is that awareness, weaponized.**

## What's inside

- **Survival Grades** — search any of 100+ rated games and see the grade, the
  verdict in plain language, and the full "show the math" factor breakdown
  (server dependency, DRM, business model, publisher record, end-of-life plan,
  physical escape hatch). Every input is sourced.
- **🪦 The Graveyard** — 50+ games people paid for that no longer exist, from
  Concord (14 days) to KartRider (19 years), with a deaths-per-year chart and
  an epitaph + receipts for every grave.
- **⏱ Death Watch** — live countdowns to every announced shutdown.
- **🧾 My Shelf** — add the games you own (search, or one-click Steam import)
  and get a risk report: *"$X of my library can be switched off remotely"* —
  with a shareable PNG receipt.
- **📇 Publisher Accountability Index** — publishers ranked by body count,
  with median lifespans, dollars burned, and documented rap sheets.
- **⚖️ Know Your Rights** — what "buy" legally means on each storefront
  (GOG: A … PlayStation: D), plus the laws that are actually moving
  (California AB-1921 & AB-2426, the EU Digital Fairness Act, *The Crew* lawsuit).
- **🔐 Zero-knowledge sync (optional)** — sign in with Google, and your shelf is
  AES-256-GCM-encrypted *on your device*. The server stores an unreadable blob.
  The only key backup is a 12-word recovery phrase shown to you once.

Everything works with **zero accounts, zero API keys** — anonymous and
local-first by default. No ads, no tracking, every feature free forever.

## Architecture

```
data/*.json            hand-curated, source-cited dataset (the crown jewels)
scripts/               compose + daily update pipeline (Node, no deps)
src/core/              pure TS engine: scoring, verdicts, search, crypto…
                       (zero DOM imports — reusable in Tauri/Capacitor as-is)
src/platform/          storage/share adapters (swap per platform)
src/services/          dataset loader, user store, sync machine, connectors
src/ui/                React SPA: hash router, dark editorial theme, charts
api/connect/steam.ts   stateless Vercel function proxying Steam's public XML
supabase/migrations/   one table, owner-only RLS, nothing plaintext
.github/workflows/     daily data refresh → commit → Vercel auto-redeploy
```

- **Vite SPA + Vercel serverless functions** (deliberately not Next.js) — the
  whole app is static except one tiny proxy endpoint.
- The dataset updates **server-side daily**: a GitHub Action ages announced
  shutdowns into the graveyard, harvests Wikipedia's
  `Online games shut down in <year>` category into `data/candidates.json`
  (for human review — never auto-merged), bumps the version, and commits.
  Clients fetch `/data/dataset.json` remote-first with a bundled fallback,
  so even an offline PWA renders correct doomed/dead states client-side.

## Deploy your own (≈10 minutes, $0)

1. **Fork/import this repo into Vercel.** Framework preset: Vite. Done — the
   app, dataset, and Steam import all work with no configuration.
2. **(Optional) donations** — set any of `VITE_DONATE_KOFI`,
   `VITE_DONATE_GITHUB_SPONSORS`, `VITE_DONATE_BUYMEACOFFEE` env vars.
3. **(Optional) encrypted sync** — create a free [Supabase](https://supabase.com)
   project, then:
   - Run `supabase/migrations/001_vaults.sql` in the SQL editor.
   - Auth → Providers → enable **Google** (add your OAuth client).
   - Auth → URL Configuration → add your Vercel URL as a redirect URL.
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy.
4. **(Optional) daily data refresh** — the included GitHub Action
   (`.github/workflows/update-data.yml`) runs at 06:17 UTC daily; it needs no
   secrets beyond the default `GITHUB_TOKEN`. Vercel redeploys on its commits.

Local dev:

```sh
npm install
npm run dev        # composes public/data/dataset.json, starts Vite
npm test           # vitest — core engine suite
npm run build      # tsc --noEmit && vite build
```

## Zero-knowledge sync, honestly explained

1. Your shelf is serialized and encrypted **in the browser** with AES-256-GCM.
2. The key is derived (HKDF-SHA256) from 128 bits of entropy generated on your
   device. That entropy's only backup is a 12-word BIP39 phrase shown **once**.
3. Supabase stores `{iv, ciphertext}` — one row per user, owner-only RLS on
   every verb. There is no server code that can decrypt it, no key escrow, no
   recovery. A wrong phrase fails the GCM auth tag; a database breach leaks
   noise.

## Correcting the data

Grades are only as good as their receipts. If we got something wrong:

- Open a PR against `data/*.json` — every entry has a `sources` array; new
  claims need at least one public source.
- The daily pipeline writes newly discovered shutdowns to
  `data/candidates.json` for review — promoting a candidate into
  `graveyard.json` is always a human decision.
- Referential integrity is enforced: `node scripts/compose-dataset.mjs` must
  pass before a PR merges.

## License

MIT — take it, fork it, ship it. They can't take this one from you.
