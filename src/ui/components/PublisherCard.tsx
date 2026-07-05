import type { PublisherStats } from '../../core/publisherStats';
import { formatLifespan, formatMoney } from '../../core/format';
import { href } from '../router';

export function PublisherCard({ stats }: { stats: PublisherStats }) {
  return (
    <a className="card" href={href(`/publisher/${stats.publisherId}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{stats.name}</h3>
        <span className="mono dim" title="Track-record score, 100 = clean sheet">
          {stats.score}/100
        </span>
      </div>
      <p className="dim" style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>
        {stats.kills === 0 ? (
          <>No recorded shutdowns. Clean sheet — so far.</>
        ) : (
          <>
            <b style={{ color: 'var(--ink)' }}>{stats.kills}</b> game{stats.kills === 1 ? '' : 's'} switched off
            {stats.totalKills > 0 && <> · {stats.totalKills} erased completely</>}
            {stats.medianLifespanDays != null && <> · median life {formatLifespan(stats.medianLifespanDays)}</>}
            {stats.pricesBurnedUSD > 0 && <> · {formatMoney(stats.pricesBurnedUSD)} of purchases burned</>}
          </>
        )}
      </p>
    </a>
  );
}
