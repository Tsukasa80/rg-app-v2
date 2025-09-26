import { getWeekKey, isoWeekInfo } from './utils/date.js';

const DB_NAME = 'rgx-db';
const DB_VERSION = 1;
const STORE_NAMES = {
  activities: 'activity_entries',
  weeklySelections: 'weekly_selections',
  reflections: 'weekly_reflections',
};

let dbPromise;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAMES.activities)) {
        const store = db.createObjectStore(STORE_NAMES.activities, { keyPath: 'id' });
        store.createIndex('by_date', 'occurredAt');
        store.createIndex('by_type', 'type');
        store.createIndex('by_week', 'weekKey');
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.weeklySelections)) {
        const store = db.createObjectStore(STORE_NAMES.weeklySelections, { keyPath: 'id' });
        store.createIndex('by_week_type', ['weekKey', 'type']);
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.reflections)) {
        const store = db.createObjectStore(STORE_NAMES.reflections, { keyPath: 'id' });
        store.createIndex('by_week', 'weekKey');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function isIdbRequest(value) {
  return value && typeof value === 'object' && 'onsuccess' in value && 'onerror' in value;
}

async function withStore(name, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);
    let result;
    try {
      result = action(store, tx);
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }

    const handleError = (error) => reject(error ?? tx.error ?? new DOMException('Transaction aborted', 'AbortError'));

    if (isIdbRequest(result)) {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => handleError(result.error);
      tx.onabort = () => handleError();
      tx.onerror = () => handleError();
    } else {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => handleError();
      tx.onabort = () => handleError();
    }
  });
}

export async function addActivity(entry) {
  const now = new Date().toISOString();
  const record = {
    ...entry,
    createdAt: entry.createdAt ?? now,
    updatedAt: now,
    weekKey: getWeekKey(entry.occurredAt, entry.weekStartsOn ?? 1),
  };
  await withStore(STORE_NAMES.activities, 'readwrite', (store) => {
    store.put(record);
  });
  return record;
}

export async function listActivities() {
  return withStore(STORE_NAMES.activities, 'readonly', (store) => store.getAll());
}

export async function getActivity(id) {
  return withStore(STORE_NAMES.activities, 'readonly', (store) => store.get(id));
}

export async function deleteActivity(id) {
  return withStore(STORE_NAMES.activities, 'readwrite', (store) => store.delete(id));
}

export async function bulkAddActivities(entries) {
  const now = new Date().toISOString();
  return withStore(STORE_NAMES.activities, 'readwrite', (store) => {
    entries.forEach((entry) => {
      const record = {
        ...entry,
        createdAt: entry.createdAt ?? now,
        updatedAt: now,
        weekKey: entry.weekKey ?? getWeekKey(entry.occurredAt),
      };
      store.put(record);
    });
  });
}

export async function saveWeeklySelection(selection) {
  const now = new Date().toISOString();
  const { year, isoWeek } = isoWeekInfo(selection.referenceDate ?? Date.now());
  const weekKey = selection.weekKey ?? `${selection.year ?? year}-${String(selection.isoWeek ?? isoWeek).padStart(2, '0')}`;
  const record = {
    ...selection,
    weekKey,
    updatedAt: now,
    id: selection.id ?? `${weekKey}-${selection.type}`,
  };
  await withStore(STORE_NAMES.weeklySelections, 'readwrite', (store) => store.put(record));
  return record;
}

export async function getWeeklySelection(weekKey, type) {
  return withStore(STORE_NAMES.weeklySelections, 'readonly', (store) => {
    const index = store.index('by_week_type');
    return index.get([weekKey, type]);
  });
}

export async function listWeeklySelections() {
  return withStore(STORE_NAMES.weeklySelections, 'readonly', (store) => store.getAll());
}

export async function saveWeeklyReflection(reflection) {
  const now = new Date().toISOString();
  const weekKey = reflection.weekKey ?? `${reflection.year}-${String(reflection.isoWeek).padStart(2, '0')}`;
  const record = {
    ...reflection,
    weekKey,
    updatedAt: now,
    id: reflection.id ?? `${weekKey}-reflection`,
  };
  await withStore(STORE_NAMES.reflections, 'readwrite', (store) => store.put(record));
  return record;
}

export async function getWeeklyReflection(weekKey) {
  return withStore(STORE_NAMES.reflections, 'readonly', (store) => {
    const index = store.index('by_week');
    return index.get(weekKey);
  });
}

export async function listWeeklyReflections() {
  return withStore(STORE_NAMES.reflections, 'readonly', (store) => store.getAll());
}

export async function exportAll() {
  const [entries, weekly, reflections] = await Promise.all([
    listActivities(),
    listWeeklySelections(),
    listWeeklyReflections(),
  ]);
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    entries,
    weeklySelections: weekly,
    weeklyReflections: reflections,
  };
}

export async function importData(payload) {
  const { entries = [], weeklySelections = [], weeklyReflections = [] } = payload ?? {};
  await withStore(STORE_NAMES.activities, 'readwrite', (store) => {
    entries.forEach((entry) => store.put({ ...entry, weekKey: entry.weekKey ?? getWeekKey(entry.occurredAt) }));
  });
  await withStore(STORE_NAMES.weeklySelections, 'readwrite', (store) => {
    weeklySelections.forEach((item) => store.put({ ...item }));
  });
  await withStore(STORE_NAMES.reflections, 'readwrite', (store) => {
    weeklyReflections.forEach((item) => store.put({ ...item }));
  });
}

export async function clearAll() {
  await Promise.all([
    withStore(STORE_NAMES.activities, 'readwrite', (store) => store.clear()),
    withStore(STORE_NAMES.weeklySelections, 'readwrite', (store) => store.clear()),
    withStore(STORE_NAMES.reflections, 'readwrite', (store) => store.clear()),
  ]);
}

export { STORE_NAMES };
