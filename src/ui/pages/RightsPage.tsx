import { formatDate } from '../../core/format';
import type { StoreGuide } from '../../core/types';
import { useAppData } from '../data';

function StoreCard({ store }: { store: StoreGuide }) {
  return (
    <details className="card" style={{ padding: 0 }}>
      <summary
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          cursor: 'pointer',
          listStyle: 'none',
        }}
      >
        <span className={`gradebadge sm grade-${store.grade}`} role="img" aria-label={`Store grade ${store.grade}`}>
          {store.grade}
        </span>
        <span style={{ flex: 1 }}>
          <b>{store.name}</b>
          <br />
          <span className="dim" style={{ fontSize: '0.85rem' }}>{store.gradeReason}</span>
        </span>
      </summary>
      <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--border)' }}>
        <dl style={{ margin: 0 }}>
          {[
            ['What “buy” actually means', store.whatBuyMeans],
            ['Can they revoke your games?', store.canRevoke],
            ['Refunds', store.refunds],
            ['What survives offline', store.offlineStory],
          ].map(([q, a]) => (
            <div key={q} style={{ margin: '14px 0' }}>
              <dt style={{ fontWeight: 700, fontSize: '0.9rem' }}>{q}</dt>
              <dd className="dim" style={{ margin: '3px 0 0', fontSize: '0.9rem' }}>{a}</dd>
            </div>
          ))}
        </dl>
        {store.incidents.length > 0 && (
          <>
            <h3 style={{ fontSize: '0.9rem', margin: '16px 0 6px' }}>On the record</h3>
            <ul className="rapsheet">
              {store.incidents.map((inc) => (
                <li key={inc.date + inc.text.slice(0, 20)}>
                  <span className="d">{formatDate(inc.date, true)}</span>
                  <p className="detail" style={{ margin: '2px 0 0' }}>
                    {inc.text}{' '}
                    <a className="faint" href={inc.source} target="_blank" rel="noreferrer noopener">[source]</a>
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}

export function RightsPage() {
  const { dataset } = useAppData();
  const stores = [...dataset.stores].sort((a, b) => a.grade.localeCompare(b.grade));

  return (
    <>
      <div className="pagehead">
        <h1>⚖️ Know your rights</h1>
        <p className="sub">
          Plain language, receipts attached: what that “buy” button legally means on each storefront,
          and which laws are actually moving. No storefront will tell you this — so we will.
        </p>
      </div>

      <div className="section">
        <h2>Storefront report cards</h2>
        <p className="sub">Graded on one thing: how much of what you “buy” you actually get to keep.</p>
        <div className="grid" style={{ gap: 10 }}>
          {stores.map((s) => (
            <StoreCard store={s} key={s.id} />
          ))}
        </div>
      </div>

      <div className="section">
        <h2>The law is (slowly) catching up</h2>
        <div className="grid" style={{ gap: 14 }}>
          {dataset.laws.map((law) => (
            <div className="card" key={law.id}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, flex: 1, minWidth: 240 }}>{law.name}</h3>
                <span className="tag">{law.jurisdiction}</span>
              </div>
              <p className="mono faint" style={{ fontSize: '0.75rem', margin: '6px 0 0' }}>
                {formatDate(law.date, true)} · {law.status}
              </p>
              <p className="dim" style={{ fontSize: '0.92rem' }}>{law.summary}</p>
              {law.whatYouCanDo && (
                <p style={{ fontSize: '0.92rem' }}>
                  <b>What you can do:</b> <span className="dim">{law.whatYouCanDo}</span>
                </p>
              )}
              {law.actionUrl && (
                <a className="btn small" href={law.actionUrl} target="_blank" rel="noreferrer noopener">
                  Take action →
                </a>
              )}
              <p className="sourcelist" style={{ marginTop: 10 }}>
                {law.sources.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ' · '}
                    <a href={s} target="_blank" rel="noreferrer noopener">{new URL(s).hostname.replace(/^www\./, '')}</a>
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
