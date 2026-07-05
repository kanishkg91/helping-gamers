import type { OwnedGame, UserState } from './types';

/**
 * Merge two user states (local vs remote) after concurrent edits on
 * different devices. Union semantics: an item present on either side is
 * kept (earliest addedAt wins for metadata). Simple and loss-proof; a
 * removal made on one device while another device was offline may
 * reappear once — the honest trade-off of not tracking tombstones.
 */
export function mergeUserState(a: UserState, b: UserState): UserState {
  const shelf = new Map<string, OwnedGame>();
  for (const item of [...a.shelf, ...b.shelf]) {
    const prev = shelf.get(item.gameId);
    if (!prev || item.addedAt < prev.addedAt) shelf.set(item.gameId, item);
  }
  return {
    shelf: [...shelf.values()].sort((x, y) => x.addedAt.localeCompare(y.addedAt)),
    watchlist: [...new Set([...a.watchlist, ...b.watchlist])],
  };
}

export function sameUserState(a: UserState, b: UserState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
