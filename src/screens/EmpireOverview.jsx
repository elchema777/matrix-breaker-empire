import { useState, useEffect } from "react";
import { DIVISIONS, EMPIRE_TARGETS, loadTokens, sendMessage, ls } from "../config";

function getPRTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Puerto_Rico" }));
}

const f$ = v => v != null ? "$" + Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—";
const fpnl = v => { if (v == null) return "—"; const n = Number(v); return (n >= 0 ? "+" : "") + f$(Math.abs(n)); };
const clr = v => Number(v) >= 0 ? "#00ff9d" : "#ff3b5c";

// ── Mini equity chart (SVG) ────────────────────────────────────────
function MiniChart({ data, color = "#d4a017", height = 50 }) {
  if (!data || data.length < 2) return null;
  const w = 280, h = height;
  const lo = Math.min(...data), hi = Math.max(...data);
  const range = hi - lo || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - lo) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts} ${w},${h}`}
        fill={`url(#g${color.replace("#","")})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx={data.length > 0 ? (((data.length-1)/(data.length-1))*w) : w} cy={h - ((data[data.length-1]-lo)/range)*(h-4)-2} r="3" fill={color}/>
    </svg>
  );
}

// ── Trade row ─────────────────────────────────────────────────────
function TradeRow({ t }) {
  const isBuy = (t.dir||"").toUpperCase().includes("BUY") || (t.dir||"").toUpperCase() === "LONG";
  const pnlColor = t.profit >= 0 ? "#00ff9d" : "#ff3b5c";
  return (
    <div style={{ display:"grid", gridTemplateColumns:"38px 1fr auto", gap:8, padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", alignItems:"center" }}>
      <div style={{ padding:"2px 0", borderRadius:4, textAlign:"center", fontSize:8, fontWeight:"bold", letterSpacing:1, background: isBuy ? "rgba(0,255,157,0.1)" : "rgba(255,59,92,0.1)", color: isBuy ? "#00ff9d" : "#ff3b5c", border:`1px solid ${isBuy?"rgba(0,255,157,0.3)":"rgba(255,59,92,0.3)"}` }}>
        {isBuy ? "BUY" : "SELL"}
      </div>
      <div style={{ fontSize:9, lineHeight:1.6, color:"#7a9ab8" }}>
        <span style={{ color:"#b8cce0", fontWeight:"bold" }}>{t.symbol||"XAUUSD"}</span> {t.lots}L
        <br/>{(t.time||"").slice(5,16)}
      </div>
      <div style={{ fontSize:10, fontWeight:"bold", color:pnlColor, textAlign:"right" }}>
        {t.profit >= 0 ? "+" : ""}${Math.abs(Number(t.profit)).toFixed(2)}
      </div>
    </div>
  );
}

// ── Division card ─────────────────────────────────────────────────
const DIV_COLORS = { div1:"#d4a017", div2:"#00d4ff", div3:"#8888ff" };

function DivCard({ divKey, stats, trades }) {
  const div = DIVISIONS[divKey];
  const col = DIV_COLORS[divKey] || "#d4a017";
  const on = stats?.online ?? false;
  const divTrades = (trades||[]).filter(t => t.div === parseInt(divKey.replace("div",""))).slice(0,5);

  return (
    <div style={{
      background:"rgba(255,255,255,0.025)",
      border:`1px solid ${on ? col+"33" : "rgba(255,255,255,0.07)"}`,
      borderRadius:12, marginBottom:12, overflow:"hidden",
      boxShadow: on ? `0 0 20px ${col}11` : "none",
    }}>
      {/* Top color accent */}
      <div style={{ height:2, background:on ? `linear-gradient(90deg,transparent,${col},transparent)` : "transparent" }}/>

      <div style={{ padding:"12px 14px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:col, letterSpacing:2 }}>{div?.label} — {div?.name}</div>
            <div style={{ fontSize:8, color:"#3a5a7a", marginTop:2, letterSpacing:1 }}>{div?.strategy}</div>
          </div>
          <div style={{ padding:"3px 10px", borderRadius:20, fontSize:8, fontWeight:700, fontFamily:"'Orbitron',monospace", background: on ? `${col}18` : "rgba(255,255,255,0.05)", border:`1px solid ${on ? col+"44" : "rgba(255,255,255,0.08)"}`, color: on ? col : "#3a5a7a" }}>
            {on ? "● LIVE" : "○ OFFLINE"}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
          {[
            ["BALANCE", f$(stats?.balance), col],
            ["DAILY P&L", fpnl(stats?.daily_pnl), clr(stats?.daily_pnl)],
            ["WIN RATE", stats?.win_rate != null ? stats.win_rate.toFixed(1)+"%" : "—", "#00d4ff"],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:7, color:"#3a5a7a", letterSpacing:1.5, marginBottom:3, fontFamily:"'Orbitron',monospace" }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:700, color:c, fontFamily:"'Orbitron',monospace" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        {stats?.balance_history && stats.balance_history.length > 1 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:7, color:"#3a5a7a", letterSpacing:1.5, marginBottom:4, fontFamily:"'Orbitron',monospace" }}>EQUITY CURVE</div>
            <MiniChart data={stats.balance_history} color={col} height={44}/>
          </div>
        )}

        {/* Last trades */}
        {divTrades.length > 0 && (
          <div>
            <div style={{ fontSize:7, color:"#3a5a7a", letterSpacing:1.5, marginBottom:4, fontFamily:"'Orbitron',monospace" }}>LAST {divTrades.length} TRADES</div>
            {divTrades.map((t,i) => <TradeRow key={i} t={t}/>)}
          </div>
        )}
        {on && divTrades.length === 0 && (
          <div style={{ fontSize:9, color:"#3a5a7a", padding:"6px 0" }}>No trades recorded yet this session</div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function EmpireOverview() {
  const [time, setTime]   = useState(getPRTime());
  const [stats, setStats] = useState(() => ls.get("empire_stats", {}));
  const [trades, setTrades] = useState(() => ls.get("empire_trades", []));
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(getPRTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // Re-render when localStorage changes (updated by App.jsx fetcher)
  useEffect(() => {
    const poll = setInterval(() => {
      setStats(ls.get("empire_stats", {}));
      setTrades(ls.get("empire_trades", []));
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const allStats = ["div1","div2","div3"].map(k => stats[k]).filter(Boolean);
  const totalBalance = allStats.reduce((s,x) => s + (x.balance||0), 0);
  const totalPnl     = allStats.reduce((s,x) => s + (x.daily_pnl||0), 0);
  const activeDivs   = allStats.filter(x => x.online).length;
  const avgWR        = allStats.length ? (allStats.reduce((s,x) => s + (x.win_rate||0), 0) / allStats.length).toFixed(1) : "—";
  const pct = Math.min(1, totalBalance / EMPIRE_TARGETS.live_trigger);
  const timeStr = time.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true });
  const dateStr = time.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const sendBrief = async () => {
    const tokens = loadTokens();
    if (!tokens.nexus) { showToast("⚠ NEXUS token not configured — set it in Settings"); return; }
    setSending(true);
    try {
      const res = await sendMessage(tokens.nexus, tokens.chatId, "/empire");
      showToast(res.ok ? "Brief requested from @MatrixNexus_bot" : `⚠ Failed: ${res.description || "unknown error"}`);
    } catch (e) {
      showToast(`⚠ Network error: ${e.message}`);
    }
    setSending(false);
  };

  return (
    <div style={{ padding:"16px 14px 90px", position:"relative", zIndex:1 }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:18 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:16, fontWeight:900, letterSpacing:4, background:"linear-gradient(90deg,#d4a017,#f0c040,#00d4ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          ⬡ MATRIX BREAKER
        </div>
        <div style={{ color:"#3a5a7a", fontSize:9, letterSpacing:3, marginTop:2 }}>EMPIRE COMMAND · {dateStr.toUpperCase()}</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:20, fontWeight:700, color:"#00d4ff", marginTop:6, textShadow:"0 0 20px rgba(0,212,255,0.4)" }}>{timeStr}</div>
      </div>

      {/* Empire totals */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,160,23,0.2)", borderRadius:12, padding:14, marginBottom:14, boxShadow:"0 0 30px rgba(212,160,23,0.06)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            ["TOTAL BALANCE", f$(totalBalance||null), "#d4a017"],
            ["TODAY'S P&L",   fpnl(totalPnl||null),  clr(totalPnl)],
            ["ACTIVE DIVS",   `${activeDivs}/3`,      "#00d4ff"],
            ["AVG WIN RATE",  avgWR !== "—" ? avgWR+"%" : "—", Number(avgWR)>=55?"#00ff9d":"#ffaa00"],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:"rgba(0,0,0,0.25)", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:7, color:"#3a5a7a", letterSpacing:1.5, marginBottom:4 }}>{l}</div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:17, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:4, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:7, color:"#3a5a7a", letterSpacing:1 }}>DEMO → LIVE $150k</span>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:7, color:"#d4a017" }}>{(pct*100).toFixed(1)}%</span>
        </div>
        <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct*100}%`, background:"linear-gradient(90deg,#d4a017,#00d4ff)", borderRadius:3, transition:"width 1s", boxShadow:"0 0 8px rgba(212,160,23,0.6)" }}/>
        </div>
      </div>

      {/* Division cards */}
      <DivCard divKey="div1" stats={stats["div1"]} trades={trades}/>
      <DivCard divKey="div2" stats={stats["div2"]} trades={trades}/>
      <DivCard divKey="div3" stats={stats["div3"]} trades={trades}/>

      {/* Quick actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:4 }}>
        <button onClick={sendBrief} disabled={sending} style={{ padding:"13px", fontFamily:"'Orbitron',monospace", fontSize:9, fontWeight:700, letterSpacing:1, borderRadius:10, border:"1px solid rgba(212,160,23,0.3)", background:"rgba(212,160,23,0.06)", color:"#d4a017", cursor:"pointer" }}>
          📡 REQUEST BRIEF
        </button>
        <button onClick={() => window.location.reload()} style={{ padding:"13px", fontFamily:"'Orbitron',monospace", fontSize:9, fontWeight:700, letterSpacing:1, borderRadius:10, border:"1px solid rgba(0,212,255,0.3)", background:"rgba(0,212,255,0.06)", color:"#00d4ff", cursor:"pointer" }}>
          ↺ REFRESH
        </button>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:90, left:14, right:14, background:"#060f1a", border:"1px solid rgba(0,255,157,0.3)", borderRadius:10, padding:14, textAlign:"center", color:"#00ff9d", fontFamily:"'Orbitron',monospace", fontSize:11, zIndex:200, boxShadow:"0 0 20px rgba(0,255,157,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
