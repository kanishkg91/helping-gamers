import type { DeadGame, Dataset, RatedGame } from './types';

export type SearchHit =
  | { kind: 'rated'; game: RatedGame; score: number }
  | { kind: 'dead'; game: DeadGame; score: number };

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (Pokemon accents etc.)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Rank how well `query` matches `title`. 0 = no match.
 * Tiers: exact > prefix > word-boundary prefix > substring >
 * all-tokens-prefix > in-order subsequence.
 */
export function matchScore(queryNorm: string, titleNorm: string): number {
  if (!queryNorm) return 0;
  if (titleNorm === queryNorm) return 1000;
  if (titleNorm.startsWith(queryNorm)) return 800 - (titleNorm.length - queryNorm.length);
  const wordIdx = titleNorm.indexOf(' ' + queryNorm);
  if (wordIdx >= 0) return 700 - wordIdx;
  const idx = titleNorm.indexOf(queryNorm);
  if (idx >= 0) return 600 - idx;

  const qTokens = queryNorm.split(' ');
  const tTokens = titleNorm.split(' ');
  if (
    qTokens.length > 1 &&
    qTokens.every((qt) => tTokens.some((tt) => tt.startsWith(qt)))
  ) {
    return 500 - (titleNorm.length - queryNorm.length);
  }

  // Loose in-order subsequence, penalized by gaps ("gtav" → "grand theft auto v").
  let ti = 0;
  let gaps = 0;
  const flat = titleNorm.replace(/ /g, '');
  const qFlat = queryNorm.replace(/ /g, '');
  for (const ch of qFlat) {
    const found = flat.indexOf(ch, ti);
    if (found === -1) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  if (qFlat.length < 3) return 0; // too short for fuzzy matching
  const score = 300 - gaps * 4 - (flat.length - qFlat.length);
  return Math.max(score, 1);
}

function bestScore(query: string, title: string, aliases?: string[]): number {
  const q = normalize(query);
  let best = matchScore(q, normalize(title));
  for (const a of aliases ?? []) {
    best = Math.max(best, matchScore(q, normalize(a)) - 10);
  }
  return best;
}

export function searchGames(dataset: Dataset, query: string, limit = 12): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const game of dataset.games) {
    const score = bestScore(query, game.title, game.aliases);
    if (score > 0) hits.push({ kind: 'rated', game, score });
  }
  for (const game of dataset.graveyard) {
    const score = bestScore(query, game.title);
    if (score > 0) hits.push({ kind: 'dead', game, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
