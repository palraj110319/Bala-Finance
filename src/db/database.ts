/**
 * All application data lives in the browser's IndexedDB — there is no backend server.
 * This mirrors the original MySQL schema (see backend/src/main/resources/db/migration/V1__init_schema.sql)
 * one table -> one object store, with numeric auto-incrementing ids just like the MySQL `BIGINT AUTO_INCREMENT`
 * primary keys. Everything here is local to this browser profile on this device.
 */

export const DB_NAME = 'bala-finance-db';
export const DB_VERSION = 1;

export const STORES = {
  users: 'users',
  persons: 'persons',
  financialRecords: 'financialRecords',
  interestRecords: 'interestRecords',
  payments: 'payments',
  renewals: 'renewals',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = work(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  return tx<T[]>(storeName, 'readonly', (store) => store.getAll() as unknown as IDBRequest<T[]>);
}

export async function getById<T>(storeName: StoreName, id: number): Promise<T | undefined> {
  return tx<T | undefined>(storeName, 'readonly', (store) => store.get(id) as unknown as IDBRequest<T | undefined>);
}

/** Inserts a new row and returns the generated numeric id (mirrors AUTO_INCREMENT). */
export async function insert<T extends object>(storeName: StoreName, record: T): Promise<number> {
  return tx<number>(storeName, 'readwrite', (store) => store.add(record) as unknown as IDBRequest<number>);
}

export async function put<T extends { id: number }>(storeName: StoreName, record: T): Promise<number> {
  return tx<number>(storeName, 'readwrite', (store) => store.put(record) as unknown as IDBRequest<number>);
}

export async function remove(storeName: StoreName, id: number): Promise<void> {
  await tx<undefined>(storeName, 'readwrite', (store) => store.delete(id) as unknown as IDBRequest<undefined>);
}

export async function clearStore(storeName: StoreName): Promise<void> {
  await tx<undefined>(storeName, 'readwrite', (store) => store.clear() as unknown as IDBRequest<undefined>);
}

// ---------------------------------------------------------------------------------------------
// First-run seeding: the original app's Flyway migration seeded one default admin user
// (username "admin", password "ChangeMe123!") directly into MySQL. Since there's no database
// server here, we seed the same default account into IndexedDB the first time the app runs on
// a given browser, so the login screen behaves identically out of the box.
// ---------------------------------------------------------------------------------------------
import { hashPassword } from '@/lib/password';
import type { UserRecord } from '@/services/types';

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const users = await getAll<UserRecord>(STORES.users);
      if (users.length === 0) {
        const passwordHash = await hashPassword('ChangeMe123!');
        const now = new Date().toISOString();
        const admin: Omit<UserRecord, 'id'> = {
          username: 'admin',
          passwordHash,
          role: 'ADMIN',
          enabled: true,
          createdAt: now,
          updatedAt: now,
        };
        await insert<Omit<UserRecord, 'id'>>(STORES.users, admin);
      }
    })();
  }
  return seedPromise;
}
