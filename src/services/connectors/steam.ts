import type { Dataset } from '../../core/types';
import { searchGames } from '../../core/search';
import { userStore } from '../userStore';
import type { ImportedGame, ImportResult } from './types';

export interface SteamImportSummary {
  totalOwned: number;
  matched: { id: string; title: string }[];
  unmatched: number;
}

/**
 * Fetch a public Steam library via our serverless proxy (no key, no storage
 * — request/response only; see api/connect/steam.ts).
 */
export async function fetchSteamLibrary(idOrVanity: string): Promise<ImportedGame[]> {
  const res = await fetch(`/api/connect/steam?id=${encodeURIComponent(idOrVanity.trim())}`, {
    headers: { accept: 'application/json' },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(
      res.ok
        ? 'Unexpected response from the Steam proxy.'
        : 'The Steam import service isn’t reachable from this build (it runs as a serverless function on the deployed site).',
    );
  }
  if (!res.ok) {
    const msg = (body as { error?: string }).error;
    throw new Error(msg ?? `Steam import failed (${res.status}).`);
  }
  return (body as ImportResult).games;
}

/**
 * Match imported names against the dataset and add hits to the shelf.
 * Honest accounting: reports exactly how many we couldn't match instead of
 * silently dropping them.
 */
export function importToShelf(games: ImportedGame[], dataset: Dataset): SteamImportSummary {
  const matched: { id: string; title: string }[] = [];
  let unmatched = 0;
  for (const g of games) {
    const [hit] = searchGames(dataset, g.name, 1);
    // 700+ = word/prefix-tier match; anything looser risks importing the wrong game.
    if (hit && hit.score >= 700) {
      matched.push({ id: hit.game.id, title: hit.game.title });
      userStore.addToShelf(hit.game.id, hit.game.title);
    } else {
      unmatched += 1;
    }
  }
  return { totalOwned: games.length, matched, unmatched };
}
