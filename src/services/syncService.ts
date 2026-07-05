import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserState } from '../core/types';
import {
  decryptVault,
  deriveKey,
  encryptVault,
  entropyToPhrase,
  fromBase64,
  generateEntropy,
  phraseToEntropy,
  toBase64,
} from '../core/vault';
import { mergeUserState, sameUserState } from '../core/sync';
import { storage } from '../platform/storage';
import { userStore } from './userStore';

const ENTROPY_KEY = 'killswitch.vaultEntropy.v1';
const TABLE = 'vaults';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the deployment ships Supabase credentials. The app is fully
 * functional without them — sync UI simply shows "not configured". */
export function isSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export type SyncPhase =
  | 'unconfigured' // no Supabase env: local-only build
  | 'signed_out'
  | 'needs_vault' // signed in, no local key, no remote vault -> create one
  | 'needs_phrase' // signed in, remote vault exists, no local key -> enter phrase
  | 'ready';

export interface SyncState {
  phase: SyncPhase;
  email: string | null;
  busy: boolean;
  error: string | null;
  lastSyncAt: string | null;
}

let state: SyncState = {
  phase: isSyncConfigured() ? 'signed_out' : 'unconfigured',
  email: null,
  busy: false,
  error: null,
  lastSyncAt: null,
};

const listeners = new Set<() => void>();
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => state,
  );
}

// ---------- supabase client (lazy) ----------

let clientPromise: Promise<SupabaseClient> | null = null;
function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
      }),
    );
  }
  return clientPromise;
}

// ---------- vault key handling ----------

function localEntropy(): Uint8Array | null {
  const raw = storage.get(ENTROPY_KEY);
  return raw ? fromBase64(raw) : null;
}

async function vaultKey(): Promise<CryptoKey | null> {
  const entropy = localEntropy();
  return entropy ? deriveKey(entropy) : null;
}

// ---------- remote vault io ----------

interface VaultRow {
  user_id: string;
  iv: string;
  ciphertext: string;
  version: number;
}

async function fetchRemote(client: SupabaseClient, userId: string): Promise<VaultRow | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('user_id, iv, ciphertext, version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function pushRemote(client: SupabaseClient, userId: string, version: number): Promise<void> {
  const key = await vaultKey();
  if (!key) throw new Error('No vault key on this device.');
  const payload = await encryptVault(key, userStore.getState());
  const { error } = await client
    .from(TABLE)
    .upsert({ user_id: userId, iv: payload.iv, ciphertext: payload.ciphertext, version });
  if (error) throw new Error(error.message);
}

// ---------- public api ----------

export async function initSync(): Promise<void> {
  if (!isSyncConfigured()) return;
  const client = await getClient();
  const { data } = await client.auth.getSession();
  const session = data.session;
  if (!session) {
    setState({ phase: 'signed_out' });
    return;
  }
  setState({ email: session.user.email ?? null });
  await resolvePhase(client, session.user.id);
  client.auth.onAuthStateChange((_event, s) => {
    if (!s) setState({ phase: 'signed_out', email: null });
  });
}

async function resolvePhase(client: SupabaseClient, userId: string): Promise<void> {
  try {
    const remote = await fetchRemote(client, userId);
    if (localEntropy()) {
      setState({ phase: 'ready', error: null });
      await syncNow();
    } else if (remote) {
      setState({ phase: 'needs_phrase', error: null });
    } else {
      setState({ phase: 'needs_vault', error: null });
    }
  } catch (err) {
    setState({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function signInWithGoogle(): Promise<void> {
  const client = await getClient();
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) setState({ error: error.message });
}

export async function signOut(): Promise<void> {
  const client = await getClient();
  await client.auth.signOut();
  setState({ phase: 'signed_out', email: null, lastSyncAt: null });
}

/** Create a brand-new vault on this device. Returns the 12-word phrase —
 * shown once, never stored anywhere but the user's own head/notebook. */
export async function createVault(): Promise<string[]> {
  const entropy = generateEntropy();
  const phrase = await entropyToPhrase(entropy);
  storage.set(ENTROPY_KEY, toBase64(entropy));
  setState({ phase: 'ready', error: null });
  await syncNow();
  return phrase;
}

/** Unlock an existing vault on a new device with the recovery phrase. */
export async function unlockWithPhrase(phrase: string): Promise<void> {
  setState({ busy: true, error: null });
  try {
    const entropy = await phraseToEntropy(phrase);
    const key = await deriveKey(entropy);
    const client = await getClient();
    const { data } = await client.auth.getSession();
    if (!data.session) throw new Error('Not signed in.');
    const remote = await fetchRemote(client, data.session.user.id);
    if (remote) {
      // Proves the phrase matches this vault; wrong phrase = failed auth tag.
      await decryptVault<UserState>(key, { iv: remote.iv, ciphertext: remote.ciphertext });
    }
    storage.set(ENTROPY_KEY, toBase64(entropy));
    setState({ phase: 'ready' });
    await syncNow();
  } catch (err) {
    setState({
      error:
        err instanceof Error && /decrypt|operation/i.test(err.message)
          ? 'That phrase doesn’t unlock this vault. Check the words and their order.'
          : err instanceof Error
            ? err.message
            : String(err),
    });
    throw err;
  } finally {
    setState({ busy: false });
  }
}

/** Pull remote, merge with local (union), push the merge back. */
export async function syncNow(): Promise<void> {
  if (state.phase !== 'ready' || state.busy) return;
  setState({ busy: true, error: null });
  try {
    const client = await getClient();
    const { data } = await client.auth.getSession();
    if (!data.session) throw new Error('Not signed in.');
    const userId = data.session.user.id;
    const key = await vaultKey();
    if (!key) throw new Error('No vault key on this device.');

    const remote = await fetchRemote(client, userId);
    let merged = userStore.getState();
    let nextVersion = 1;
    if (remote) {
      nextVersion = remote.version + 1;
      const remoteState = await decryptVault<UserState>(key, {
        iv: remote.iv,
        ciphertext: remote.ciphertext,
      });
      merged = mergeUserState(userStore.getState(), remoteState);
    }
    if (!sameUserState(merged, userStore.getState())) userStore.setState(merged);
    await pushRemote(client, userId, nextVersion);
    setState({ lastSyncAt: new Date().toISOString() });
  } catch (err) {
    setState({ error: err instanceof Error ? err.message : String(err) });
  } finally {
    setState({ busy: false });
  }
}

/** Wipe the vault key from this device (does not delete the remote vault). */
export function forgetVaultKeyOnThisDevice(): void {
  storage.remove(ENTROPY_KEY);
  setState({ phase: isSyncConfigured() ? 'needs_phrase' : 'unconfigured' });
}

// Debounced auto-push: any shelf/watchlist change syncs within a few seconds.
let pushTimer: ReturnType<typeof setTimeout> | undefined;
userStore.subscribe(() => {
  if (state.phase !== 'ready') return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void syncNow(), 4000);
});
