import { useSyncExternalStore } from 'react';
import type { OwnedGame, UserState } from '../core/types';
import { EMPTY_USER_STATE } from '../core/types';
import { storage } from '../platform/storage';

const KEY = 'killswitch.userState.v1';

type Listener = () => void;

/**
 * Tiny reactive store for the user's shelf + watchlist. localStorage-backed,
 * no accounts required. The sync service subscribes to changes to push the
 * encrypted vault when sync is enabled.
 */
class UserStore {
  private state: UserState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): UserState {
    try {
      const raw = storage.get(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserState;
        if (Array.isArray(parsed.shelf) && Array.isArray(parsed.watchlist)) return parsed;
      }
    } catch {
      /* corrupted state: start fresh rather than crash */
    }
    return EMPTY_USER_STATE;
  }

  getState = (): UserState => this.state;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  setState(next: UserState): void {
    this.state = next;
    storage.set(KEY, JSON.stringify(next));
    for (const fn of this.listeners) fn();
  }

  addToShelf(gameId: string, title: string): void {
    if (this.state.shelf.some((g) => g.gameId === gameId)) return;
    const item: OwnedGame = { gameId, title, addedAt: new Date().toISOString() };
    this.setState({ ...this.state, shelf: [...this.state.shelf, item] });
  }

  removeFromShelf(gameId: string): void {
    this.setState({ ...this.state, shelf: this.state.shelf.filter((g) => g.gameId !== gameId) });
  }

  toggleWatch(gameId: string): void {
    const has = this.state.watchlist.includes(gameId);
    this.setState({
      ...this.state,
      watchlist: has
        ? this.state.watchlist.filter((id) => id !== gameId)
        : [...this.state.watchlist, gameId],
    });
  }
}

export const userStore = new UserStore();

export function useUserState(): UserState {
  return useSyncExternalStore(userStore.subscribe, userStore.getState, userStore.getState);
}
