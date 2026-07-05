import type { RatedGame } from './types';
import type { SurvivalReport } from './score';
import { formatDate, daysUntil } from './format';

export interface Verdict {
  /** Short punchy one-liner shown under the grade. */
  headline: string;
  /** 2–3 sentence plain-language explanation. */
  body: string;
}

const HEADLINES: Record<string, string[]> = {
  A: ['They can’t take this one from you.', 'About as safe as gaming gets.'],
  B: ['Mostly yours. Mind the fine print.', 'Yours, with an asterisk.'],
  C: ['Playable today. Promised nothing tomorrow.', 'Yours until further notice.'],
  D: ['On borrowed time.', 'You’re a guest here, not an owner.'],
  F: ['You are renting this, whatever the buy button said.', 'One server bill away from not existing.'],
};

/** Deterministic pick so a game always gets the same headline. */
function pick(options: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

export function buildVerdict(
  g: RatedGame,
  report: SurvivalReport,
  publisherName: string,
  nowISO: string,
): Verdict {
  if (report.status === 'dead') {
    const when = g.shutdown ? formatDate(g.shutdown.date, g.shutdown.approx) : 'already';
    return {
      headline: 'This game is already gone.',
      body: `${publisherName} switched it off on ${when}. ${
        g.shutdown?.note ?? 'Whatever players paid, the product no longer exists.'
      }`,
    };
  }

  if (report.status === 'doomed' && g.shutdown) {
    const days = daysUntil(g.shutdown.date, nowISO);
    const when = formatDate(g.shutdown.date, g.shutdown.approx);
    return {
      headline: `Death sentence: ${when}.`,
      body:
        `${publisherName} has announced the shutdown${
          days > 0 ? ` — ${days} day${days === 1 ? '' : 's'} left` : ''
        }. ${g.shutdown.note ?? ''} Play it, finish it, or get a refund while anyone still answers support tickets.`.trim(),
    };
  }

  // Alive: compose from the strongest signals, worst first.
  const sorted = [...report.factors].sort((a, b) => a.score - b.score);
  const worst = sorted[0];
  const secondWorst = sorted[1];
  const best = sorted[sorted.length - 1];

  const parts: string[] = [];
  if (report.grade === 'A') {
    parts.push(best.finding);
    if (worst.score < 80) parts.push(worst.finding);
  } else if (report.grade === 'B') {
    parts.push(worst.finding, best.score >= 85 ? best.finding : secondWorst.finding);
  } else {
    parts.push(worst.finding, secondWorst.finding);
    if (report.grade === 'F' && g.priceUSD > 0) {
      parts.push(
        `If that happens, the $${g.priceUSD} you paid buys you a login screen that no longer logs in.`,
      );
    }
  }

  return {
    headline: pick(HEADLINES[report.grade], g.id),
    body: parts.join(' '),
  };
}
