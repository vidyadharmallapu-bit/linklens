import type { StoredImageRecord } from '../types';

export const DB_NAME = 'linklens-db';
export const DB_VERSION = 1;
export const STORE_IMAGES = 'images';

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and connects to the LinkLens IndexedDB database.
 * Uses singleton caching to prevent multiple parallel open requests.
 */
export function initializeDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      initPromise = null;
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const store = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('fileName', 'fileName', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      dbInstance = db;
      initPromise = null;

      db.onversionchange = () => {
        db.close();
        dbInstance = null;
      };

      db.onclose = () => {
        dbInstance = null;
      };

      resolve(db);
    };

    request.onerror = (event: Event) => {
      initPromise = null;
      const error = (event.target as IDBOpenDBRequest).error;
      reject(new Error(`Failed to open IndexedDB database "${DB_NAME}": ${error?.message ?? 'Unknown error'}`));
    };

    request.onblocked = () => {
      initPromise = null;
      reject(new Error(`Database upgrade for "${DB_NAME}" is blocked by another open tab or window.`));
    };
  });

  return initPromise;
}

/**
 * Helper to execute a database transaction with standard error and abort handling.
 */
async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await initializeDatabase();

  return new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      let callbackResult: T;

      tx.onerror = () => {
        reject(tx.error ?? new Error(`IndexedDB transaction error on store "${storeName}".`));
      };

      tx.onabort = () => {
        reject(tx.error ?? new Error(`IndexedDB transaction on store "${storeName}" was aborted.`));
      };

      tx.oncomplete = () => {
        resolve(callbackResult);
      };

      Promise.resolve(callback(store, tx))
        .then((res) => {
          callbackResult = res;
        })
        .catch((err) => {
          try {
            tx.abort();
          } catch {
            // Transaction might already be closed or committing
          }
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Persists an image record with its binary Blob to the "images" object store.
 */
export async function saveImage(record: StoredImageRecord): Promise<void> {
  return runTransaction(STORE_IMAGES, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to save image record to IndexedDB.'));
    });
  });
}

/**
 * Retrieves a single stored image record by its primary key (ID).
 */
export async function getImage(id: string): Promise<StoredImageRecord | null> {
  return runTransaction(STORE_IMAGES, 'readonly', (store) => {
    return new Promise<StoredImageRecord | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error(`Failed to retrieve image with ID ${id}.`));
    });
  });
}

/**
 * Retrieves all stored images from the database, ordered by creation date descending.
 */
export async function getAllImages(): Promise<StoredImageRecord[]> {
  return runTransaction(STORE_IMAGES, 'readonly', (store) => {
    return new Promise<StoredImageRecord[]>((resolve, reject) => {
      // Use the createdAt index to retrieve records
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const records: StoredImageRecord[] = request.result ?? [];
        // Sort newest first
        records.sort((a, b) => b.createdAt - a.createdAt);
        resolve(records);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to retrieve all images from IndexedDB.'));
      };
    });
  });
}

/**
 * Deletes an image record from IndexedDB by its ID.
 */
export async function deleteImage(id: string): Promise<void> {
  return runTransaction(STORE_IMAGES, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error(`Failed to delete image with ID ${id}.`));
    });
  });
}

/**
 * Calculates the total number of images and total file size stored in IndexedDB.
 */
export async function getTotalStorageUsed(): Promise<{ imageCount: number; bytesUsed: number }> {
  const images = await getAllImages();
  const bytesUsed = images.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  return {
    imageCount: images.length,
    bytesUsed,
  };
}

/**
 * Clears all records from the "images" object store.
 */
export async function clearAllImages(): Promise<void> {
  return runTransaction(STORE_IMAGES, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to clear images store.'));
    });
  });
}

/**
 * Retrieves real browser storage estimates via navigator.storage.estimate()
 * and combines them with LinkLens database metrics.
 */
export async function getStorageMetrics(): Promise<{
  imageCount: number;
  bytesUsed: number;
  quotaBytes: number | null;
  browserUsageBytes: number | null;
}> {
  const { imageCount, bytesUsed } = await getTotalStorageUsed();

  let quotaBytes: number | null = null;
  let browserUsageBytes: number | null = null;

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota !== undefined) quotaBytes = estimate.quota;
      if (estimate.usage !== undefined) browserUsageBytes = estimate.usage;
    } catch {
      // Storage estimation may fail in certain security sandboxes
    }
  }

  return {
    imageCount,
    bytesUsed,
    quotaBytes,
    browserUsageBytes,
  };
}
