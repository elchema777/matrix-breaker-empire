import { useState, useEffect } from "react";
import { DIVISIONS, EMPIRE_TARGETS, loadTokens, sendMessage, ls } from "../config";

const S = {
  card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:16, marginBottom:12 },
  label: { fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:4 },
  title: { fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3, marginBottom:20, textAlign:"center" },
};

function getPRTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Puerto_Rico" }));
}

function DivCard({ div, stats, onNavigate }) {
  const col = div.color;
  const isOnline = stats?.online ?? false;
  const bal = stats?.balance ?? null;
  const pnl = stats?.daily_pnl ?? null;
  const wr  = stats?.win_rate  ?? null;
  const sig = stats?.signal    ?? "—";
  const lastUpdate = stats?.last_update ?? null;
  const ageMin = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate + "Z").getTime()) / 60000) : null;
  const isStale = ageMin !== null && ageMin > 5;

  return (
    <div style={{ ...S.card, border:`1px solid ${isOnline && !isStale ? `${col}30` : "rgba(255,255,255,0.06)"}`, background:`rgba(255,255,255,0.03)` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, color:col, letterSpacing:2 }}>{div.label} — {div.name}</div>
          <div style={{ color:"#3a3a4a", fontSize:10, marginTop:2 }}>{div.bot}</div>
          <div style={{ color:"#6B6B80", fontSize:9, marginTop:2 }}>{div.instruments} · {div.strategy}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <div style={{ padding:"3px 10px", borderRadius:20, fontSize:9, fontFamily:"'Orbitron',monospace", fontWeight:700, background: isOnline && !isStale ? `${col}18` : "rgba(255,255,255,0.05)", border:`1px solid ${isOnline && !isStale ? `${col}40` : "rgba(255,255,255,0.08)"}`, color: isOnline && !isStale ? col : "#6B6B80" }}>
            {isStale ? "STALE" : isOnline ? "ONLINE" : "OFFLINE"}
          </div>
          {ageMin !== null && <div style={{ fontSize:8, color:"#3a3a4a" }}>{ageMin}m ago</div>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
        {[
          ["BALANCE", bal !== null ? `$${Number(bal).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}` : "—", "#F0F0F0"],
          ["DAILY P&L", pnl !== null ? `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(0)}` : "—", pnl > 0 ? "#00FF88" : pnl < 0 ? "#FF3B3B" : "#F0F0F0"],
          ["WIN RATE", wr !== null ? `${wr}%` : "—", wr >= 60 ? "#00FF88" : wr >= 45 ? "#FF8C00" : "#FF3B3B"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
            <div style={{ ...S.label, marginBottom:4 }}>{l}</div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:10, color:"#6B6B80" }}>Signal: <span style={{ color:sig.includes("LONG") ? "#00FF88" : sig.includes("SHORT") ? "#FF3B3B" : "#6B6B80", fontWeight:700 }}>{sig}</span></div>
        {div.id === "div3" && !isOnline && (
          <div style={{ fontSize:9, color:"#FF8C00", fontFamily:"'Orbitron',monospace" }}>⚠ Connect data feed</div>
        )}
      </div>
    </div>
  );
}

export default function EmpireOverview({ onNavigate }) {
  const [time, setTime]       = useState(getPRTime());
  const [stats, setStats]     = useState(() => ls.get("empire_stats", {}));
  const [sending, setSending] = useState(false);
  const [toast, setToast]     = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(getPRTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true });
  const dateStr = time.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });

  // Empire-wide aggregates from cached stats
  const allStats = ["div1","div2","div3"].map(k => stats[k]).filter(Boolean);
  const totalBalance = allStats.reduce((s,x) => s + (x.balance || 0), 0);
  const totalPnl     = allStats.reduce((s,x) => s + (x.daily_pnl || 0), 0);
  const activeDivs   = allStats.filter(x => x.online).length;
  const avgWR        = allStats.length ? (allStats.reduce((s,x) => s + (x.win_rate || 0), 0) / allStats.length).toFixed(0) : 0;
  const nexusStat    = stats["nexus"] || {};

  const pct = Math.min(1, totalBalance / EMPIRE_TARGETS.live_trigger);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const sendBrief = async () => {
    setSending(true);
    const tokens = loadTokens();
    await sendMessage(tokens.nexus, tokens.chatId, "/report");
    showToast("Brief sent to NEXUS bot");
    setSending(false);
  };

  const emergencyStop = async () => {
    if (!window.confirm("Send /stop to ALL divisions?")) return;
    const tokens = loadTokens();
    setSending(true);
    await Promise.all([
      sendMessage(tokens.div1, tokens.chatId, "/stop"),
      sendMessage(tokens.div2, tokens.chatId, "/stop"),
      sendMessage(tokens.div3, tokens.chatId, "/stop"),
    ]);
    showToast("[STOP] Sent to Div1, Div2, Div3");
    setSending(false);
  };

  return (
    <div style={{ padding:"24px 16px 90px", position:"relative", zIndex:1 }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:18, fontWeight:900, color:"#FFD700", letterSpacing:4, textShadow:"0 0 30px rgba(255,215,0,0.4)" }}>⬡ MATRIX BREAKER EMPIRE</div>
        <div style={{ color:"#6B6B80", fontSize:11, marginTop:4 }}>{dateStr}</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:22, fontWeight:700, color:"#00D4FF", marginTop:6 }}>{timeStr}</div>
        <div style={{ color:"#3a3a4a", fontSize:9, marginTop:2, letterSpacing:3 }}>PUERTO RICO UTC-4</div>
      </div>

      {/* Empire Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
        {[
          ["TOTAL BALANCE", totalBalance > 0 ? `$${totalBalance.toLocaleString("en-US",{maximumFractionDigits:0})}` : "—", "#FFD700"],
          ["TODAY'S P&L",   totalPnl !== 0 ? `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(0)}` : "—", totalPnl >= 0 ? "#00FF88" : "#FF3B3B"],
          ["ACTIVE DIVS",   `${activeDivs}/3`, "#00D4FF"],
          ["AVG WIN RATE",  `${avgWR}%`, parseInt(avgWR) >= 55 ? "#00FF88" : "#FF8C00"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ ...S.card, textAlign:"center", marginBottom:0, padding:"12px 10px" }}>
            <div style={{ ...S.label }}>{l}</div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:18, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Demo Progress Bar */}
      <div style={{ ...S.card, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ ...S.label }}>DEMO PROGRESS → LIVE TRIGGER</div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:"#FFD700" }}>${totalBalance.toLocaleString()} / $150k</div>
        </div>
        <div style={{ height:8, borderRadius:4, background:"rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:8 }}>
          <div style={{ height:"100%", width:`${pct*100}%`, background:"linear-gradient(90deg,#00D4FF,#FFD700)", borderRadius:4, transition:"width 1s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"#3a3a4a", fontFamily:"'Orbitron',monospace" }}>
          <span>$0</span><span style={{color:"#6B6B80"}}>CP1 $110k</span><span style={{color:"#6B6B80"}}>CP2 $130k</span><span style={{color:"#FFD700"}}>LIVE $150k</span>
        </div>
      </div>

      {/* Division Cards */}
      {["div1","div2","div3"].map(k => (
        <DivCard key={k} div={DIVISIONS[k]} stats={stats[k]} onNavigate={onNavigate} />
      ))}

      {/* NEXUS Status */}
      <div style={{ ...S.card, border:"1px solid rgba(155,89,182,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, color:"#9B59B6", letterSpacing:2 }}>NEXUS COMMAND</div>
            <div style={{ color:"#3a3a4a", fontSize:9, marginTop:2 }}>@MatrixNexus_bot · Shared Services</div>
          </div>
          <div style={{ padding:"3px 10px", borderRadius:20, fontSize:9, fontFamily:"'Orbitron',monospace", background:"rgba(155,89,182,0.12)", border:"1px solid rgba(155,89,182,0.3)", color:"#9B59B6" }}>
            {nexusStat.online ? "ONLINE" : "CHECK"}
          </div>
        </div>
        {nexusStat.last_update && (
          <div style={{ fontSize:9, color:"#3a3a4a", marginTop:6 }}>
            Last check: {nexusStat.last_update}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
        <button className="btn-secondary" onClick={sendBrief} disabled={sending} style={{ padding:"12px 8px", fontSize:9 }}>
          📨 Brief
        </button>
        <button className="btn-secondary" onClick={() => { window.location.reload(); }} style={{ padding:"12px 8px", fontSize:9 }}>
          🔄 Refresh
        </button>
        <button className="btn-danger" onClick={emergencyStop} disabled={sending} style={{ padding:"12px 8px", fontSize:9 }}>
          🛑 STOP ALL
        </button>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:90, left:16, right:16, background:"#0d1a0d", border:"1px solid rgba(0,255,136,0.4)", borderRadius:10, padding:14, textAlign:"center", color:"#00FF88", fontFamily:"'Orbitron',monospace", fontSize:12, zIndex:200 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
