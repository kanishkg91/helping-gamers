/**
 * Shared helpers for the dataset pipeline (plain ESM so it runs in CI
 * without a build step).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = join(ROOT, 'data');

const PARTS = ['games', 'graveyard', 'publishers', 'stores', 'laws'];

export function loadParts() {
  const parts = {};
  for (const name of PARTS) {
    parts[name] = JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8'));
  }
  parts.meta = JSON.parse(readFileSync(join(DATA_DIR, 'meta.json'), 'utf8'));
  return parts;
}

export function saveParts(parts) {
  for (const name of PARTS) {
    writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(parts[name], null, 2) + '\n');
  }
  writeFileSync(join(DATA_DIR, 'meta.json'), JSON.stringify(parts.meta, null, 2) + '\n');
}

const ONLINE = ['none', 'optional', 'features', 'required'];
const DRM = ['drm_free', 'storefront', 'denuvo', 'online_auth'];
const MODEL = ['premium', 'premium_live', 'f2p_live', 'subscription'];
const EOL = ['offline_patch_released', 'offline_patch_promised', 'private_servers', 'partial', 'none', 'unknown'];
const LOSS = ['everything', 'online_only', 'delisted'];

function assert(cond, msg) {
  if (!cond) throw new Error(`Dataset validation failed: ${msg}`);
}

const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Structural + referential integrity checks. Throws with a precise message. */
export function validate(parts) {
  const pubIds = new Set(parts.publishers.map((p) => p.id));
  const seen = new Set();

  for (const g of parts.games) {
    assert(g.id && !seen.has(g.id), `duplicate/missing game id ${g.id}`);
    seen.add(g.id);
    assert(pubIds.has(g.publisherId), `${g.id}: unknown publisher ${g.publisherId}`);
    assert(ONLINE.includes(g.online), `${g.id}: bad online ${g.online}`);
    assert(DRM.includes(g.drm), `${g.id}: bad drm ${g.drm}`);
    assert(MODEL.includes(g.model), `${g.id}: bad model ${g.model}`);
    assert(EOL.includes(g.eol), `${g.id}: bad eol ${g.eol}`);
    assert(typeof g.priceUSD === 'number' && g.priceUSD >= 0, `${g.id}: bad price`);
    assert(Array.isArray(g.sources) && g.sources.length > 0, `${g.id}: needs sources`);
    if (g.shutdown) {
      assert(isISO(g.shutdown.date) && isISO(g.shutdown.announced), `${g.id}: bad shutdown dates`);
    }
  }
  for (const g of parts.graveyard) {
    assert(g.id && !seen.has(g.id), `duplicate/missing graveyard id ${g.id}`);
    seen.add(g.id);
    assert(pubIds.has(g.publisherId), `${g.id}: unknown publisher ${g.publisherId}`);
    assert(isISO(g.released) && isISO(g.died), `${g.id}: bad dates`);
    assert(Date.parse(g.released) <= Date.parse(g.died), `${g.id}: died before release`);
    assert(LOSS.includes(g.loss), `${g.id}: bad loss ${g.loss}`);
    assert(g.epitaph && g.epitaph.length > 10, `${g.id}: needs an epitaph`);
    assert(Array.isArray(g.sources) && g.sources.length > 0, `${g.id}: needs sources`);
  }
  for (const s of parts.stores) {
    assert(['A', 'B', 'C', 'D', 'F'].includes(s.grade), `${s.id}: bad grade`);
  }
  for (const l of parts.laws) {
    assert(l.summary && l.jurisdiction, `${l.id}: incomplete law entry`);
  }
  return true;
}

export function composeDataset(parts) {
  return {
    version: parts.meta.version,
    updated: parts.meta.updated,
    games: parts.games,
    graveyard: parts.graveyard,
    publishers: parts.publishers,
    stores: parts.stores,
    laws: parts.laws,
  };
}

export function writePublicDataset(dataset) {
  const outDir = join(ROOT, 'public', 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'dataset.json'), JSON.stringify(dataset));
}
