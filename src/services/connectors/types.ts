/**
 * Gaming-account connector framework. A connector either works honestly or
 * says honestly why it can't — no fake "coming soon" promises for platforms
 * that provide no consumer export API. That absence is part of the story
 * this app tells.
 */

export interface ImportedGame {
  /** Platform-native id (Steam appid etc.), stringified. */
  externalId: string;
  name: string;
}

export interface ImportResult {
  games: ImportedGame[];
}

export type ConnectorStatus = 'available' | 'unavailable';

export interface ConnectorInfo {
  id: string;
  name: string;
  status: ConnectorStatus;
  /** What the user needs to provide (available) or why it can't work (unavailable). */
  description: string;
}

export const CONNECTORS: ConnectorInfo[] = [
  {
    id: 'steam',
    name: 'Steam',
    status: 'available',
    description:
      'Reads your public profile’s game list. No login, no API key, nothing stored — your profile’s "Game details" must be set to Public for the import to see it.',
  },
  {
    id: 'psn',
    name: 'PlayStation Network',
    status: 'unavailable',
    description:
      'Sony provides no public API for you to export your own library. You bought the games; you don’t get a list of them. That’s part of the problem this app exists to document.',
  },
  {
    id: 'epic',
    name: 'Epic Games Store',
    status: 'unavailable',
    description:
      'Epic offers no consumer export API for your library. Your purchase history is visible only inside their launcher, on their terms.',
  },
  {
    id: 'xbox',
    name: 'Xbox',
    status: 'unavailable',
    description:
      'Microsoft’s Xbox APIs are for approved partners, not for you. There is no supported way to export the library you paid for.',
  },
];
