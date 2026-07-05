/**
 * Platform capability: key-value persistence.
 *
 * src/core never touches storage directly; everything goes through this
 * interface. The web implementation uses localStorage; a Tauri/Capacitor
 * shell swaps in its own implementation without touching core or UI.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

class WebStorage implements KeyValueStore {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null; // private-mode / blocked storage: degrade to in-memory
    }
  }
  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* ignore quota/permission errors: app keeps working in-memory */
    }
  }
  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export const storage: KeyValueStore = new WebStorage();
