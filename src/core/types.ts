/**
 * Core domain model. This module (and everything in src/core) is pure
 * TypeScript with zero DOM/platform imports so it can be reused verbatim
 * in native shells (Tauri, Capacitor) or a future React Native app.
 */

export type Platform = 'pc' | 'playstation' | 'xbox' | 'nintendo' | 'mobile';

/** How much of the game needs the publisher's servers to function. */
export type OnlineRequirement =
  | 'none' // fully playable offline
  | 'optional' // online only for optional multiplayer/extras; core game untouched
  | 'features' // meaningful features (saves, progression, co-op, career) need servers
  | 'required'; // always-online: nothing works without servers

export type DrmLevel =
  | 'drm_free' // runs from a plain installer forever (e.g. GOG)
  | 'storefront' // needs the store client to launch/validate (Steam, EA app…)
  | 'denuvo' // third-party anti-tamper requiring periodic online validation
  | 'online_auth'; // every session authenticates against publisher servers

export type BusinessModel =
  | 'premium' // pay once, done
  | 'premium_live' // paid up front but run as a live service
  | 'f2p_live' // free-to-play live service (exists only while profitable)
  | 'subscription'; // MMO-style recurring fee

/** What the publisher has committed to for this game's end of life. */
export type EolPlan =
  | 'offline_patch_released' // an offline mode already shipped
  | 'offline_patch_promised' // publicly committed, not yet shipped
  | 'private_servers' // community/self-host option exists or was released
  | 'partial' // some content survives shutdown, some doesn't
  | 'none' // publisher has said or shown that nothing survives
  | 'unknown'; // no commitment either way (the industry default)

export interface ShutdownNotice {
  /** ISO date the shutdown was announced. */
  announced: string;
  /** ISO date the servers go (or went) dark. */
  date: string;
  /** True when the date is approximate (displayed as month + year). */
  approx?: boolean;
  note?: string;
}

export interface RatedGame {
  id: string;
  title: string;
  /** Alternative names/abbreviations for search ("gta 5", "botw"…). */
  aliases?: string[];
  year: number;
  publisherId: string;
  platforms: Platform[];
  /** Typical price paid in USD; 0 for free-to-play. */
  priceUSD: number;
  online: OnlineRequirement;
  /** True when the single-player/campaign portion itself needs servers. */
  spServerDependent: boolean;
  drm: DrmLevel;
  model: BusinessModel;
  eol: EolPlan;
  physical: boolean;
  /** True when the physical copy is complete & playable without downloads. */
  physicalComplete: boolean | null;
  shutdown?: ShutdownNotice;
  notes?: string;
  sources: string[];
}

export type Loss =
  | 'everything' // the game ceased to exist for everyone
  | 'online_only' // online portions died; something remains playable
  | 'delisted'; // pulled from sale/download; existing copies still run

export interface DeadGame {
  id: string;
  title: string;
  publisherId: string;
  /** ISO release date. */
  released: string;
  /** ISO date it died (servers off / delisted). */
  died: string;
  /** True when either date is approximate (displayed as month + year). */
  approx?: boolean;
  /** Launch price in USD; 0 for free-to-play. */
  priceUSD: number;
  model: BusinessModel;
  loss: Loss;
  /** One-line, factual description of what happened. */
  epitaph: string;
  playersAffected?: string;
  /** True if the publisher refunded purchases. */
  refunds?: boolean;
  sources: string[];
}

export interface RapSheetEntry {
  date: string;
  title: string;
  detail: string;
  sources: string[];
}

export interface PublisherRecord {
  id: string;
  name: string;
  rapSheet: RapSheetEntry[];
  quote?: { text: string; attribution: string; source: string };
}

export type StoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface StoreGuide {
  id: string;
  name: string;
  grade: StoreGrade;
  gradeReason: string;
  whatBuyMeans: string;
  canRevoke: string;
  refunds: string;
  offlineStory: string;
  incidents: { date: string; text: string; source: string }[];
  sources: string[];
}

export interface LawItem {
  id: string;
  jurisdiction: string;
  name: string;
  status: string;
  date: string;
  summary: string;
  whatYouCanDo?: string;
  actionUrl?: string;
  sources: string[];
}

export interface Dataset {
  /** Monotonically increasing dataset version. */
  version: number;
  /** ISO date this dataset was last regenerated. */
  updated: string;
  games: RatedGame[];
  graveyard: DeadGame[];
  publishers: PublisherRecord[];
  stores: StoreGuide[];
  laws: LawItem[];
}

/** A game the user says they own (works for both rated + unlisted games). */
export interface OwnedGame {
  /** RatedGame id when matched, or `custom:<slug>` for manual entries. */
  gameId: string;
  /** Denormalized title so custom entries render without dataset lookup. */
  title: string;
  addedAt: string;
}

export interface UserState {
  shelf: OwnedGame[];
  /** RatedGame ids the user is watching on Death Watch. */
  watchlist: string[];
}

export const EMPTY_USER_STATE: UserState = { shelf: [], watchlist: [] };
