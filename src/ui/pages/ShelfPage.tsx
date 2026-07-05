import { useMemo, useState } from 'react';
import { scoreGame, type Grade, type SurvivalReport } from '../../core/score';
import { formatMoney } from '../../core/format';
import type { OwnedGame, RatedGame } from '../../core/types';
import { userStore, useUserState } from '../../services/userStore';
import { sharePngBlob } from '../../platform/share';
import { useAppData } from '../data';
import { href } from '../router';
import { SearchBox } from '../components/SearchBox';
import { GradeBadge } from '../components/GradeBadge';
import { StackedGradeBar } from '../components/Charts';
import { renderShelfCard } from '../components/shareCard';

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'F'];

interface ShelfEntry {
  owned: OwnedGame;
  game?: RatedGame;
  report?: SurvivalReport;
  dead?: boolean;
}

export function ShelfPage() {
  const { dataset, publisherStats, nowISO } = useAppData();
  const { shelf } = useUserState();
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'shared' | 'downloaded'>('idle');

  const entries: ShelfEntry[] = useMemo(
    () =>
      shelf.map((owned) => {
        const game = dataset.games.find((g) => g.id === owned.gameId);
        if (game) {
          return { owned, game, report: scoreGame(game, publisherStats.get(game.publisherId), nowISO) };
        }
        return { owned, dead: dataset.graveyard.some((g) => g.id === owned.gameId) };
      }),
    [shelf, dataset, publisherStats, nowISO],
  );

  const summary = useMemo(() => {
    const gradeCounts = GRADES.map((grade) => ({
      grade,
      count: entries.filter((e) => e.report?.grade === grade).length,
    }));
    // "Switchable-off" money: paid games where a shutdown kills everything you
    // bought — always-online or server-dependent single-player — plus anything
    // already sentenced.
    const atRisk = entries.filter(
      (e) =>
        e.game &&
        (e.game.online === 'required' || e.game.spServerDependent || e.report?.status === 'doomed'),
    );
    return {
      gradeCounts,
      rated: entries.filter((e) => e.report).length,
      moneyAtRiskUSD: atRisk.reduce((s, e) => s + (e.game?.priceUSD ?? 0), 0),
      atRiskCount: atRisk.length,
      doomedCount: entries.filter((e) => e.report?.status === 'doomed').length,
      deadCount: entries.filter((e) => e.dead).length,
    };
  }, [entries]);

  const share = async () => {
    setShareState('busy');
    try {
      const blob = await renderShelfCard({
        gradeCounts: summary.gradeCounts,
        totalGames: shelf.length,
        moneyAtRiskUSD: summary.moneyAtRiskUSD,
        doomedCount: summary.doomedCount,
      });
      const result = await sharePngBlob(
        blob,
        'my-shelf-killswitch.png',
        `${formatMoney(summary.moneyAtRiskUSD)} of my game library can be switched off remotely.`,
      );
      setShareState(result);
    } catch {
      setShareState('idle');
    }
  };

  return (
    <>
      <div className="pagehead">
        <h1>🧾 My Shelf</h1>
        <p className="sub">
          Your library, audited. Everything stays on this device unless you turn on{' '}
          <a href={href('/sync')}>encrypted sync</a> — we couldn’t read your list if we wanted to.
        </p>
      </div>

      <div style={{ margin: '18px 0', maxWidth: 620 }}>
        <SearchBox
          placeholder="Add a game you own…"
          keepQuery={false}
          onSelect={(hit) => userStore.addToShelf(hit.game.id, hit.game.title)}
        />
        <p className="faint" style={{ fontSize: '0.8rem', marginTop: 6 }}>
          Or <a href={href('/connect')}>import from Steam</a> — no login, no API key.
        </p>
      </div>

      {shelf.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h3>Nothing on the shelf yet.</h3>
          <p className="dim">
            Add the games you own and find out how much of your library actually belongs to you.
          </p>
        </div>
      ) : (
        <>
          <div className="statstrip">
            <div className="card stat">
              <span className="n">{shelf.length}</span>
              <span className="l">games on the shelf</span>
            </div>
            <div className="card stat">
              <span className="n" style={{ color: summary.moneyAtRiskUSD > 0 ? 'var(--brand)' : 'var(--grade-a)' }}>
                {formatMoney(summary.moneyAtRiskUSD)}
              </span>
              <span className="l">can be switched off remotely ({summary.atRiskCount} game{summary.atRiskCount === 1 ? '' : 's'})</span>
            </div>
            <div className="card stat">
              <span className="n" style={{ color: summary.doomedCount > 0 ? 'var(--grade-c)' : 'var(--ink)' }}>
                {summary.doomedCount}
              </span>
              <span className="l">already {summary.doomedCount === 1 ? 'has' : 'have'} a shutdown date</span>
            </div>
          </div>

          {summary.rated > 0 && (
            <div className="card" style={{ margin: '16px 0' }}>
              <h3 className="dim" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Survival-grade breakdown</h3>
              <StackedGradeBar counts={summary.gradeCounts} />
            </div>
          )}

          <div className="controls">
            <button className="btn primary" onClick={share} disabled={shareState === 'busy'}>
              {shareState === 'busy' ? 'Rendering…' : '📤 Share my risk report'}
            </button>
            {shareState === 'downloaded' && <span className="ok">Saved as PNG — post it anywhere.</span>}
            {shareState === 'shared' && <span className="ok">Shared.</span>}
          </div>

          <div className="grid" style={{ gap: 8 }}>
            {entries.map(({ owned, game, report, dead }) => (
              <div className="card shelfrow" key={owned.gameId} style={{ padding: '11px 14px' }}>
                {report ? (
                  <GradeBadge grade={report.grade} />
                ) : (
                  <span className="gradebadge sm" style={{ color: 'var(--faint)' }} title={dead ? 'Dead' : 'Not in our dataset yet'}>
                    {dead ? '✝' : '?'}
                  </span>
                )}
                <span className="t">
                  {game || dead ? (
                    <a href={href(`/game/${owned.gameId}`)}>{owned.title}</a>
                  ) : (
                    <span style={{ fontWeight: 650 }}>{owned.title}</span>
                  )}
                  <br />
                  <span className="sub">
                    {report?.status === 'doomed' && 'shutdown announced · '}
                    {dead && 'already dead · '}
                    {!game && !dead && 'unrated (not in dataset yet) · '}
                    added {owned.addedAt.slice(0, 10)}
                  </span>
                </span>
                <button className="btn small" onClick={() => userStore.removeFromShelf(owned.gameId)} title="Remove">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
