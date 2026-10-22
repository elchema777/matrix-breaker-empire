import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatrixRain from "../components/MatrixRain";
import Lock from "./Lock";
import TxSheet from "./TxSheet";
import CustomerSheet from "./CustomerSheet";
import BatchesSheet from "./BatchesSheet";
import Home from "./screens/Home";
import Log from "./screens/Log";
import Clients from "./screens/Clients";
import Deben from "./screens/Deben";
import Settings from "./screens/Settings";
import { useStore, uid, now as clock } from "./store";
import { buildLedger, todayStr, TYPES } from "./calc";
import { Sheet } from "./ui";
import { C, F } from "./theme";

const Stats = lazy(() => import("./screens/Stats"));

const SKEY = "tobacco_unlocked";
const AUTOLOCK_MS = 2 * 60 * 1000;
const TABS = [
  { id: "home",    icon: "⬡",  label: "Home" },
  { id: "log",     icon: "📒", label: "Log" },
  { id: "clients", icon: "👥", label: "Clients" },
  { id: "owed",    icon: "⏳", label: "Deben" },
  { id: "stats",   icon: "📊", label: "Stats" },
];

const getUnlocked = () => { try { return sessionStorage.getItem(SKEY) === "1"; } catch { return false; } };

export default function App() {
  const [unlocked, setUnlocked] = useState(getUnlocked);
  const unlock = () => { try { sessionStorage.setItem(SKEY, "1"); } catch (e) { console.warn(e); } setUnlocked(true); };
  const lock = useCallback(() => { try { sessionStorage.removeItem(SKEY); } catch (e) { console.warn(e); } setUnlocked(false); }, []);
  if (!unlocked) return <Lock onUnlock={unlock} />;
  return <Main onLock={lock} />;
}

function Main({ onLock }) {
  const [state, dispatch, saveError] = useStore();
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);      // { type, tx, preset }
  const [custSheet, setCustSheet] = useState(null); // { customer }
  const [menu, setMenu] = useState(false);
  const [batches, setBatches] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const hiddenAt = useRef(0);

  const ledger = useMemo(() => buildLedger(state.txs, state.customers, state.settings), [state.txs, state.customers, state.settings]);

  // Re-lock after the app has been in the background for a couple of minutes.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AUTOLOCK_MS) onLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [onLock]);

  const goto = t => { setShowSettings(false); setTab(t); if (t !== "clients") setProfileId(null); window.scrollTo(0, 0); };
  const open = (type, tx = null, preset = {}) => { setMenu(false); setBatches(false); setSheet({ type, tx, preset }); };
  const openProfile = id => { setShowSettings(false); setTab("clients"); setProfileId(id); window.scrollTo(0, 0); };

  /** One-time opt-in seed from the user's Notes page. Quantities for sales weren't in the note, so only buys + open debts load. */
  const loadStarter = () => {
    if (!window.confirm("Import from your notes?\n\n• 4 buys (1oz $57, 2oz $120, 1oz $60, 14g $20)\n• Open debts: La India $20, Rafy $20\n• Customers: Paquito, La India, Rafy, Joel, Gaby, Javi\n\nDated today — edit dates in the Log. Sales aren't included (no grams in the note).")) return;
    const d = todayStr(), now = clock();
    const mk = n => ({ id: uid(), name: n, phone: "", notes: "", createdAt: now });
    const cs = ["Paquito", "La India", "Rafy", "Joel", "Gaby", "Javi"].map(mk);
    const id = n => cs.find(c => c.name === n).id;
    const note = "from my notes";
    const buy = (grams, amount, i, extra = "") => ({ id: uid(), type: "buy", date: d, ts: now + i, grams, amount, supplier: "", note: `${note}${extra}` });
    const txs = [
      buy(28, 57, 0, " — 1oz"), buy(56, 120, 1, " — 2oz"), buy(28, 60, 2, " — 1oz"), buy(14, 20, 3),
      { id: uid(), type: "iou", date: d, ts: now + 4, customerId: id("La India"), amount: 20, note: "owed cash — from my notes" },
      { id: uid(), type: "iou", date: d, ts: now + 5, customerId: id("Rafy"), amount: 20, note: "from my notes" },
    ];
    dispatch({ type: "merge", txs, customers: cs });
    setShowSettings(false); setTab("home");
  };

  const sheetProps = { state, ledger, dispatch };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 430, margin: "0 auto", position: "relative", fontFamily: F.body, color: C.text }}>
      <MatrixRain opacity={0.04} />
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, height: 3, background: `linear-gradient(90deg,transparent,${C.gold} 30%,${C.cyan} 50%,${C.gold} 70%,transparent)`, zIndex: 100 }} />
      <div style={{ position: "fixed", top: 12, right: 16, zIndex: 101, display: "flex", gap: 6 }}>
        {[["🔒", onLock, "Lock"], ["⚙️", () => setShowSettings(s => !s), "Settings"]].map(([ic, fn, l]) => (
          <button key={l} aria-label={l} onClick={fn} style={{ background: "rgba(5,5,8,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: C.dim, padding: "6px 10px", cursor: "pointer", fontSize: 15 }}>{ic}</button>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {saveError && !showSettings && <div style={{ position: "relative", marginTop: 50, padding: "8px 16px", background: C.red + "22", color: C.red, fontSize: 11 }}>⚠ Storage full/blocked — changes may not be saved. Export a backup.</div>}
        {showSettings ? (
          <Settings state={state} dispatch={dispatch} onClose={() => setShowSettings(false)} loadStarter={loadStarter} onLock={onLock} saveError={saveError} />
        ) : (
          <>
            {tab === "home" && <Home state={state} ledger={ledger} open={open} goto={goto} openProfile={openProfile} loadStarter={loadStarter} openBatches={() => setBatches(true)} />}
            {tab === "log" && <Log ledger={ledger} open={open} />}
            {tab === "clients" && <Clients ledger={ledger} profileId={profileId} setProfileId={setProfileId} newCustomer={() => setCustSheet({})} editCustomer={c => setCustSheet({ customer: c })} open={open} />}
            {tab === "owed" && <Deben ledger={ledger} settings={state.settings} open={open} openProfile={openProfile} />}
            {tab === "stats" && <Suspense fallback={<div style={{ padding: 80, textAlign: "center", color: C.dim, fontFamily: F.head, fontSize: 10, letterSpacing: 2 }}>LOADING…</div>}><Stats ledger={ledger} /></Suspense>}
          </>
        )}
      </div>

      {/* Quick-add button */}
      {!showSettings && (
        <div style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 99, pointerEvents: "none", display: "flex", justifyContent: "flex-end", padding: "0 16px" }}>
          <button onClick={() => setMenu(true)} aria-label="Add entry" className="tb-fab" style={{ pointerEvents: "auto", width: 56, height: 56, borderRadius: 28, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.orange})`, color: C.bg, fontSize: 30, fontWeight: 700, boxShadow: `0 6px 24px ${C.gold}55` }}>+</button>
        </div>
      )}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(5,5,8,0.97)", borderTop: "1px solid rgba(255,215,0,0.12)", display: "flex", zIndex: 100, backdropFilter: "blur(20px)", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        {TABS.map(t => {
          const on = !showSettings && tab === t.id;
          return (
            <button key={t.id} onClick={() => goto(t.id)} style={{ flex: 1, padding: "10px 4px 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? C.gold : "#3a3a4a", borderTop: on ? `2px solid ${C.gold}` : "2px solid transparent", transition: "color 0.2s" }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={{ fontSize: 8, letterSpacing: "0.08em", fontFamily: F.head, fontWeight: on ? 700 : 400 }}>{t.label.toUpperCase()}</span>
            </button>
          );
        })}
      </nav>

      {batches && <BatchesSheet ledger={ledger} open={open} onClose={() => setBatches(false)} />}
      {menu && (
        <Sheet title="LOG AN ENTRY" onClose={() => setMenu(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["sale", "buy", "payment", "expense", "iou"].map(t => (
              <button key={t} onClick={() => open(t)} style={{ gridColumn: t === "iou" ? "span 2" : undefined, background: TYPES[t].color + "12", border: `1px solid ${TYPES[t].color}44`, borderRadius: 12, padding: "16px 8px", color: TYPES[t].color, cursor: "pointer", fontFamily: F.head, fontSize: 10, letterSpacing: 1.5 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{TYPES[t].icon}</div>{TYPES[t].label}
                <div style={{ fontFamily: F.body, fontSize: 10, color: C.dim, marginTop: 4, letterSpacing: 0 }}>{{ sale: "sold some", buy: "restocked", payment: "someone paid me", expense: "cost of business", iou: "existing debt owed to me" }[t]}</div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet && <TxSheet key={sheet.tx?.id || sheet.type + (sheet.preset?.customerId || "")} {...sheetProps} type={sheet.type} tx={sheet.tx} preset={sheet.preset} onClose={() => setSheet(null)} />}
      {custSheet && (
        <CustomerSheet
          customer={custSheet.customer} dispatch={dispatch}
          hasTx={custSheet.customer ? state.txs.some(t => t.customerId === custSheet.customer.id) : false}
          onDeleted={() => setProfileId(null)}
          onClose={c => { setCustSheet(null); if (c && !custSheet.customer) openProfile(c.id); }}
        />
      )}
    </div>
  );
}
