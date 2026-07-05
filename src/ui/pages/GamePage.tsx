import { useMemo } from 'react';
import { scoreGame, type FactorResult } from '../../core/score';
import { buildVerdict } from '../../core/verdicts';
import { formatDate, formatMoney } from '../../core/format';
import type { RatedGame } from '../../core/types';
import { useAppData } from '../data';
import { href } from '../router';
import { GradeBadge, GRADE_COLORS } from '../components/GradeBadge';
import { Countdown } from '../components/Countdown';
import { TombstoneCard } from '../components/TombstoneCard';
import { AddToShelfButton, WatchStar } from '../components/ShelfButtons';
import { NotFoundPage } from './NotFoundPage';

const PLATFORM_LABEL: Record<RatedGame['platforms'][number], string> = {
  pc: 'PC',
  playstation: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  mobile: 'Mobile',
};

function factorColor(score: number): string {
  if (score >= 85) return GRADE_COLORS.A;
  if (score >= 70) return GRADE_COLORS.B;
  if (score >= 55) return GRADE_COLORS.C;
  if (score >= 40) return GRADE_COLORS.D;
  return GRADE_COLORS.F;
}

function FactorRow({ f }: { f: FactorResult }) {
  return (
    <details className="factor">
      <summary>
        <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="flabel">{f.label}</span>
        <span className="fweight">{Math.round(f.weight * 100)}% weight</span>
        <span className="fbar">
          <div style={{ width: `${f.score}%`, background: factorColor(f.score) }} />
        </span>
        <span className="fscore" style={{ color: factorColor(f.score) }}>
          {f.score}
        </span>
      </summary>
      <p className="finding">{f.finding}</p>
    </details>
  );
}

export function GamePage({ id }: { id: string }) {
  const { dataset, publisherStats, nowISO } = useAppData();

  const game = dataset.games.find((g) => g.id === id);
  const dead = dataset.graveyard.find((g) => g.id === id);

  const scored = useMemo(() => {
    if (!game) return null;
    const stats = publisherStats.get(game.publisherId);
    const report = scoreGame(game, stats, nowISO);
    return { report, verdict: buildVerdict(game, report, stats?.name ?? 'The publisher', nowISO) };
  }, [game, publisherStats, nowISO]);

  if (dead && !game) {
    const pubStats = publisherStats.get(dead.publisherId);
    return (
      <>
        <a className="backlink" href={href('/graveyard')}>← The Graveyard</a>
        <div className="gamehead" style={{ marginBottom: 18 }}>
          <span className="gradebadge lg grade-F" role="img" aria-label="Dead">✝</span>
          <div className="info">
            <h1>{dead.title}</h1>
            <p className="verdict">This game is already gone.</p>
            <p className="verdict-body">
              It died on {formatDate(dead.died, dead.approx)}. The grade system no longer applies — there is nothing left to grade.
            </p>
          </div>
        </div>
        <TombstoneCard game={dead} />
        {pubStats && pubStats.kills > 1 && (
          <p className="dim" style={{ marginTop: 16 }}>
            {pubStats.name} has {pubStats.kills} games in the Graveyard.{' '}
            <a href={href(`/publisher/${dead.publisherId}`)}>See the rap sheet →</a>
          </p>
        )}
        <Sources sources={dead.sources} />
      </>
    );
  }

  if (!game || !scored) return <NotFoundPage />;

  const { report, verdict } = scored;
  const pub = dataset.publishers.find((p) => p.id === game.publisherId);

  return (
    <>
      <a className="backlink" href={href('/')}>← Search another game</a>

      <div className="gamehead">
        <GradeBadge grade={report.grade} size="lg" />
        <div className="info">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <h1 style={{ flex: 1 }}>{game.title}</h1>
            <WatchStar gameId={game.id} />
          </div>
          <p className="verdict">{verdict.headline}</p>
          <p className="verdict-body">{verdict.body}</p>
          <div className="meta">
            <span className="tag">{game.year}</span>
            {pub && (
              <a className="tag" href={href(`/publisher/${pub.id}`)} style={{ textDecoration: 'none' }}>
                {pub.name}
              </a>
            )}
            {game.platforms.map((p) => (
              <span className="tag" key={p}>{PLATFORM_LABEL[p]}</span>
            ))}
            <span className="tag">{game.priceUSD === 0 ? 'free-to-play' : formatMoney(game.priceUSD)}</span>
            {game.physical && <span className="tag">{game.physicalComplete ? 'complete on disc' : 'disc needs downloads'}</span>}
          </div>
          <div style={{ marginTop: 14 }}>
            <AddToShelfButton gameId={game.id} title={game.title} />
          </div>
        </div>
      </div>

      {report.status === 'doomed' && game.shutdown && (
        <div className="card" style={{ marginTop: 22, borderColor: 'rgba(255,69,69,0.4)' }}>
          <h3 style={{ color: 'var(--brand)' }}>
            <span className="livedot" />
            Shutdown announced — {formatDate(game.shutdown.date, game.shutdown.approx)}
          </h3>
          {game.shutdown.note && <p className="dim" style={{ fontSize: '0.92rem' }}>{game.shutdown.note}</p>}
          <div style={{ marginTop: 14 }}>
            <Countdown targetISO={game.shutdown.date} approx={game.shutdown.approx} />
          </div>
        </div>
      )}

      <div className="section">
        <h2>Show the math</h2>
        <p className="sub">
          Survival score <b className="mono" style={{ color: GRADE_COLORS[report.grade] }}>{report.score}/100</b>
          {report.status === 'doomed' && ' — capped at 5 because a shutdown is already announced'}
          . Weighted from what we could verify; expand any factor to see the receipt.
        </p>
        <div className="scorebar">
          <div style={{ width: `${report.score}%`, background: GRADE_COLORS[report.grade] }} />
        </div>
        <div style={{ marginTop: 16, borderBottom: '1px solid var(--border)' }}>
          {report.factors.map((f) => (
            <FactorRow f={f} key={f.id} />
          ))}
        </div>
        <p className="faint" style={{ fontSize: '0.8rem', marginTop: 10 }}>
          A ≥ 85 · B ≥ 70 · C ≥ 55 · D ≥ 40 · F &lt; 40 — <a href={href('/about')}>full methodology</a>
        </p>
      </div>

      {game.notes && (
        <div className="section">
          <h2>Worth knowing</h2>
          <p className="dim" style={{ maxWidth: 720 }}>{game.notes}</p>
        </div>
      )}

      <Sources sources={game.sources} />
    </>
  );
}

function Sources({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="section sourcelist">
      <b>Receipts:</b>{' '}
      {sources.map((s, i) => (
        <span key={s}>
          {i > 0 && ' · '}
          <a href={s} target="_blank" rel="noreferrer noopener">
            {new URL(s).hostname.replace(/^www\./, '')}
          </a>
        </span>
      ))}
    </div>
  );
}
