import { useMemo } from 'react';
import { daysUntil, formatDate } from '../../core/format';
import { useUserState } from '../../services/userStore';
import { useAppData } from '../data';
import { href } from '../router';
import { Countdown } from '../components/Countdown';
import { WatchStar } from '../components/ShelfButtons';

export function WatchPage() {
  const { dataset, nowISO } = useAppData();
  const { watchlist } = useUserState();

  const doomed = useMemo(
    () =>
      dataset.games
        .filter((g) => g.shutdown)
        .sort((a, b) => a.shutdown!.date.localeCompare(b.shutdown!.date)),
    [dataset],
  );

  const recentDead = useMemo(
    () => [...dataset.graveyard].sort((a, b) => b.died.localeCompare(a.died)).slice(0, 4),
    [dataset],
  );

  const watched = doomed.filter((g) => watchlist.includes(g.id));
  const rest = doomed.filter((g) => !watchlist.includes(g.id));

  return (
    <>
      <div className="pagehead">
        <h1>
          <span className="livedot" />
          Death Watch
        </h1>
        <p className="sub">
          Every announced shutdown we know about, counting down live. Star a game to pin it to the
          top. If you own one of these: play it, finish it, or chase a refund while support still
          answers tickets.
        </p>
      </div>

      {doomed.length === 0 && (
        <div className="card">
          <h3>No announced shutdowns right now.</h3>
          <p className="dim">That never lasts. Check the Graveyard for how this usually goes.</p>
        </div>
      )}

      <div className="grid" style={{ gap: 14 }}>
        {[...watched, ...rest].map((g) => {
          const days = daysUntil(g.shutdown!.date, nowISO);
          return (
            <div className="card" key={g.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3 style={{ margin: 0 }}>
                    <a href={href(`/game/${g.id}`)} style={{ textDecoration: 'none' }}>{g.title}</a>
                  </h3>
                  <p className="dim" style={{ fontSize: '0.88rem', margin: '4px 0 0' }}>
                    dies {formatDate(g.shutdown!.date, g.shutdown!.approx)}
                    {!g.shutdown!.approx && days > 0 && <> — {days} day{days === 1 ? '' : 's'} left</>}
                  </p>
                  {g.shutdown!.note && (
                    <p className="faint" style={{ fontSize: '0.82rem', margin: '6px 0 0', maxWidth: 640 }}>
                      {g.shutdown!.note}
                    </p>
                  )}
                </div>
                <WatchStar gameId={g.id} />
              </div>
              <div style={{ marginTop: 14 }}>
                <Countdown targetISO={g.shutdown!.date} approx={g.shutdown!.approx} />
              </div>
            </div>
          );
        })}
      </div>

      {recentDead.length > 0 && (
        <div className="section">
          <h2>Recently buried</h2>
          <div className="grid cols2">
            {recentDead.map((g) => (
              <a className="card" key={g.id} href={href(`/game/${g.id}`)}>
                <h3 style={{ margin: 0 }}>✝ {g.title}</h3>
                <span className="dim mono" style={{ fontSize: '0.78rem' }}>
                  died {formatDate(g.died, g.approx)}
                </span>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 12 }}>
            <a className="btn" href={href('/graveyard')}>The full Graveyard →</a>
          </p>
        </div>
      )}
    </>
  );
}
