import { RadioStation } from '../types';

const DB_NAME = 'NeoTuneOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'last_listened_stations';
const MAX_OFFLINE_STATIONS = 10;

interface OfflineStationEntry {
  id: string;
  station: RadioStation;
  listenedTimestamp: number;
}

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        console.warn('IndexedDB is not supported in this environment.');
        resolve(null);
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('listenedTimestamp', 'listenedTimestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (err) => {
          console.warn('Failed to open IndexedDB:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('Error opening IndexedDB:', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves or updates a station in IndexedDB and ensures only the last 10 listened-to stations are kept.
   */
  async saveStation(station: RadioStation): Promise<void> {
    if (!station || !station.id) return;
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const entry: OfflineStationEntry = {
          id: station.id,
          station,
          listenedTimestamp: Date.now()
        };

        store.put(entry);

        tx.oncomplete = () => {
          // Prune store to keep max 10 items
          this.pruneOldStations(db);
          resolve();
        };

        tx.onerror = () => {
          resolve();
        };
      } catch (e) {
        console.warn('Failed to save station to IndexedDB:', e);
        resolve();
      }
    });
  }

  /**
   * Internal helper to prune entries exceeding the 10 station offline limit
   */
  private async pruneOldStations(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('listenedTimestamp');

      const getAllReq = index.getAll();
      getAllReq.onsuccess = () => {
        const entries: OfflineStationEntry[] = getAllReq.result || [];
        if (entries.length > MAX_OFFLINE_STATIONS) {
          // Sort oldest first
          entries.sort((a, b) => a.listenedTimestamp - b.listenedTimestamp);
          const toRemoveCount = entries.length - MAX_OFFLINE_STATIONS;
          const toDelete = entries.slice(0, toRemoveCount);

          const deleteTx = db.transaction(STORE_NAME, 'readwrite');
          const deleteStore = deleteTx.objectStore(STORE_NAME);
          toDelete.forEach((item) => {
            deleteStore.delete(item.id);
          });
        }
      };
    } catch (e) {
      console.warn('IndexedDB pruning failed:', e);
    }
  }

  /**
   * Retrieves the last 10 listened-to stations from IndexedDB sorted by newest timestamp first.
   */
  async getOfflineStations(): Promise<RadioStation[]> {
    const db = await this.initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('listenedTimestamp');

        const getAllReq = index.getAll();
        getAllReq.onsuccess = () => {
          const entries: OfflineStationEntry[] = getAllReq.result || [];
          // Sort newest first
          entries.sort((a, b) => b.listenedTimestamp - a.listenedTimestamp);
          const stations = entries.slice(0, MAX_OFFLINE_STATIONS).map(e => e.station);
          resolve(stations);
        };

        getAllReq.onerror = () => {
          resolve([]);
        };
      } catch (e) {
        console.warn('Failed to get offline stations from IndexedDB:', e);
        resolve([]);
      }
    });
  }

  /**
   * Clears the IndexedDB offline station store.
   */
  async clearOfflineCache(): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
}

export const indexedDBService = new IndexedDBService();
