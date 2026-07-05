import { useEffect, useMemo, useRef, useState } from 'react';
import { searchGames, type SearchHit } from '../../core/search';
import { scoreGame } from '../../core/score';
import { formatDate } from '../../core/format';
import { useAppData } from '../data';
import { navigate } from '../router';
import { GradeBadge } from './GradeBadge';

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  /** Override what selecting a hit does (default: navigate to the game page). */
  onSelect?: (hit: SearchHit) => void;
  /** Keep the query after selection (useful in add-to-shelf mode). */
  keepQuery?: boolean;
}

export function SearchBox({ placeholder, autoFocus, onSelect, keepQuery }: Props) {
  const { dataset, publisherStats, nowISO } = useAppData();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(
    () => (query.trim().length >= 2 ? searchGames(dataset, query, 8) : []),
    [dataset, query],
  );

  useEffect(() => setSel(0), [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (hit: SearchHit) => {
    setOpen(false);
    if (!keepQuery) setQuery('');
    if (onSelect) onSelect(hit);
    else navigate(`/game/${hit.game.id}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(hits[sel]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="searchwrap" ref={wrapRef}>
      <span className="icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="search"
        value={query}
        placeholder={placeholder ?? 'Search any game — can it be taken away from you?'}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        aria-label="Search games"
        autoComplete="off"
        spellCheck={false}
      />
      {open && hits.length > 0 && (
        <div className="searchdrop" role="listbox">
          {hits.map((hit, i) => {
            if (hit.kind === 'rated') {
              const report = scoreGame(hit.game, publisherStats.get(hit.game.publisherId), nowISO);
              return (
                <button key={`r-${hit.game.id}`} className={i === sel ? 'sel' : ''} onClick={() => choose(hit)}>
                  <GradeBadge grade={report.grade} />
                  <span className="t">
                    <span className="name">{hit.game.title}</span>
                    <br />
                    <span className="meta">
                      {hit.game.year}
                      {report.status === 'doomed' && ' · shutdown announced'}
                    </span>
                  </span>
                </button>
              );
            }
            return (
              <button key={`d-${hit.game.id}`} className={i === sel ? 'sel' : ''} onClick={() => choose(hit)}>
                <span className="gradebadge sm faint" aria-label="Dead game" style={{ color: 'var(--faint)' }}>
                  ✝
                </span>
                <span className="t">
                  <span className="name">{hit.game.title}</span>
                  <br />
                  <span className="meta">dead · {formatDate(hit.game.died, hit.game.approx)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && query.trim().length >= 2 && hits.length === 0 && (
        <div className="searchdrop">
          <button disabled style={{ color: 'var(--dim)' }}>
            No matches in {`the ${dataset.games.length + dataset.graveyard.length} games we've rated or buried`} — try another spelling.
          </button>
        </div>
      )}
    </div>
  );
}
