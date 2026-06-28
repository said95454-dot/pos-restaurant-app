import axios from 'axios';
import { getPendingOrders, removePendingOrder } from './offlineQueue';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

let syncing = false;

// Push every queued order to the backend. Returns { synced, failed }.
export const syncPendingOrders = async () => {
  if (syncing) return { synced: 0, failed: 0, skipped: true };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await getPendingOrders();
    for (const item of pending) {
      try {
        await axios.post(`${API_URL}/orders`, item.payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(item.token ? { Authorization: `Bearer ${item.token}` } : {}),
          },
          timeout: 15000,
        });
        await removePendingOrder(item.localId);
        try { window.dispatchEvent(new Event('pos-queue-updated')); } catch { /* noop */ }
        synced += 1;
      } catch (e) {
        // Auth/validation problems: drop so we don't loop forever
        const status = e.response?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          await removePendingOrder(item.localId);
          try { window.dispatchEvent(new Event('pos-queue-updated')); } catch { /* noop */ }
        }
        failed += 1;
      }
    }
  } finally {
    syncing = false;
    try { window.dispatchEvent(new Event('pos-queue-updated')); } catch { /* noop */ }
  }
  return { synced, failed };
};
