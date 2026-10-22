import { useEffect, useReducer, useSyncExternalStore } from "react";

// Everything lives on-device in localStorage under one key. Export a backup regularly (Settings).
export const KEY = "tobacco_v1";
export const DEFAULT_SETTINGS = { gPerOz: 28, lowStockG: 28, coldDays: 21, overdueDays: 14, lastBackup: null };

export const now = () => Date.now();
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const empty = () => ({ txs: [], customers: [], settings: { ...DEFAULT_SETTINGS } });

/** Coerce any parsed JSON into a valid state shape (used for load and for backup import). */
export function normalize(d) {
  if (!d || typeof d !== "object") throw new Error("Not a Matrix Leaf backup");
  return {
    txs: Array.isArray(d.txs) ? d.txs.filter(t => t && t.type && t.date) : [],
    customers: Array.isArray(d.customers) ? d.customers.filter(c => c && c.id && c.name) : [],
    settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
  };
}

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : empty();
  } catch (e) {
    console.error("[tobacco] load failed, keeping raw copy", e);
    try { if (raw) localStorage.setItem(KEY + "_corrupt", raw); } catch (e2) { console.error(e2); }
    return empty();
  }
}

function reducer(s, a) {
  switch (a.type) {
    case "addTx":    return { ...s, txs: [...s.txs, a.tx] };
    case "updateTx": return { ...s, txs: s.txs.map(t => (t.id === a.tx.id ? a.tx : t)) };
    case "delTx":    return { ...s, txs: s.txs.filter(t => t.id !== a.id) };
    case "addCust":  return { ...s, customers: [...s.customers, a.customer] };
    case "updCust":  return { ...s, customers: s.customers.map(c => (c.id === a.customer.id ? { ...c, ...a.customer } : c)) };
    case "delCust":  return { ...s, customers: s.customers.filter(c => c.id !== a.id) };
    case "settings": return { ...s, settings: { ...s.settings, ...a.patch } };
    case "replace":  return normalize(a.state);
    case "merge":    return { ...s, txs: [...s.txs, ...a.txs], customers: [...s.customers, ...a.customers] };
    default:         return s;
  }
}

// Save-error status lives outside React so persisting (an external side effect) can report failure without a setState-in-effect.
let saveErr = null;
const listeners = new Set();
const setSaveErr = v => { if (v !== saveErr) { saveErr = v; listeners.forEach(l => l()); } };
const subscribe = l => { listeners.add(l); return () => listeners.delete(l); };

/** App state + auto-persist. Returns [state, dispatch, saveError]. */
export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const saveError = useSyncExternalStore(subscribe, () => saveErr);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setSaveErr(null);
    } catch (e) {
      console.error("[tobacco] save failed", e);
      setSaveErr(String(e?.message || e));
    }
  }, [state]);
  useEffect(() => {
    // Ask the browser not to evict our data under storage pressure (best effort; iOS may ignore).
    navigator.storage?.persist?.().catch(e => console.warn("[tobacco] persist() rejected", e));
  }, []);
  return [state, dispatch, saveError];
}
