import type { Grade } from '../../core/score';
import { GRADE_HEX } from './GradeBadge';

export interface ShelfCardData {
  gradeCounts: { grade: Grade; count: number }[];
  totalGames: number;
  moneyAtRiskUSD: number;
  doomedCount: number;
}

/**
 * Renders the "My Shelf" share card as a 1200×630 PNG (standard OG size).
 * Pure canvas, no DOM nodes attached — safe to call from any click handler.
 */
export async function renderShelfCard(data: ShelfCardData): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0a0c0f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#222a35';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // Brand: power symbol + wordmark
  const cx = 96;
  const cy = 92;
  ctx.strokeStyle = '#ff4545';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 27, -Math.PI / 2 + 0.65, (3 * Math.PI) / 2 - 0.65);
  ctx.stroke();

  ctx.fillStyle = '#e9edf3';
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('KillSwitch', 150, cy - 12);
  ctx.fillStyle = '#9aa7b5';
  ctx.font = '400 22px system-ui, sans-serif';
  ctx.fillText('You bought it. Find out if you get to keep it.', 150, cy + 26);

  // Headline number
  ctx.fillStyle = '#ff4545';
  ctx.font = '800 92px system-ui, sans-serif';
  const money =
    data.moneyAtRiskUSD >= 1000
      ? `$${(data.moneyAtRiskUSD / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : `$${Math.round(data.moneyAtRiskUSD)}`;
  ctx.fillText(money, 72, 245);
  const moneyW = ctx.measureText(money).width;
  ctx.fillStyle = '#e9edf3';
  ctx.font = '650 34px system-ui, sans-serif';
  ctx.fillText('of my game library can be', 72 + moneyW + 24, 232);
  ctx.fillText('switched off remotely.', 72 + moneyW + 24, 272);

  // Sub-stats
  ctx.fillStyle = '#9aa7b5';
  ctx.font = '500 26px system-ui, sans-serif';
  const subs = [
    `${data.totalGames} game${data.totalGames === 1 ? '' : 's'} on my shelf`,
    data.doomedCount > 0
      ? `${data.doomedCount} already ${data.doomedCount === 1 ? 'has' : 'have'} a shutdown date`
      : null,
  ].filter(Boolean);
  ctx.fillText(subs.join('  ·  '), 72, 330);

  // Grade distribution bar (letters + counts always visible)
  const total = data.gradeCounts.reduce((s, c) => s + c.count, 0);
  const barX = 72;
  const barY = 392;
  const barW = W - 144;
  const barH = 96;
  if (total > 0) {
    let x = barX;
    for (const { grade, count } of data.gradeCounts) {
      if (count === 0) continue;
      const w = (count / total) * barW;
      ctx.fillStyle = GRADE_HEX[grade] + '38';
      ctx.strokeStyle = GRADE_HEX[grade];
      ctx.lineWidth = 2.5;
      roundRect(ctx, x, barY, Math.max(w - 5, 3), barH, 12);
      ctx.fill();
      ctx.stroke();
      if (w >= 64) {
        ctx.fillStyle = GRADE_HEX[grade];
        ctx.font = '800 40px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(grade, x + w / 2 - 2, barY + barH / 2 - 12);
        ctx.fillStyle = '#e9edf3';
        ctx.font = '600 24px ui-monospace, monospace';
        ctx.fillText(`×${count}`, x + w / 2 - 2, barY + barH / 2 + 26);
        ctx.textAlign = 'left';
      }
      x += w;
    }
  }

  // Footer
  ctx.fillStyle = '#5d6a79';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText('Survival grades for the games you own — check yours', 72, 560);
  ctx.fillStyle = '#9aa7b5';
  ctx.font = '650 22px ui-monospace, monospace';
  ctx.fillText('A: they can’t take it   →   F: you’re renting it', 72, 594);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
