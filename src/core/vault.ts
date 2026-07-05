/**
 * Zero-knowledge vault crypto.
 *
 * The vault key is 128 bits of entropy generated ON THIS DEVICE. It is:
 *  - encoded as a 12-word BIP39-style recovery phrase (entropy + 4-bit
 *    checksum = 132 bits = 12 × 11-bit word indices) for moving between
 *    devices, and
 *  - expanded via HKDF-SHA256 into an AES-256-GCM key that encrypts the
 *    user's library before it ever leaves the device.
 *
 * The server (Supabase) only ever stores {iv, ciphertext}. Neither we nor
 * Supabase can decrypt it. Losing the phrase means losing the synced copy —
 * that asymmetry is the proof that nobody else has a way in.
 *
 * Uses only WebCrypto (`globalThis.crypto`), available in browsers and
 * Node 18+, so this module stays platform-neutral.
 */

import { WORDLIST } from './wordlist';

const subtle = () => globalThis.crypto.subtle;

export interface VaultPayload {
  /** Base64 12-byte IV. */
  iv: string;
  /** Base64 AES-GCM ciphertext (includes auth tag). */
  ciphertext: string;
}

// ---------- base64 helpers (no Buffer: must run in browsers) ----------

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- entropy <-> 12-word phrase (BIP39 encoding) ----------

export function generateEntropy(): Uint8Array {
  const entropy = new Uint8Array(16); // 128 bits
  globalThis.crypto.getRandomValues(entropy);
  return entropy;
}

async function checksumBits(entropy: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await subtle().digest('SHA-256', entropy.slice().buffer));
  // For 128-bit entropy the checksum is the first 4 bits of SHA-256.
  return hash[0].toString(2).padStart(8, '0').slice(0, 4);
}

export async function entropyToPhrase(entropy: Uint8Array): Promise<string[]> {
  if (entropy.length !== 16) throw new Error('vault entropy must be 128 bits');
  let bits = '';
  for (const b of entropy) bits += b.toString(2).padStart(8, '0');
  bits += await checksumBits(entropy);
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    words.push(WORDLIST[parseInt(bits.slice(i * 11, i * 11 + 11), 2)]);
  }
  return words;
}

/** Parse and checksum-validate a recovery phrase. Throws on invalid input. */
export async function phraseToEntropy(phrase: string[] | string): Promise<Uint8Array> {
  const words = (Array.isArray(phrase) ? phrase : phrase.trim().split(/\s+/)).map((w) =>
    w.toLowerCase().trim(),
  );
  if (words.length !== 12) throw new Error('The recovery phrase must be exactly 12 words.');
  let bits = '';
  for (const w of words) {
    const idx = WORDLIST.indexOf(w);
    if (idx === -1) throw new Error(`"${w}" is not a valid recovery word.`);
    bits += idx.toString(2).padStart(11, '0');
  }
  const entropy = new Uint8Array(16);
  for (let i = 0; i < 16; i++) entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const expected = await checksumBits(entropy);
  if (bits.slice(128) !== expected) {
    throw new Error('That phrase doesn’t check out — one of the words is wrong or out of order.');
  }
  return entropy;
}

// ---------- entropy -> AES key ----------

export async function deriveKey(entropy: Uint8Array): Promise<CryptoKey> {
  const raw = await subtle().importKey('raw', entropy.slice().buffer, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('killswitch-vault-v1'),
      info: new TextEncoder().encode('aes-256-gcm'),
    },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---------- encrypt / decrypt ----------

export async function encryptVault(key: CryptoKey, data: unknown): Promise<VaultPayload> {
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

export async function decryptVault<T>(key: CryptoKey, payload: VaultPayload): Promise<T> {
  const plaintext = await subtle().decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv).slice().buffer },
    key,
    fromBase64(payload.ciphertext).slice().buffer,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
