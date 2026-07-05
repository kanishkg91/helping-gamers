import type { RatedGame } from './types';
import type { PublisherStats } from './publisherStats';
import { formatLifespan } from './format';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export type GameStatus = 'alive' | 'doomed' | 'dead';

export interface FactorResult {
  id: string;
  label: string;
  /** Normalized weight actually used (all applicable factors sum to 1). */
  weight: number;
  /** 0–100, where 100 = safest. */
  score: number;
  /** Plain-language explanation of what was found and why it matters. */
  finding: string;
}

export interface SurvivalReport {
  status: GameStatus;
  /** 0–100 composite. Forced to ≤5 for doomed, 0 for dead. */
  score: number;
  grade: Grade;
  factors: FactorResult[];
}

export function gradeFor(score: number): Grade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

interface RawFactor extends Omit<FactorResult, 'weight'> {
  baseWeight: number;
}

function serverDependency(g: RatedGame, pubName: string): RawFactor {
  let score: number;
  let finding: string;
  switch (g.online) {
    case 'required':
      score = 0;
      finding = `Always-online. Nothing in this game works without ${pubName}'s servers — the day they switch them off, it is gone for everyone, disc or no disc.`;
      break;
    case 'features':
      if (g.spServerDependent) {
        score = 22;
        finding = `Core single-player features depend on ${pubName}'s servers. A shutdown wouldn't just kill multiplayer — it would gut the game you paid for.`;
      } else {
        score = 38;
        finding = `Significant features need ${pubName}'s servers. The core game survives a shutdown, but a real chunk of what you paid for doesn't.`;
      }
      break;
    case 'optional':
      score = 78;
      finding = `Online is optional. If the servers die, you lose multiplayer/extras but keep the core game.`;
      break;
    case 'none':
      score = 100;
      finding = `Fully playable offline. There are no servers whose death can take this game from you.`;
      break;
  }
  return { id: 'servers', label: 'Server dependency', baseWeight: 32, score, finding };
}

function drmFactor(g: RatedGame): RawFactor {
  const map = {
    drm_free: {
      score: 100,
      finding: 'DRM-free. Your installer works forever, no permission needed from anyone.',
    },
    storefront: {
      score: 68,
      finding: 'Tied to a storefront client. Fine day-to-day, but your access ultimately lives in their account database, not on your drive.',
    },
    denuvo: {
      score: 35,
      finding: 'Protected by Denuvo anti-tamper, which requires periodic online re-validation. If those activation servers ever go away without a patch, so does your access.',
    },
    online_auth: {
      score: 5,
      finding: 'Every session must authenticate with the publisher. Your copy is a login, not a possession.',
    },
  } as const;
  const m = map[g.drm];
  return { id: 'drm', label: 'DRM & activation', baseWeight: 14, score: m.score, finding: m.finding };
}

function businessModel(g: RatedGame): RawFactor {
  const map = {
    premium: {
      score: 100,
      finding: 'Pay-once product. No live-service economics pushing it toward a shutdown date.',
    },
    premium_live: {
      score: 55,
      finding: 'Paid up front but run as a live service — it stays alive only while the spreadsheet says so.',
    },
    subscription: {
      score: 45,
      finding: 'Subscription-run world. Its existence is a recurring line item that can be cancelled.',
    },
    f2p_live: {
      score: 18,
      finding: 'Free-to-play live service. Historically the highest-mortality category in gaming: it exists exactly as long as it is profitable.',
    },
  } as const;
  const m = map[g.model];
  return { id: 'model', label: 'Business model', baseWeight: 14, score: m.score, finding: m.finding };
}

function eolPlan(g: RatedGame, pubName: string): RawFactor {
  const map = {
    offline_patch_released: {
      score: 100,
      finding: 'An offline mode has already shipped. Whatever happens to the servers, the game survives on your machine.',
    },
    private_servers: {
      score: 88,
      finding: 'Private/community servers are possible or were released — the community can keep it alive without the publisher.',
    },
    offline_patch_promised: {
      score: 65,
      finding: `${pubName} has publicly promised an end-of-life offline mode. A promise is better than silence — and worth holding them to.`,
    },
    partial: {
      score: 40,
      finding: 'Only part of the game is designed to survive a shutdown. The rest goes dark with the servers.',
    },
    none: {
      score: 0,
      finding: `${pubName} has made clear nothing survives a shutdown. When it ends, it ends for everyone.`,
    },
    unknown: {
      score: 22,
      finding: `No end-of-life commitment of any kind. This is the industry default: when the servers die, you find out what you actually bought.`,
    },
  } as const;
  const m = map[g.eol];
  return { id: 'eol', label: 'End-of-life plan', baseWeight: 16, score: m.score, finding: m.finding };
}

function publisherRecord(g: RatedGame, stats: PublisherStats | undefined): RawFactor {
  if (!stats) {
    return {
      id: 'publisher',
      label: 'Publisher track record',
      baseWeight: 14,
      score: 70,
      finding: 'No shutdown history for this publisher in our records.',
    };
  }
  let finding: string;
  if (stats.kills === 0) {
    finding = `${stats.name} has no recorded game shutdowns in our data. Clean sheet — so far.`;
  } else {
    const median =
      stats.medianLifespanDays != null ? formatLifespan(stats.medianLifespanDays) : null;
    finding =
      `${stats.name} has switched off ${stats.kills} game${stats.kills === 1 ? '' : 's'} in our records` +
      (stats.totalKills > 0 ? ` — ${stats.totalKills} of them completely erased` : '') +
      (median ? `, with a median lifespan of ${median}` : '') +
      `. Track records repeat.`;
  }
  return {
    id: 'publisher',
    label: 'Publisher track record',
    baseWeight: 14,
    score: stats.score,
    finding,
  };
}

function physicalEscape(g: RatedGame): RawFactor {
  let score: number;
  let finding: string;
  if (g.physical && g.physicalComplete === true) {
    score = 100;
    finding = 'A complete playable copy exists on disc/cartridge. The last line of defense, and this game has it.';
  } else if (g.physical && g.physicalComplete === false) {
    score = 25;
    finding = 'The "physical" edition is not a complete game — it is a box around a download. It preserves nothing.';
  } else if (g.physical) {
    score = 55;
    finding = 'A physical edition exists, but it likely needs downloads to be fully playable.';
  } else {
    score = 40;
    finding = 'Digital-only. Your ownership is a row in a store database.';
  }
  if (g.drm === 'drm_free' && score < 85) {
    score = 90;
    finding = 'No disc, but a DRM-free installer is just as durable — back it up and it is yours for good.';
  }
  return { id: 'physical', label: 'Physical / backup escape hatch', baseWeight: 10, score, finding };
}

/**
 * Compute the survival report for a game. Weights are conditional: for a
 * fully offline game the end-of-life factor is inapplicable (there is nothing
 * to sunset) and its weight is redistributed across the remaining factors.
 */
export function scoreGame(
  g: RatedGame,
  publisherStats: PublisherStats | undefined,
  nowISO: string,
): SurvivalReport {
  const pubName = publisherStats?.name ?? 'the publisher';
  const fullyOffline = g.online === 'none' && !g.spServerDependent;

  const raw: RawFactor[] = [
    serverDependency(g, pubName),
    drmFactor(g),
    businessModel(g),
    ...(fullyOffline ? [] : [eolPlan(g, pubName)]),
    publisherRecord(g, publisherStats),
    physicalEscape(g),
  ];

  const totalWeight = raw.reduce((s, f) => s + f.baseWeight, 0);
  const factors: FactorResult[] = raw.map(({ baseWeight, ...f }) => ({
    ...f,
    weight: baseWeight / totalWeight,
  }));

  let score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0));

  let status: GameStatus = 'alive';
  if (g.shutdown) {
    const dead = Date.parse(g.shutdown.date) <= Date.parse(nowISO);
    status = dead ? 'dead' : 'doomed';
    score = dead ? 0 : Math.min(score, 5);
  }

  return { status, score, grade: gradeFor(score), factors };
}
