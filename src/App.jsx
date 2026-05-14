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

export default function App() {
  const [tab, setTab]             = useState("empire");
  const [empireStats, setEmpireStats] = useState(() => ls.get("empire_stats", {}));

  const syncEmpireData = useCallback(async () => {
    try {
      const settings = ls.get("empire_settings", {});
      const url = settings.nexus_url;
      if (!url) return;
      const r = await fetch(url.replace(/\/$/, "") + "/nexus_status.json?t=" + Date.now());
      if (!r.ok) return;
      const data = await r.json();
      const divMap = { 1: "div1", 2: "div2", 3: "div3" };
      const stats = {};
      (data.divisions || []).forEach(div => {
        const key = divMap[div.id];
        if (key) stats[key] = {
          online:      div.online,
          balance:     div.balance,
          daily_pnl:   div.daily_pnl,
          win_rate:    div.win_rate,
          signal:      div.signal || "FLAT",
          last_update: div.last_update,
        };
      });
      stats.nexus = { online: (data.online_divisions || 0) > 0, last_update: data.last_update };
      // Also store balance_history per division for charts
      (data.divisions || []).forEach(div => {
        const key = { 1:"div1", 2:"div2", 3:"div3" }[div.id];
        if (key && stats[key]) stats[key].balance_history = div.balance_history || [];
      });
      ls.set("empire_stats", stats);
      setEmpireStats(stats);
      // Store recent trades
      if (data.recent_trades) {
        ls.set("empire_trades", data.recent_trades);
      }
    } catch (e) { /* silent — offline */ }
  }, []);

  useEffect(() => {
    syncEmpireData();
    const t = setInterval(syncEmpireData, 30000);
    return () => clearInterval(t);
  }, [syncEmpireData]);
  const [showSettings, setShowSettings] = useState(false);

  const nav = t => { setTab(t); window.scrollTo(0,0); };

  return (
    <div style={{ minHeight:"100vh", background:"#050508", maxWidth:430, margin:"0 auto", position:"relative", paddingBottom:72, fontFamily:"'Syne',sans-serif", color:"#F0F0F0" }}>
      <MatrixRain opacity={0.04} />

      {/* Top accent bar */}
      <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, height:3, background:"linear-gradient(90deg,transparent,#FFD700 30%,#00D4FF 50%,#FFD700 70%,transparent)", zIndex:100 }} />

      {/* Settings button — fixed top right */}
      {!showSettings && (
        <button onClick={() => setShowSettings(true)} style={{ position:"fixed", top:12, right:16, zIndex:101, background:"rgba(5,5,8,0.9)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#6B6B80", padding:"6px 10px", cursor:"pointer", fontSize:16 }}>⚙️</button>
      )}

      <div style={{ position:"relative", zIndex:1 }}>
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <>
            {tab === "empire"   && <EmpireOverview onNavigate={nav} />}
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
