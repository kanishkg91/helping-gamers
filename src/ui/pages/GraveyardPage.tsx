import { useMemo, useState } from 'react';
import { daysBetween, formatLifespan, yearOf } from '../../core/format';
import { useAppData } from '../data';
import { ColumnChart } from '../components/Charts';
import { TombstoneCard } from '../components/TombstoneCard';

type Sort = 'recent' | 'shortest' | 'priciest';

export function GraveyardPage() {
  const { dataset, graveyardTotals } = useAppData();
  const [sort, setSort] = useState<Sort>('recent');

  const perYear = useMemo(() => {
    const counts = new Map<number, number>();
    for (const g of dataset.graveyard) {
      const y = yearOf(g.died);
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    const years = [...counts.keys()].sort();
    // Show the last decade so the chart stays readable.
    return years.slice(-10).map((y) => ({
      label: String(y),
      value: counts.get(y)!,
      title: `${counts.get(y)} game${counts.get(y) === 1 ? '' : 's'} died in ${y}`,
    }));
  }, [dataset]);

  const sorted = useMemo(() => {
    const list = [...dataset.graveyard];
    if (sort === 'recent') list.sort((a, b) => b.died.localeCompare(a.died));
    if (sort === 'shortest')
      list.sort((a, b) => daysBetween(a.released, a.died) - daysBetween(b.released, b.died));
    if (sort === 'priciest') list.sort((a, b) => b.priceUSD - a.priceUSD);
    return list;
  }, [dataset, sort]);

  const t = graveyardTotals;

  return (
    <>
      <div className="pagehead">
        <h1>🪦 The Graveyard</h1>
        <p className="sub">
          {t.totalDead} games people paid money for that no longer exist — {t.deadThisYear} of them
          killed in {t.currentYear} alone. Median lifespan:{' '}
          {t.medianLifespanDays != null ? formatLifespan(t.medianLifespanDays) : '—'}. Shortest:{' '}
          {t.shortestLifespan ? `${t.shortestLifespan.title}, ${t.shortestLifespan.days} days` : '—'}.
          Every grave has receipts.
        </p>
      </div>

      <div className="card" style={{ margin: '20px 0' }}>
        <h3 className="dim" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Games switched off per year</h3>
        <ColumnChart data={perYear} />
      </div>

      <div className="controls">
        <label className="dim" style={{ fontSize: '0.88rem' }} htmlFor="gy-sort">Sort:</label>
        <select id="gy-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Most recent deaths</option>
          <option value="shortest">Shortest lives first</option>
          <option value="priciest">Highest launch price</option>
        </select>
      </div>

      <div className="grid cols2">
        {sorted.map((g) => (
          <TombstoneCard game={g} key={g.id} />
        ))}
      </div>
    </>
  );
}
