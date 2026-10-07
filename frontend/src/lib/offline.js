/* Offline-first: local cache + sync queue for Kader.
   Visits (and family/member creation) are queued when offline and flushed automatically online. */
import { api } from "./api";

const QK = "pws_sync_queue";
const CK = "pws_cache";
export const SYNC_EVENT = "pws-sync-change";

function emit() { window.dispatchEvent(new Event(SYNC_EVENT)); }

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QK) || "[]"); } catch { return []; }
}
function setQueue(q) { localStorage.setItem(QK, JSON.stringify(q)); emit(); }

export function enqueue(item) {
  const q = getQueue();
  q.push({ ...item, _qid: `${Date.now()}_${Math.random().toString(36).slice(2)}`, ts: new Date().toISOString() });
  setQueue(q);
}

/* ---- offline cache (families, family detail, questions) ---- */
function cacheAll() { try { return JSON.parse(localStorage.getItem(CK) || "{}"); } catch { return {}; } }
export function cacheSet(key, val) { const c = cacheAll(); c[key] = val; localStorage.setItem(CK, JSON.stringify(c)); }
export function cacheGet(key) { return cacheAll()[key]; }

export const isOnline = () => navigator.onLine;

/* Submit a visit: direct when online, queue on failure/offline. */
export async function submitKunjungan(payload) {
  if (isOnline()) {
    try {
      await api.post("/kunjungan", payload);
      return { queued: false };
    } catch (e) {
      // network error -> queue; server (4xx) error -> rethrow
      if (e.response) throw e;
      enqueue({ endpoint: "/kunjungan", method: "post", payload, label: `Kunjungan ${payload.keluarga_nama || ""}` });
      return { queued: true };
    }
  }
  enqueue({ endpoint: "/kunjungan", method: "post", payload, label: `Kunjungan ${payload.keluarga_nama || ""}` });
  return { queued: true };
}

/* Flush the queue. Returns {sent, failed}. */
export async function flushQueue() {
  if (!isOnline()) return { sent: 0, failed: 0 };
  let q = getQueue();
  if (!q.length) return { sent: 0, failed: 0 };
  const remaining = [];
  let sent = 0, failed = 0;
  for (const item of q) {
    try {
      await api[item.method || "post"](item.endpoint, item.payload);
      sent++;
    } catch (e) {
      if (e.response) { failed++; /* server rejected -> drop, would never succeed */ }
      else { remaining.push(item); } // keep on network error
    }
  }
  setQueue(remaining);
  return { sent, failed };
}
