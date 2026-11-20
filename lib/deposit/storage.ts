"use client";

import { defaultState } from "./rooms";
import type { VaultItem, VaultState } from "./types";

/**
 * On-device storage for the deposit vault.
 *
 * IndexedDB database "terrarium-deposit-vault" (v1):
 *   - "state": one record under key "state" -> VaultState (rooms, lease dates, checklist ticks)
 *   - "items": VaultItem metadata, keyPath "id"
 *   - "blobs": the original File/Blob, keyed by the item id
 * Metadata and bytes are split so the UI can list everything without loading every video.
 *
 * If IndexedDB can't be opened or a write fails (private mode, blocked site data, quota),
 * the vault keeps working from an in-memory copy and reports `mode: "memory"` so the UI can warn.
 */

const DB_NAME = "terrarium-deposit-vault";
const DB_VERSION = 1;

export type StorageMode = "indexeddb" | "memory";

export type Vault = {
  mode: StorageMode;
  /** Last storage error, if any (human-readable). */
  error: string | null;
  loadAll(): Promise<{ state: VaultState; items: VaultItem[] }>;
  saveState(state: VaultState): Promise<void>;
  putItem(item: VaultItem, blob: Blob): Promise<void>;
  updateItem(item: VaultItem): Promise<void>;
  deleteItems(ids: string[]): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  clearAll(): Promise<void>;
};

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "id" });
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("Could not open IndexedDB"));
    r.onblocked = () => reject(new Error("IndexedDB open was blocked"));
  });
}

function msg(e: unknown): string {
  if (e instanceof DOMException && e.name === "QuotaExceededError") return "This browser is out of storage space for the site.";
  return e instanceof Error ? e.message : String(e);
}

export async function openVault(): Promise<Vault> {
  // In-memory mirror: always up to date, used as the source of truth when IndexedDB fails.
  let memState: VaultState = defaultState();
  const memItems = new Map<string, VaultItem>();
  const memBlobs = new Map<string, Blob>();

  let db: IDBDatabase | null = null;
  const vault: Vault = {
    mode: "memory",
    error: null,
    async loadAll() {
      if (db) {
        try {
          const tx = db.transaction(["state", "items"], "readonly");
          const [s, items] = await Promise.all([
            req(tx.objectStore("state").get("state") as IDBRequest<VaultState | undefined>),
            req(tx.objectStore("items").getAll() as IDBRequest<VaultItem[]>),
          ]);
          if (s) memState = { ...defaultState(), ...s };
          items.forEach((i) => memItems.set(i.id, i));
        } catch (e) {
          fail(e);
        }
      }
      return { state: memState, items: [...memItems.values()] };
    },
    async saveState(state) {
      memState = state;
      await write(["state"], (tx) => tx.objectStore("state").put(state, "state"));
    },
    async putItem(item, blob) {
      memItems.set(item.id, item);
      memBlobs.set(item.id, blob);
      await write(["items", "blobs"], (tx) => {
        tx.objectStore("blobs").put(blob, item.id);
        tx.objectStore("items").put(item);
      });
      // Once safely on disk, don't hold a second copy of big files in memory.
      if (vault.mode === "indexeddb") memBlobs.delete(item.id);
    },
    async updateItem(item) {
      memItems.set(item.id, item);
      await write(["items"], (tx) => tx.objectStore("items").put(item));
    },
    async deleteItems(ids) {
      ids.forEach((id) => {
        memItems.delete(id);
        memBlobs.delete(id);
      });
      await write(["items", "blobs"], (tx) => {
        ids.forEach((id) => {
          tx.objectStore("items").delete(id);
          tx.objectStore("blobs").delete(id);
        });
      });
    },
    async getBlob(id) {
      const m = memBlobs.get(id);
      if (m) return m;
      if (!db) return null;
      try {
        const b = await req(db.transaction("blobs", "readonly").objectStore("blobs").get(id) as IDBRequest<Blob | undefined>);
        return b ?? null;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    async clearAll() {
      memState = defaultState();
      memItems.clear();
      memBlobs.clear();
      await write(["state", "items", "blobs"], (tx) => {
        tx.objectStore("state").clear();
        tx.objectStore("items").clear();
        tx.objectStore("blobs").clear();
      });
    },
  };

  function fail(e: unknown) {
    vault.error = msg(e);
    vault.mode = "memory";
  }

  async function write(stores: string[], fn: (tx: IDBTransaction) => void) {
    if (!db || vault.mode !== "indexeddb") return;
    try {
      const tx = db.transaction(stores, "readwrite");
      fn(tx);
      await done(tx);
    } catch (e) {
      // Keep going in memory; blobs written earlier are still on disk, but new ones live only in this tab.
      fail(e);
    }
  }

  try {
    db = await openDb();
    vault.mode = "indexeddb";
  } catch (e) {
    vault.error = msg(e);
  }
  return vault;
}

export type StorageInfo = { usage: number | null; quota: number | null; persisted: boolean | null };

export async function getStorageInfo(): Promise<StorageInfo> {
  const info: StorageInfo = { usage: null, quota: null, persisted: null };
  try {
    const s = navigator.storage;
    if (s?.estimate) {
      const e = await s.estimate();
      info.usage = e.usage ?? null;
      info.quota = e.quota ?? null;
    }
    if (s?.persisted) info.persisted = await s.persisted();
  } catch {
    /* unsupported */
  }
  return info;
}

/** Ask the browser not to evict our data under storage pressure. Returns the outcome, or null if unsupported. */
export async function requestPersist(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
