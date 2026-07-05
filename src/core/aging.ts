import type { Dataset, DeadGame, RatedGame } from './types';

/**
 * Derive a graveyard entry from a rated game whose announced shutdown date
 * has passed. Used by both the client (so even a stale bundled dataset
 * renders correctly) and the server-side updater (which rewrites the JSON).
 */
export function deriveDeadGame(g: RatedGame): DeadGame {
  // Everything dies only when the whole game hangs on the servers;
  // otherwise the offline portion survives the shutdown.
  const loss = g.online === 'required' || g.spServerDependent ? 'everything' : 'online_only';
  return {
    id: g.id,
    title: g.title,
    publisherId: g.publisherId,
    released: `${g.year}-01-01`,
    died: g.shutdown!.date,
    approx: true, // release day derived from year only
    priceUSD: g.priceUSD,
    model: g.model,
    loss,
    epitaph:
      g.shutdown?.note ??
      `Servers switched off as announced. ${loss === 'everything' ? 'Nothing remains playable.' : 'Offline portions survive.'}`,
    sources: g.sources,
  };
}

export function isDead(g: RatedGame, nowISO: string): boolean {
  return !!g.shutdown && Date.parse(g.shutdown.date) <= Date.parse(nowISO);
}

/**
 * Move rated games whose shutdown date has passed into the graveyard.
 * Pure function: returns a new dataset, never mutates.
 */
export function applyAging(dataset: Dataset, nowISO: string): Dataset {
  const dying = dataset.games.filter((g) => isDead(g, nowISO));
  if (dying.length === 0) return dataset;
  const existing = new Set(dataset.graveyard.map((g) => g.id));
  return {
    ...dataset,
    games: dataset.games.filter((g) => !isDead(g, nowISO)),
    graveyard: [
      ...dataset.graveyard,
      ...dying.filter((g) => !existing.has(g.id)).map(deriveDeadGame),
    ],
  };
}
