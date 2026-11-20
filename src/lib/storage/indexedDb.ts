import {
  DEFAULT_SETTINGS,
  type CalculatorSettings,
  type CurrencyCacheEntry,
  type FavoriteFormula,
  type HistoryEntry,
  type NavSection,
  type SavedGraph,
} from '../../types/calculator';

const DB_NAME = 'nexa-calculator-db';
const DB_VERSION = 1;
const SETTINGS_LS_KEY = 'nexa-calculator-settings-v2';
const RECENT_LS_KEY = 'nexa-calculator-recent-v2';

const STORES = {
  HISTORY: 'history',
  FAVORITES: 'favorites',
  GRAPHS: 'savedGraphs',
  SETTINGS: 'settings',
  CURRENCY: 'currencyCache',
  RECENT_TOOLS: 'recentTools',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        const s = db.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
        s.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.GRAPHS)) {
        db.createObjectStore(STORES.GRAPHS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.CURRENCY)) {
        db.createObjectStore(STORES.CURRENCY, { keyPath: 'base' });
      }
      if (!db.objectStoreNames.contains(STORES.RECENT_TOOLS)) {
        db.createObjectStore(STORES.RECENT_TOOLS, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore in unsupported environment
  }
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

function readSettingsFallback(): CalculatorSettings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<CalculatorSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// History
export async function getHistory(): Promise<HistoryEntry[]> {
  const list = await getAllFromStore<HistoryEntry>(STORES.HISTORY);
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  await putInStore(STORES.HISTORY, entry);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await deleteFromStore(STORES.HISTORY, id);
}

export async function clearAllHistory(): Promise<void> {
  await clearStore(STORES.HISTORY);
}

// Favorites
export async function getFavoriteFormulas(): Promise<FavoriteFormula[]> {
  const list = await getAllFromStore<FavoriteFormula>(STORES.FAVORITES);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveFavoriteFormula(item: FavoriteFormula): Promise<void> {
  await putInStore(STORES.FAVORITES, item);
}

export async function deleteFavoriteFormula(id: string): Promise<void> {
  await deleteFromStore(STORES.FAVORITES, id);
}

// Saved Graphs
export async function getSavedGraphs(): Promise<SavedGraph[]> {
  const list = await getAllFromStore<SavedGraph>(STORES.GRAPHS);
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveGraph(graph: SavedGraph): Promise<void> {
  await putInStore(STORES.GRAPHS, graph);
}

export async function deleteSavedGraph(id: string): Promise<void> {
  await deleteFromStore(STORES.GRAPHS, id);
}

// Settings (IndexedDB + safe localStorage mirror for Android WebView resilience)
export async function loadSettings(): Promise<CalculatorSettings> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).get('app-settings');
      req.onsuccess = () => {
        const res = req.result as { key: string; value: Partial<CalculatorSettings> } | undefined;
        if (res?.value) {
          const merged: CalculatorSettings = { ...DEFAULT_SETTINGS, ...res.value };
          if (!res.value.notationMode && res.value.scientificNotation) {
            merged.notationMode = 'scientific';
          }
          resolve(merged);
        } else {
          resolve(readSettingsFallback());
        }
      };
      req.onerror = () => resolve(readSettingsFallback());
    });
  } catch {
    return readSettingsFallback();
  }
}

export async function saveSettings(settings: CalculatorSettings): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(settings));
    }
  } catch {
    // ignore storage quota errors
  }
  await putInStore(STORES.SETTINGS, { key: 'app-settings', value: settings });
}

// Currency cache
export async function getCachedCurrency(base: string): Promise<CurrencyCacheEntry | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.CURRENCY, 'readonly');
      const req = tx.objectStore(STORES.CURRENCY).get(base);
      req.onsuccess = () => resolve((req.result as CurrencyCacheEntry) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCachedCurrency(entry: CurrencyCacheEntry): Promise<void> {
  await putInStore(STORES.CURRENCY, entry);
}

// Recent Tools
export async function loadRecentTools(): Promise<NavSection[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.RECENT_TOOLS, 'readonly');
      const req = tx.objectStore(STORES.RECENT_TOOLS).get('recent');
      req.onsuccess = () => {
        const res = req.result as { key: string; tools: NavSection[] } | undefined;
        if (res?.tools) {
          resolve(res.tools);
        } else if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(RECENT_LS_KEY);
          resolve(raw ? (JSON.parse(raw) as NavSection[]) : ['scientific', 'graphs', 'ai-solver', 'converters']);
        } else {
          resolve(['scientific', 'graphs', 'ai-solver', 'converters']);
        }
      };
      req.onerror = () => resolve(['scientific', 'graphs', 'ai-solver', 'converters']);
    });
  } catch {
    return ['scientific', 'graphs', 'ai-solver', 'converters'];
  }
}

export async function saveRecentTools(tools: NavSection[]): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RECENT_LS_KEY, JSON.stringify(tools));
    }
  } catch {
    // ignore
  }
  await putInStore(STORES.RECENT_TOOLS, { key: 'recent', tools });
}
