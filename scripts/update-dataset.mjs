/**
 * Server-side dataset updater — run daily by .github/workflows/update-data.yml.
 *
 * What it does, fully automatically:
 *  1. AGES the data: any rated game whose announced shutdown date has passed
 *     is moved into the graveyard (mirrors src/core/aging.ts, which does the
 *     same presentation-side so even stale clients render correctly).
 *  2. HARVESTS candidates: queries Wikipedia's "Online games shut down in
 *     <year>" category via the public MediaWiki API and records any title we
 *     don't already track into data/candidates.json for human review.
 *     Candidates are NEVER auto-merged — facts get checked by a person.
 *  3. Bumps the dataset version stamp when anything changed, so clients and
 *     CDNs pick up the new dataset.json on the next visit.
 *
 * Committing the result is left to the workflow, which pushes the change and
 * lets Vercel redeploy — that's what makes every installed client update
 * without an app update.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  DATA_DIR,
  loadParts,
  saveParts,
  validate,
  composeDataset,
  writePublicDataset,
} from './lib.mjs';

const now = new Date();
const todayISO = now.toISOString().slice(0, 10);

// ---------- 1. age doomed games into the graveyard ----------
// Keep in sync with deriveDeadGame() in src/core/aging.ts.
function deriveDeadGame(g) {
  const loss = g.online === 'required' || g.spServerDependent ? 'everything' : 'online_only';
  return {
    id: g.id,
    title: g.title,
    publisherId: g.publisherId,
    released: `${g.year}-01-01`,
    died: g.shutdown.date,
    approx: true,
    priceUSD: g.priceUSD,
    model: g.model,
    loss,
    epitaph:
      g.shutdown.note ??
      `Servers switched off as announced. ${loss === 'everything' ? 'Nothing remains playable.' : 'Offline portions survive.'}`,
    sources: g.sources,
  };
}

function ageParts(parts) {
  const isDead = (g) => g.shutdown && Date.parse(g.shutdown.date) <= now.getTime();
  const dying = parts.games.filter(isDead);
  if (dying.length === 0) return 0;
  const existing = new Set(parts.graveyard.map((g) => g.id));
  parts.games = parts.games.filter((g) => !isDead(g));
  for (const g of dying) {
    if (!existing.has(g.id)) parts.graveyard.push(deriveDeadGame(g));
    console.log(`aged into graveyard: ${g.title} (died ${g.shutdown.date})`);
  }
  return dying.length;
}

// ---------- 2. harvest shutdown candidates from Wikipedia ----------
async function fetchCategoryMembers(year) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&list=categorymembers' +
    `&cmtitle=${encodeURIComponent(`Category:Online games shut down in ${year}`)}` +
    '&cmlimit=200&format=json&origin=*';
  const res = await fetch(url, { headers: { 'user-agent': 'killswitch-data-bot/1.0' } });
  if (!res.ok) throw new Error(`wikipedia api ${res.status}`);
  const json = await res.json();
  return (json.query?.categorymembers ?? [])
    .filter((m) => m.ns === 0)
    .map((m) => ({ title: m.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}` }));
}

function normTitle(t) {
  return t
    .toLowerCase()
    .replace(/\s*\((video game|video game series|\d{4} video game)\)\s*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function harvestCandidates(parts) {
  const known = new Set([
    ...parts.games.map((g) => normTitle(g.title)),
    ...parts.graveyard.map((g) => normTitle(g.title)),
  ]);
  const candidatesPath = join(DATA_DIR, 'candidates.json');
  const file = existsSync(candidatesPath)
    ? JSON.parse(readFileSync(candidatesPath, 'utf8'))
    : { note: 'Auto-harvested shutdown candidates awaiting human review. Never merged automatically.', candidates: [] };
  const already = new Set(file.candidates.map((c) => normTitle(c.title)));

  let added = 0;
  for (const year of [now.getFullYear(), now.getFullYear() - 1]) {
    let members = [];
    try {
      members = await fetchCategoryMembers(year);
    } catch (err) {
      console.warn(`wikipedia harvest failed for ${year}: ${err.message}`);
      continue;
    }
    for (const m of members) {
      const key = normTitle(m.title);
      if (known.has(key) || already.has(key)) continue;
      file.candidates.push({ title: m.title, source: m.url, year, foundOn: todayISO });
      already.add(key);
      added++;
    }
  }
  if (added > 0) {
    writeFileSync(candidatesPath, JSON.stringify(file, null, 2) + '\n');
    console.log(`harvested ${added} new shutdown candidate(s) into data/candidates.json`);
  }
  return added;
}

// ---------- run ----------
const parts = loadParts();
const aged = ageParts(parts);
const harvested = await harvestCandidates(parts);

if (aged > 0 || parts.meta.updated !== todayISO) {
  if (aged > 0) parts.meta.version += 1;
  parts.meta.updated = todayISO;
  saveParts(parts);
}

validate(parts);
writePublicDataset(composeDataset(parts));
console.log(
  `update complete: ${aged} game(s) aged, ${harvested} candidate(s) harvested, dataset v${parts.meta.version}`,
);
