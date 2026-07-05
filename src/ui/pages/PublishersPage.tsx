import { useMemo } from 'react';
import { useAppData } from '../data';
import { href } from '../router';
import { HBarChart } from '../components/Charts';
import { PublisherCard } from '../components/PublisherCard';

export function PublishersPage() {
  const { publisherStats } = useAppData();

  const ranked = useMemo(
    () =>
      [...publisherStats.values()].sort(
        (a, b) => b.kills - a.kills || a.score - b.score || a.name.localeCompare(b.name),
      ),
    [publisherStats],
  );

  const chartData = ranked
    .filter((s) => s.kills > 0)
    .slice(0, 12)
    .map((s) => ({
      label: s.name,
      value: s.kills,
      href: href(`/publisher/${s.publisherId}`),
      title: `${s.name}: ${s.kills} shutdown${s.kills === 1 ? '' : 's'} on record`,
    }));

  return (
    <>
      <div className="pagehead">
        <h1>📇 Publisher Accountability Index</h1>
        <p className="sub">
          Who actually switches games off? Body counts from our graveyard records, with median
          lifespans and rap sheets. Refunding players is the one thing that softens a score —
          almost nobody does it.
        </p>
      </div>

      <div className="card" style={{ margin: '20px 0' }}>
        <h3 className="dim" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Games switched off, by publisher (top {chartData.length})</h3>
        <HBarChart data={chartData} />
      </div>

      <div className="grid cols2">
        {ranked.map((s) => (
          <PublisherCard stats={s} key={s.publisherId} />
        ))}
      </div>
    </>
  );
}
