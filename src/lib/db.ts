// Schlanke IndexedDB-Schicht ohne Fremdbibliothek.
// Datenbank "rasenzeit", Schema-Version 1. Datenformat-Version siehe DATA_VERSION.

import type { AttachmentRecord, StoreName, User } from '../domain/types';
import { STORE_NAMES } from '../domain/types';

const DB_NAME = 'rasenzeit';
const DB_SCHEMA = 1;

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown, public readonly quota = false) {
    super(message);
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('Dieser Browser stellt keinen lokalen Datenspeicher (IndexedDB) bereit.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_SCHEMA);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of [...STORE_NAMES, 'meta', 'attachments']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new StorageError('Der lokale Datenspeicher konnte nicht geöffnet werden. Im privaten Modus mancher Browser ist er gesperrt.', req.error));
    req.onblocked = () => reject(new StorageError('Rasenzeit ist in einem anderen Tab geöffnet. Bitte schließe diesen und lade neu.'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function wrapError(e: unknown): StorageError {
  const name = (e as DOMException | null)?.name;
  if (name === 'QuotaExceededError') {
    return new StorageError('Der Speicherplatz in diesem Browser ist erschöpft. Entferne große Fotos oder Dokumente oder exportiere und bereinige ältere Daten.', e, true);
  }
  return new StorageError('Speichern fehlgeschlagen. Bitte versuche es erneut.', e);
}

function tx<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => T): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let result: T;
        let t: IDBTransaction;
        try {
          t = db.transaction(stores, mode);
          result = fn(t);
        } catch (e) {
          reject(wrapError(e));
          return;
        }
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(wrapError(t.error));
        t.onabort = () => reject(wrapError(t.error));
      }),
  );
}

export async function getAll<T>(store: StoreName | 'meta' | 'attachments'): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(wrapError(req.error));
  });
}

export function put<T extends { id: string }>(store: StoreName | 'meta', value: T): Promise<void> {
  return tx([store], 'readwrite', (t) => { t.objectStore(store).put(value); });
}

export function putMany(entries: { store: StoreName | 'meta'; value: { id: string } }[]): Promise<void> {
  const stores = Array.from(new Set(entries.map((e) => e.store)));
  if (!stores.length) return Promise.resolve();
  return tx(stores, 'readwrite', (t) => {
    for (const e of entries) t.objectStore(e.store).put(e.value);
  });
}

export function remove(store: StoreName | 'attachments', id: string): Promise<void> {
  return tx([store], 'readwrite', (t) => { t.objectStore(store).delete(id); });
}

export function removeMany(entries: { store: StoreName | 'attachments'; id: string }[]): Promise<void> {
  const stores = Array.from(new Set(entries.map((e) => e.store)));
  if (!stores.length) return Promise.resolve();
  return tx(stores, 'readwrite', (t) => {
    for (const e of entries) t.objectStore(e.store).delete(e.id);
  });
}

export async function getMeta<T>(id: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readonly').objectStore('meta').get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(wrapError(req.error));
  });
}

export async function getUser(): Promise<User | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readonly').objectStore('meta').get('user');
    req.onsuccess = () => resolve((req.result as User) ?? null);
    req.onerror = () => reject(wrapError(req.error));
  });
}

export function putAttachment(rec: AttachmentRecord): Promise<void> {
  return tx(['attachments'], 'readwrite', (t) => { t.objectStore('attachments').put(rec); });
}

export async function getAttachment(id: string): Promise<AttachmentRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('attachments', 'readonly').objectStore('attachments').get(id);
    req.onsuccess = () => resolve((req.result as AttachmentRecord) ?? null);
    req.onerror = () => reject(wrapError(req.error));
  });
}

/** Liest nur Metadaten der Anhänge (Blob wird verworfen). */
export async function getAttachmentMetas() {
  const all = await getAll<AttachmentRecord>('attachments');
  return all.map(({ blob: _b, ...meta }) => meta);
}

export async function clearAll(): Promise<void> {
  const stores = [...STORE_NAMES, 'meta', 'attachments'];
  await tx(stores, 'readwrite', (t) => {
    for (const s of stores) t.objectStore(s).clear();
  });
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
    }
  } catch { /* nicht verfügbar */ }
  return null;
}

export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* ignorieren */ }
  return null;
}
