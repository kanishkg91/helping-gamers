import { useSyncExternalStore } from 'react';

/**
 * Hand-rolled hash router. Routes look like "#/game/nhl-22"; we parse the
 * hash into segments and let App switch on them. Hash routing keeps the SPA
 * deployable anywhere (static hosts, single-file demo) with zero server
 * rewrite rules, and stays out of the way of Supabase's ?code= OAuth query.
 */

export interface Route {
  /** Path segments after "#/" — "#/game/nhl-22" → ["game", "nhl-22"]. */
  segments: string[];
  path: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const path = decodeURIComponent(raw).replace(/\/+$/, '');
  return { segments: path === '' ? [] : path.split('/'), path };
}

let current = typeof window !== 'undefined' ? parse() : { segments: [], path: '' };

function subscribe(fn: () => void): () => void {
  const handler = () => {
    current = parse();
    fn();
  };
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export function navigate(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

/** href helper so links are plain <a> tags (middle-click etc. all work). */
export function href(path: string): string {
  return `#${path}`;
}
