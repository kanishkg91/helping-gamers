import type { Dataset, DeadGame, PublisherRecord } from './types';
import { daysBetween, yearOf } from './format';

export interface PublisherStats {
  publisherId: string;
  name: string;
  /** Total dead games recorded. */
  kills: number;
  /** Dead games where everything was lost for everyone. */
  totalKills: number;
  medianLifespanDays: number | null;
  shortestLived: { title: string; days: number } | null;
  latestKill: { title: string; died: string } | null;
  /** Sum of launch prices of fully-killed paid games (a floor, per copy). */
  pricesBurnedUSD: number;
  /** 0–100 track-record score (100 = clean record in our data). */
  score: number;
  deadGames: DeadGame[];
}

const LOSS_PENALTY = { everything: 14, online_only: 7, delisted: 3 } as const;

function recencyMultiplier(diedISO: string, nowISO: string): number {
  const years = (Date.parse(nowISO) - Date.parse(diedISO)) / (365.25 * 86_400_000);
  if (years <= 2) return 1.4;
  if (years <= 5) return 1.0;
  return 0.55;
}

export function computePublisherStats(
  publisher: PublisherRecord,
  graveyard: DeadGame[],
  nowISO: string,
): PublisherStats {
  const dead = graveyard
    .filter((g) => g.publisherId === publisher.id)
    .sort((a, b) => b.died.localeCompare(a.died));

  const lifespans = dead
    .map((g) => ({ title: g.title, days: daysBetween(g.released, g.died) }))
    .sort((a, b) => a.days - b.days);

  let penalty = 0;
  for (const g of dead) {
    let p = LOSS_PENALTY[g.loss] * recencyMultiplier(g.died, nowISO);
    if (g.refunds) p *= 0.7; // refunding players is the one mitigating act
    penalty += p;
  }

  const median =
    lifespans.length === 0
      ? null
      : lifespans[Math.floor((lifespans.length - 1) / 2)].days;

  return {
    publisherId: publisher.id,
    name: publisher.name,
    kills: dead.length,
    totalKills: dead.filter((g) => g.loss === 'everything').length,
    medianLifespanDays: median,
    shortestLived: lifespans[0] ?? null,
    latestKill: dead[0] ? { title: dead[0].title, died: dead[0].died } : null,
    pricesBurnedUSD: dead
      .filter((g) => g.loss === 'everything')
      .reduce((sum, g) => sum + g.priceUSD, 0),
    score: Math.max(0, Math.round(100 - penalty)),
    deadGames: dead,
  };
}

export function computeAllPublisherStats(
  dataset: Dataset,
  nowISO: string,
): Map<string, PublisherStats> {
  const map = new Map<string, PublisherStats>();
  for (const pub of dataset.publishers) {
    map.set(pub.id, computePublisherStats(pub, dataset.graveyard, nowISO));
  }
  return map;
}

/** Graveyard-wide headline numbers for the home page. */
export interface GraveyardTotals {
  totalDead: number;
  deadThisYear: number;
  currentYear: number;
  shortestLifespan: { title: string; days: number } | null;
  medianLifespanDays: number | null;
}

export function computeGraveyardTotals(graveyard: DeadGame[], nowISO: string): GraveyardTotals {
  const year = yearOf(nowISO);
  const lifespans = graveyard
    .map((g) => ({ title: g.title, days: daysBetween(g.released, g.died) }))
    .sort((a, b) => a.days - b.days);
  return {
    totalDead: graveyard.length,
    deadThisYear: graveyard.filter((g) => yearOf(g.died) === year).length,
    currentYear: year,
    shortestLifespan: lifespans[0] ?? null,
    medianLifespanDays:
      lifespans.length === 0 ? null : lifespans[Math.floor((lifespans.length - 1) / 2)].days,
  };
}
