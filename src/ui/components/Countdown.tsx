import { useEffect, useState } from 'react';
import { formatDate } from '../../core/format';

/**
 * Live shutdown countdown. For approximate dates we only know the month, so
 * ticking seconds would be false precision — we show the month instead.
 */
export function Countdown({ targetISO, approx }: { targetISO: string; approx?: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (approx) {
    return (
      <div>
        <span className="tag red">~ {formatDate(targetISO, true)}</span>
        <p className="dim" style={{ fontSize: '0.85rem', marginTop: 8 }}>
          Exact day not announced — the publisher has only committed to a month.
        </p>
      </div>
    );
  }

  const ms = Date.parse(`${targetISO}T00:00:00`) - now;
  if (ms <= 0) return <span className="tag red">Servers are off.</span>;

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="countdown" role="timer" aria-label={`${days} days until shutdown`}>
      {[
        [days, days === 1 ? 'day' : 'days'],
        [pad(hours), 'hours'],
        [pad(mins), 'min'],
        [pad(secs), 'sec'],
      ].map(([n, l]) => (
        <span className="unit" key={l as string}>
          <span className="num">{n}</span>
          <span className="lbl">{l}</span>
        </span>
      ))}
    </div>
  );
}
