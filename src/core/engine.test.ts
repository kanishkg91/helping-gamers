import { describe, expect, it } from 'vitest';
import type { DeadGame, Dataset, PublisherRecord, RatedGame } from './types';
import { gradeFor, scoreGame } from './score';
import { buildVerdict } from './verdicts';
import { computePublisherStats } from './publisherStats';
import { applyAging } from './aging';
import { matchScore, normalize, searchGames } from './search';
import { daysBetween, formatLifespan } from './format';
import {
  decryptVault,
  deriveKey,
  encryptVault,
  entropyToPhrase,
  generateEntropy,
  phraseToEntropy,
} from './vault';
import { mergeUserState } from './sync';

const NOW = '2026-07-04';

function game(overrides: Partial<RatedGame>): RatedGame {
  return {
    id: 'test-game',
    title: 'Test Game',
    year: 2024,
    publisherId: 'pub',
    platforms: ['pc'],
    priceUSD: 60,
    online: 'none',
    spServerDependent: false,
    drm: 'storefront',
    model: 'premium',
    eol: 'unknown',
    physical: false,
    physicalComplete: null,
    sources: ['https://example.com'],
    ...overrides,
  };
}

function dead(overrides: Partial<DeadGame>): DeadGame {
  return {
    id: 'dead-game',
    title: 'Dead Game',
    publisherId: 'pub',
    released: '2020-01-01',
    died: '2023-01-01',
    priceUSD: 60,
    model: 'premium_live',
    loss: 'everything',
    epitaph: 'It is no more. It has ceased to be.',
    sources: ['https://example.com'],
    ...overrides,
  };
}

const publisher: PublisherRecord = { id: 'pub', name: 'Test Publisher', rapSheet: [] };

describe('scoring engine', () => {
  it('gives an A to a DRM-free fully offline game', () => {
    const stats = computePublisherStats(publisher, [], NOW);
    const report = scoreGame(game({ drm: 'drm_free', online: 'none' }), stats, NOW);
    expect(report.grade).toBe('A');
    expect(report.status).toBe('alive');
    // end-of-life factor must be excluded for fully offline games
    expect(report.factors.find((f) => f.id === 'eol')).toBeUndefined();
  });

  it('fails an always-online F2P game from a killer publisher', () => {
    const graveyard = [dead({ id: 'kill1' }), dead({ id: 'kill2', died: '2025-06-01' })];
    const stats = computePublisherStats(publisher, graveyard, NOW);
    const report = scoreGame(
      game({ online: 'required', drm: 'online_auth', model: 'f2p_live', priceUSD: 0 }),
      stats,
      NOW,
    );
    expect(report.grade).toBe('F');
  });

  it('forces F + doomed status when a shutdown is announced', () => {
    const stats = computePublisherStats(publisher, [], NOW);
    const report = scoreGame(
      game({ drm: 'drm_free', shutdown: { announced: '2026-06-01', date: '2026-09-30' } }),
      stats,
      NOW,
    );
    expect(report.status).toBe('doomed');
    expect(report.grade).toBe('F');
    expect(report.score).toBeLessThanOrEqual(5);
  });

  it('marks games dead once the date passes', () => {
    const report = scoreGame(
      game({ shutdown: { announced: '2026-01-01', date: '2026-07-01' } }),
      undefined,
      NOW,
    );
    expect(report.status).toBe('dead');
    expect(report.score).toBe(0);
  });

  it('weights sum to 1 for every game shape', () => {
    for (const g of [game({}), game({ online: 'required' }), game({ online: 'none', drm: 'drm_free' })]) {
      const report = scoreGame(g, undefined, NOW);
      const total = report.factors.reduce((s, f) => s + f.weight, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it('grade thresholds are monotonic', () => {
    expect(gradeFor(85)).toBe('A');
    expect(gradeFor(70)).toBe('B');
    expect(gradeFor(55)).toBe('C');
    expect(gradeFor(40)).toBe('D');
    expect(gradeFor(39)).toBe('F');
  });
});

describe('verdicts', () => {
  it('produces stable, non-empty plain language', () => {
    const g = game({ online: 'required', model: 'f2p_live' });
    const report = scoreGame(g, undefined, NOW);
    const v1 = buildVerdict(g, report, 'Test Publisher', NOW);
    const v2 = buildVerdict(g, report, 'Test Publisher', NOW);
    expect(v1.headline).toBe(v2.headline);
    expect(v1.body.length).toBeGreaterThan(40);
  });

  it('mentions the countdown for doomed games', () => {
    const g = game({ shutdown: { announced: '2026-06-01', date: '2026-08-31' } });
    const report = scoreGame(g, undefined, NOW);
    const v = buildVerdict(g, report, 'Test Publisher', NOW);
    expect(v.headline).toContain('August 31, 2026');
  });
});

describe('publisher stats', () => {
  it('counts kills and computes lifespans', () => {
    const graveyard = [
      dead({ id: 'a', released: '2024-08-23', died: '2024-09-06' }),
      dead({ id: 'b', released: '2014-12-02', died: '2024-03-31' }),
    ];
    const stats = computePublisherStats(publisher, graveyard, NOW);
    expect(stats.kills).toBe(2);
    expect(stats.shortestLived?.days).toBe(14);
    expect(stats.score).toBeLessThan(80);
  });

  it('softens the penalty when players were refunded', () => {
    const killed = computePublisherStats(publisher, [dead({})], NOW);
    const refunded = computePublisherStats(publisher, [dead({ refunds: true })], NOW);
    expect(refunded.score).toBeGreaterThan(killed.score);
  });
});

describe('aging', () => {
  const baseDataset: Dataset = {
    version: 1,
    updated: NOW,
    games: [
      game({ id: 'doomed', shutdown: { announced: '2026-01-01', date: '2026-07-01' }, online: 'required' }),
      game({ id: 'safe' }),
    ],
    graveyard: [],
    publishers: [publisher],
    stores: [],
    laws: [],
  };

  it('moves expired games to the graveyard with correct loss', () => {
    const aged = applyAging(baseDataset, NOW);
    expect(aged.games.map((g) => g.id)).toEqual(['safe']);
    expect(aged.graveyard).toHaveLength(1);
    expect(aged.graveyard[0].id).toBe('doomed');
    expect(aged.graveyard[0].loss).toBe('everything');
  });

  it('is a no-op when nothing expired', () => {
    const dataset = { ...baseDataset, games: [game({ id: 'safe' })] };
    expect(applyAging(dataset, NOW)).toBe(dataset);
  });
});

describe('search', () => {
  const dataset: Dataset = {
    version: 1,
    updated: NOW,
    games: [
      game({ id: 'gta-5', title: 'Grand Theft Auto V', aliases: ['gta 5', 'gtav'] }),
      game({ id: 'gt7', title: 'Gran Turismo 7' }),
    ],
    graveyard: [dead({ id: 'concord', title: 'Concord' })],
    publishers: [publisher],
    stores: [],
    laws: [],
  };

  it('normalizes diacritics and punctuation', () => {
    expect(normalize('Pokémon: Scarlet & Violet!')).toBe('pokemon scarlet violet');
  });

  it('ranks exact > prefix > substring', () => {
    const exact = matchScore('concord', 'concord');
    const prefix = matchScore('conc', 'concord');
    const sub = matchScore('cord', 'concord');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(sub);
  });

  it('finds games by alias and dead games by title', () => {
    const hits = searchGames(dataset, 'gtav');
    expect(hits[0].game.id).toBe('gta-5');
    const deadHits = searchGames(dataset, 'concord');
    expect(deadHits[0].kind).toBe('dead');
  });
});

describe('format', () => {
  it('computes lifespans in human terms', () => {
    expect(daysBetween('2024-08-23', '2024-09-06')).toBe(14);
    expect(formatLifespan(14)).toBe('14 days');
    expect(formatLifespan(400)).toBe('1.1 years');
  });
});

describe('vault crypto', () => {
  it('round-trips entropy through the 12-word phrase with checksum', async () => {
    const entropy = generateEntropy();
    const phrase = await entropyToPhrase(entropy);
    expect(phrase).toHaveLength(12);
    const back = await phraseToEntropy(phrase.join(' '));
    expect([...back]).toEqual([...entropy]);
  });

  it('rejects a tampered phrase', async () => {
    const phrase = await entropyToPhrase(generateEntropy());
    phrase[0] = phrase[0] === 'abandon' ? 'ability' : 'abandon';
    await expect(phraseToEntropy(phrase)).rejects.toThrow();
  });

  it('encrypts and decrypts the user state', async () => {
    const key = await deriveKey(generateEntropy());
    const state = { shelf: [{ gameId: 'gta-5', title: 'GTA V', addedAt: NOW }], watchlist: ['nhl-22'] };
    const payload = await encryptVault(key, state);
    expect(payload.ciphertext).not.toContain('gta');
    const decrypted = await decryptVault<typeof state>(key, payload);
    expect(decrypted).toEqual(state);
  });

  it('cannot decrypt with a different key (zero-knowledge property)', async () => {
    const payload = await encryptVault(await deriveKey(generateEntropy()), { secret: true });
    await expect(decryptVault(await deriveKey(generateEntropy()), payload)).rejects.toThrow();
  });
});

describe('sync merge', () => {
  it('unions shelves, earliest add wins', () => {
    const a = {
      shelf: [{ gameId: 'x', title: 'X', addedAt: '2026-01-01' }],
      watchlist: ['w1'],
    };
    const b = {
      shelf: [
        { gameId: 'x', title: 'X', addedAt: '2026-02-01' },
        { gameId: 'y', title: 'Y', addedAt: '2026-03-01' },
      ],
      watchlist: ['w2'],
    };
    const merged = mergeUserState(a, b);
    expect(merged.shelf).toHaveLength(2);
    expect(merged.shelf[0].addedAt).toBe('2026-01-01');
    expect(merged.watchlist.sort()).toEqual(['w1', 'w2']);
  });
});
