import { useMemo } from 'react';
import { scoreGame } from '../../core/score';
import { formatLifespan } from '../../core/format';
import { useAppData } from '../data';
import { href } from '../router';
import { SearchBox } from '../components/SearchBox';
import { GradeBadge } from '../components/GradeBadge';

export function HomePage() {
  const { dataset, publisherStats, graveyardTotals, nowISO } = useAppData();

  const { doomed, exampleA, exampleF } = useMemo(() => {
    const reports = dataset.games.map((g) => ({
      game: g,
      report: scoreGame(g, publisherStats.get(g.publisherId), nowISO),
    }));
    const doomed = reports
      .filter((r) => r.report.status === 'doomed')
      .sort((a, b) => a.game.shutdown!.date.localeCompare(b.game.shutdown!.date));
    const alive = reports.filter((r) => r.report.status === 'alive');
    const As = alive.filter((r) => r.report.grade === 'A');
    const Fs = alive.filter((r) => r.report.grade === 'F').sort((a, b) => b.game.priceUSD - a.game.priceUSD);
    return { doomed, exampleA: As[0], exampleF: Fs[0] };
  }, [dataset, publisherStats, nowISO]);

  const totals = graveyardTotals;

  return (
    <>
      <div className="hero">
        <h1>
          <span className="power">⏻</span> You bought it.
          <br />
          Find out if you get to keep it.
        </h1>
        <p className="tagline">
          Every game gets a transparent <b>Survival Grade</b> answering the one question no storefront
          will: <i>can this game be taken away from you?</i>
        </p>
        <SearchBox autoFocus />
      </div>

      <div className="statstrip">
        <a className="card stat" href={href('/graveyard')}>
          <span className="n" style={{ color: 'var(--brand)' }}>{totals.deadThisYear}</span>
          <span className="l">games killed in {totals.currentYear} so far</span>
        </a>
        <a className="card stat" href={href('/graveyard')}>
          <span className="n">{totals.totalDead}</span>
          <span className="l">graves in the Graveyard</span>
        </a>
        <a className="card stat" href={href('/watch')}>
          <span className="n" style={{ color: 'var(--grade-c)' }}>{doomed.length}</span>
          <span className="l">shutdowns announced &amp; counting down</span>
        </a>
        {totals.shortestLifespan && (
          <a className="card stat" href={href(`/game/${dataset.graveyard.find((g) => g.title === totals.shortestLifespan!.title)?.id ?? ''}`)}>
            <span className="n">{totals.shortestLifespan.days}</span>
            <span className="l">days — shortest life ({totals.shortestLifespan.title})</span>
          </a>
        )}
      </div>

      <div className="banner">
        <b>June 16, 2026:</b> the European Commission rejected the 1.29-million-signature{' '}
        <i>Stop Destroying Videogames</i> initiative. No law — just a promise of “awareness of existing
        rights.” Fine. <a href={href('/rights')}>Here is your awareness, weaponized →</a>
      </div>

      {exampleA && exampleF && (
        <div className="section">
          <h2>Same “buy” button. Very different deals.</h2>
          <p className="sub">
            Two games, both sold to you as products. Only one of them is actually yours.
          </p>
          <div className="grid cols2">
            {[exampleA, exampleF].map(({ game, report }) => (
              <a className="card" key={game.id} href={href(`/game/${game.id}`)}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <GradeBadge grade={report.grade} />
                  <div>
                    <h3 style={{ margin: 0 }}>{game.title}</h3>
                    <span className="dim" style={{ fontSize: '0.85rem' }}>
                      {report.grade === 'A'
                        ? 'They can’t take this one from you.'
                        : 'One server bill away from not existing.'}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {doomed.length > 0 && (
        <div className="section">
          <h2>
            <span className="livedot" />
            Death Watch
          </h2>
          <p className="sub">Shutdowns already announced. Play them, finish them, or get refunds while support still answers.</p>
          <div className="grid cols3">
            {doomed.slice(0, 3).map(({ game }) => (
              <a className="card" key={game.id} href={href(`/game/${game.id}`)}>
                <h3 style={{ margin: 0 }}>{game.title}</h3>
                <span className="tag red" style={{ marginTop: 8, display: 'inline-block' }}>
                  dies {game.shutdown!.approx ? '~' : ''}
                  {game.shutdown!.date.slice(0, game.shutdown!.approx ? 7 : 10)}
                </span>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 12 }}>
            <a className="btn" href={href('/watch')}>
              All countdowns →
            </a>
          </p>
        </div>
      )}

      <div className="section">
        <h2>Dig deeper</h2>
        <div className="grid cols2">
          <a className="card" href={href('/shelf')}>
            <h3>🧾 My Shelf</h3>
            <p className="dim" style={{ margin: 0 }}>
              Add the games you own and get a risk report: how much of your library can be switched off
              remotely — with a shareable receipt.
            </p>
          </a>
          <a className="card" href={href('/publishers')}>
            <h3>📇 Publisher Accountability Index</h3>
            <p className="dim" style={{ margin: 0 }}>
              {dataset.publishers.length} publishers, ranked by body count. Track records repeat.
            </p>
          </a>
          <a className="card" href={href('/graveyard')}>
            <h3>🪦 The Graveyard</h3>
            <p className="dim" style={{ margin: 0 }}>
              {totals.totalDead} games people paid for that no longer exist — from{' '}
              {totals.shortestLifespan ? `${totals.shortestLifespan.days} days` : 'weeks'} to{' '}
              {totals.medianLifespanDays ? formatLifespan(totals.medianLifespanDays) : 'years'} median lifespans. Every grave sourced.
            </p>
          </a>
          <a className="card" href={href('/rights')}>
            <h3>⚖️ Know your rights</h3>
            <p className="dim" style={{ margin: 0 }}>
              What “buy” legally means on each storefront, which laws are moving, and what you can actually do.
            </p>
          </a>
        </div>
      </div>
    </>
  );
}
