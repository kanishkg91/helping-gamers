import { useMemo } from 'react';
import { scoreGame } from '../../core/score';
import { formatDate, formatLifespan, formatMoney } from '../../core/format';
import { useAppData } from '../data';
import { href } from '../router';
import { GradeBadge } from '../components/GradeBadge';
import { TombstoneCard } from '../components/TombstoneCard';
import { NotFoundPage } from './NotFoundPage';

export function PublisherPage({ id }: { id: string }) {
  const { dataset, publisherStats, nowISO } = useAppData();
  const pub = dataset.publishers.find((p) => p.id === id);
  const stats = publisherStats.get(id);

  const rated = useMemo(
    () =>
      dataset.games
        .filter((g) => g.publisherId === id)
        .map((g) => ({ game: g, report: scoreGame(g, stats, nowISO) }))
        .sort((a, b) => a.report.score - b.report.score),
    [dataset, id, stats, nowISO],
  );

  if (!pub || !stats) return <NotFoundPage />;

  return (
    <>
      <a className="backlink" href={href('/publishers')}>← Publisher index</a>
      <div className="pagehead">
        <h1>{pub.name}</h1>
        <p className="sub">
          Track-record score <b className="mono">{stats.score}/100</b>
          {stats.kills > 0 ? (
            <>
              {' — '}
              {stats.kills} game{stats.kills === 1 ? '' : 's'} switched off
              {stats.totalKills > 0 && <>, {stats.totalKills} erased completely</>}
              {stats.medianLifespanDays != null && <>, median lifespan {formatLifespan(stats.medianLifespanDays)}</>}
              {stats.pricesBurnedUSD > 0 && (
                <>
                  , at least <b>{formatMoney(stats.pricesBurnedUSD)}</b> per fully-paid-up player burned
                </>
              )}
              .
            </>
          ) : (
            <> — no recorded shutdowns in our data. Clean sheet, so far.</>
          )}
        </p>
      </div>

      {pub.quote && (
        <blockquote className="quote">
          “{pub.quote.text}”
          <span className="attr">
            — {pub.quote.attribution} ·{' '}
            <a href={pub.quote.source} target="_blank" rel="noreferrer noopener">source</a>
          </span>
        </blockquote>
      )}

      {pub.rapSheet.length > 0 && (
        <div className="section">
          <h2>Rap sheet</h2>
          <ul className="rapsheet">
            {pub.rapSheet.map((e) => (
              <li key={`${e.date}-${e.title}`}>
                <span className="d">{formatDate(e.date, true)}</span>
                <div className="t">{e.title}</div>
                <p className="detail">{e.detail}</p>
                <span className="sourcelist">
                  {e.sources.map((s, i) => (
                    <span key={s}>
                      {i > 0 && ' · '}
                      <a href={s} target="_blank" rel="noreferrer noopener">{new URL(s).hostname.replace(/^www\./, '')}</a>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.deadGames.length > 0 && (
        <div className="section">
          <h2>Their graveyard ({stats.deadGames.length})</h2>
          <div className="grid cols2">
            {stats.deadGames.map((g) => (
              <TombstoneCard game={g} key={g.id} />
            ))}
          </div>
        </div>
      )}

      {rated.length > 0 && (
        <div className="section">
          <h2>Games we grade from {pub.name} ({rated.length})</h2>
          <div className="grid cols2">
            {rated.map(({ game, report }) => (
              <a className="card" key={game.id} href={href(`/game/${game.id}`)} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <GradeBadge grade={report.grade} />
                <div>
                  <h3 style={{ margin: 0 }}>{game.title}</h3>
                  <span className="dim mono" style={{ fontSize: '0.78rem' }}>
                    {game.year}
                    {report.status === 'doomed' && ' · shutdown announced'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
