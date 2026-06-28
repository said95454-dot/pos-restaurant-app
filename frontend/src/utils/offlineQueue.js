// Offline order queue backed by IndexedDB.
// Lets the POS keep working without internet — orders are stored locally
// and pushed to the backend when the network comes back.

const DB_NAME = 'pos-offline';
const DB_VERSION = 1;
const STORE = 'pending-orders';

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (mode) => {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
};

export const enqueueOrder = async (orderPayload, token) => {
  const store = await tx('readwrite');
  const record = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload: orderPayload,
    token,
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
};

export const getPendingOrders = async () => {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const removePendingOrder = async (localId) => {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const pendingCount = async () => (await getPendingOrders()).length;
