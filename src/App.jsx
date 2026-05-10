import { useState } from "react";
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
