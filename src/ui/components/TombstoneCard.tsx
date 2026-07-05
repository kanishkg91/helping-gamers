import type { DeadGame } from '../../core/types';
import { daysBetween, formatDate, formatLifespan, formatMoney } from '../../core/format';
import { useAppData } from '../data';
import { href } from '../router';

const LOSS_LABEL: Record<DeadGame['loss'], { text: string; cls: string }> = {
  everything: { text: 'everything lost', cls: 'red' },
  online_only: { text: 'online portions lost', cls: 'amber' },
  delisted: { text: 'delisted', cls: 'amber' },
};

export function TombstoneCard({ game }: { game: DeadGame }) {
  const { dataset } = useAppData();
  const pub = dataset.publishers.find((p) => p.id === game.publisherId);
  const days = daysBetween(game.released, game.died);
  const loss = LOSS_LABEL[game.loss];

  return (
    <div className="card tombstone">
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>
          <a href={href(`/game/${game.id}`)} style={{ textDecoration: 'none' }}>
            {game.title}
          </a>
        </h3>
        <span className={`tag ${loss.cls}`}>{loss.text}</span>
        {game.refunds && <span className="tag green">refunded</span>}
      </div>
      <div className="lifespan" style={{ marginTop: 6 }}>
        {formatDate(game.released, game.approx)} — {formatDate(game.died, game.approx)}
        {' · '}lived {formatLifespan(days)}
        {game.priceUSD > 0 && <> · launched at {formatMoney(game.priceUSD)}</>}
      </div>
      <p className="epitaph">{game.epitaph}</p>
      {pub && (
        <a href={href(`/publisher/${pub.id}`)} className="dim" style={{ fontSize: '0.82rem' }}>
          {pub.name}
        </a>
      )}
    </div>
  );
}
