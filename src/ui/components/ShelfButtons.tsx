import { userStore, useUserState } from '../../services/userStore';

export function AddToShelfButton({ gameId, title }: { gameId: string; title: string }) {
  const { shelf } = useUserState();
  const owned = shelf.some((g) => g.gameId === gameId);
  if (owned) {
    return (
      <button className="btn small" onClick={() => userStore.removeFromShelf(gameId)} title="Remove from My Shelf">
        ✓ On my shelf
      </button>
    );
  }
  return (
    <button className="btn small primary" onClick={() => userStore.addToShelf(gameId, title)}>
      + I own this
    </button>
  );
}

export function WatchStar({ gameId }: { gameId: string }) {
  const { watchlist } = useUserState();
  const on = watchlist.includes(gameId);
  return (
    <button
      className={`watchstar${on ? ' on' : ''}`}
      onClick={() => userStore.toggleWatch(gameId)}
      title={on ? 'Remove from Death Watch list' : 'Watch on Death Watch'}
      aria-pressed={on}
      aria-label={on ? 'Stop watching' : 'Watch this game'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.44 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95z" />
      </svg>
    </button>
  );
}
