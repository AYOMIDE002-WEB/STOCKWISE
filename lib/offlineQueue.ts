"use client";

/**
 * Minimal IndexedDB-backed offline queue.
 * When a sale is recorded while offline, it's stored here instead of
 * being lost. Once the browser detects it's back online, queued sales
 * are automatically pushed to Supabase.
 */

const DB_NAME = "stockwise-offline";
const STORE_NAME = "pending-sales";
const DB_VERSION = 2;

export type PendingSaleItem = {
  product_id: string;
  quantity: number;
};

export type PendingSale = {
  localId: string;
  customer_id: string | null;
  items: PendingSaleItem[];
  estimated_total: number;
  created_at: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // v2 changed the queued-sale shape (single item -> list of items),
      // so drop any old-format store and start clean.
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: "localId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueSale(sale: Omit<PendingSale, "localId">) {
  const db = await openDb();
  const localId = crypto.randomUUID();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...sale, localId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedSales(): Promise<PendingSale[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueuedSale(localId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempts to sync every queued offline sale to Supabase.
 * Call this on app load and whenever the browser comes back online.
 */
export async function syncQueuedSales(
  submitFn: (sale: PendingSale) => Promise<boolean>
) {
  const queued = await getQueuedSales();
  for (const sale of queued) {
    const success = await submitFn(sale);
    if (success) {
      await removeQueuedSale(sale.localId);
    }
  }
  return queued.length;
}
