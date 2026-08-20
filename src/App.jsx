import { useState, useEffect, useCallback } from "react";
import { ls } from "./config";
import MatrixRain from "./components/MatrixRain";
import BottomNav  from "./components/BottomNav";
import EmpireOverview   from "./screens/EmpireOverview";
import CommandCenter    from "./screens/CommandCenter";
import PerformanceCharts from "./screens/PerformanceCharts";
import AlertCenter      from "./screens/AlertCenter";
import SystemHealth     from "./screens/SystemHealth";
import Settings         from "./screens/Settings";

const POLL_INTERVAL_MS = 30000;
const FETCH_TIMEOUT_MS = 10000;
const STALE_AFTER_MS   = POLL_INTERVAL_MS * 3;

export default function App() {
  const [tab, setTab]         = useState("empire");
  const [syncStatus, setSyncStatus] = useState(() => ls.get("empire_sync", {}));
  const [now, setNow]         = useState(() => Date.now());

  const syncEmpireData = useCallback(async () => {
    const settings = ls.get("empire_settings", {});
    const url = settings.nexus_url;
    if (!url) {
      const status = { lastAttempt: Date.now(), lastSuccess: null, lastError: "No NEXUS URL configured" };
      ls.set("empire_sync", status);
      setSyncStatus(status);
      return;
    }

    const prev = ls.get("empire_sync", {});
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const r = await fetch(url.replace(/\/$/, "") + "/nexus_status.json?t=" + Date.now(), { signal: controller.signal });
      if (!r.ok) {
        const status = { ...prev, lastAttempt: Date.now(), lastError: `NEXUS returned HTTP ${r.status}` };
        ls.set("empire_sync", status);
        setSyncStatus(status);
        return;
      }

      let data;
      try {
        data = await r.json();
      } catch {
        const status = { ...prev, lastAttempt: Date.now(), lastError: "NEXUS returned invalid JSON" };
        ls.set("empire_sync", status);
        setSyncStatus(status);
        return;
      }

      const divMap = { 1: "div1", 2: "div2", 3: "div3" };
      const stats = {};
      (data.divisions || []).forEach(div => {
        const key = divMap[div.id];
        if (key) stats[key] = {
          online:          div.online,
          balance:         div.balance,
          daily_pnl:       div.daily_pnl,
          win_rate:        div.win_rate,
          signal:          div.signal || "FLAT",
          last_update:     div.last_update,
          balance_history: div.balance_history || [],
        };
      });
      stats.nexus = { online: (data.online_divisions || 0) > 0, last_update: data.last_update };
      ls.set("empire_stats", stats);
      if (data.recent_trades) ls.set("empire_trades", data.recent_trades);

      const status = { lastAttempt: Date.now(), lastSuccess: Date.now(), lastError: null };
      ls.set("empire_sync", status);
      setSyncStatus(status);
    } catch (e) {
      const reason = e.name === "AbortError" ? "NEXUS request timed out" : "Network error reaching NEXUS";
      const status = { ...prev, lastAttempt: Date.now(), lastError: reason };
      ls.set("empire_sync", status);
      setSyncStatus(status);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented fetch-on-mount pattern; setState only runs after the awaited response resolves, not synchronously during the effect
    syncEmpireData();
    const t = setInterval(syncEmpireData, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [syncEmpireData]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const [showSettings, setShowSettings] = useState(false);

  const nav = t => { setTab(t); window.scrollTo(0,0); };

  const isStale = !syncStatus.lastSuccess || (now - syncStatus.lastSuccess) > STALE_AFTER_MS;
  const showSyncWarning = !showSettings && syncStatus.lastAttempt && (syncStatus.lastError || isStale);

  return (
    <div style={{ minHeight:"100vh", background:"#050508", maxWidth:430, margin:"0 auto", position:"relative", paddingBottom:72, fontFamily:"'Syne',sans-serif", color:"#F0F0F0" }}>
      <MatrixRain opacity={0.04} />

      {/* Top accent bar */}
      <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, height:3, background:"linear-gradient(90deg,transparent,#FFD700 30%,#00D4FF 50%,#FFD700 70%,transparent)", zIndex:100 }} />

      {/* Settings button — fixed top right */}
      {!showSettings && (
        <button onClick={() => setShowSettings(true)} style={{ position:"fixed", top:12, right:16, zIndex:101, background:"rgba(5,5,8,0.9)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#6B6B80", padding:"6px 10px", cursor:"pointer", fontSize:16 }}>⚙️</button>
      )}

      {/* NEXUS sync warning — visible on every screen when data is stale or fetch failed */}
      {showSyncWarning && (
        <div style={{ position:"fixed", top:3, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, zIndex:99, background: syncStatus.lastError ? "rgba(255,59,59,0.14)" : "rgba(255,140,0,0.14)", borderBottom:`1px solid ${syncStatus.lastError ? "rgba(255,59,59,0.35)" : "rgba(255,140,0,0.35)"}`, color: syncStatus.lastError ? "#FF6B6B" : "#FFB020", fontSize:9, fontFamily:"'Orbitron',monospace", letterSpacing:0.5, textAlign:"center", padding:"6px 30px 5px 10px" }}>
          ⚠ {syncStatus.lastError || "STALE DATA — no successful NEXUS sync recently"}
        </div>
      )}

      <div style={{ position:"relative", zIndex:1 }}>
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <>
            {tab === "empire"   && <EmpireOverview />}
            {tab === "commands" && <CommandCenter />}
            {tab === "charts"   && <PerformanceCharts />}
            {tab === "alerts"   && <AlertCenter />}
            {tab === "health"   && <SystemHealth />}
          </>
        )}
      </div>

      {!showSettings && <BottomNav active={tab} onNavigate={nav} />}
    </div>
  );
}
