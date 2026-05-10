import { useState } from "react";
import { loadTokens, sendMessage } from "../config";

const KNOWN_ISSUES = [
  { div:"DIV 3 GEXBreaker",   issue:"Data feed not connected",     severity:"warn",  fix:"Connect MT5 real-time feed to Division 3 agent" },
  { div:"ENCODER",            issue:"Phantom PnL stale cache",      severity:"info",  fix:"load_division_status() added — shows STALE label after 5min" },
  { div:"ALL DIVISIONS",      issue:"MT5 IPC error on cold start",  severity:"warn",  fix:"start_empire.bat now launches MT5 terminal first (35s wait)" },
];

const SEVERITY = { warn:"#FF8C00", info:"#00D4FF", error:"#FF3B3B" };

function HealthCard({ title, color, children }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${color}25`, borderRadius:12, padding:16, marginBottom:12 }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color, letterSpacing:2, marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}

function StatusRow({ label, value, valueColor="#F0F0F0" }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:11, color:"#6B6B80" }}>{label}</span>
      <span style={{ fontSize:11, color:valueColor, fontWeight:600 }}>{value}</span>
    </div>
  );
}

export default function SystemHealth() {
  const [log, setLog]         = useState([]);
  const [sending, setSending] = useState(false);
  const [lastHealth, setLastHealth] = useState(null);

  const tokens = loadTokens();

  const addLog = (msg, color="#F0F0F0") => {
    setLog(prev => [{ id:Date.now(), msg, color, ts:new Date().toLocaleTimeString() }, ...prev].slice(0, 30));
  };

  const sendAll = async (cmd, label) => {
    setSending(true);
    addLog(`Sending ${cmd} to all divisions...`, "#FFD700");
    const bots = [
      { label:"Div1",    token:tokens.div1    },
      { label:"Div2",    token:tokens.div2    },
      { label:"Div3",    token:tokens.div3    },
      { label:"NEXUS",   token:tokens.nexus   },
      { label:"Encoder", token:tokens.encoder },
    ];
    await Promise.allSettled(bots.map(async b => {
      try {
        const res = await sendMessage(b.token, tokens.chatId, cmd);
        addLog(`${b.label}: ${res.ok ? "✓ sent" : "✗ " + (res.description||"failed")}`, res.ok ? "#00FF88" : "#FF3B3B");
      } catch (e) {
        addLog(`${b.label}: error — ${e.message}`, "#FF3B3B");
      }
    }));
    setSending(false);
  };

  const healthCheck = async () => {
    setSending(true);
    addLog("Sending /health to NEXUS...", "#9B59B6");
    try {
      const res = await sendMessage(tokens.nexus, tokens.chatId, "/health");
      addLog(res.ok ? "NEXUS health request sent — check Telegram" : "Failed: " + (res.description||"unknown"), res.ok ? "#00FF88" : "#FF3B3B");
      setLastHealth(new Date());
    } catch (e) {
      addLog("Error: " + e.message, "#FF3B3B");
    }
    setSending(false);
  };

  const stopAll = async () => {
    if (!window.confirm("Send /stop to ALL divisions? (Div1, Div2, Div3)")) return;
    await sendAll("/stop", "STOP ALL");
  };

  const resumeAll = async () => {
    await sendAll("/resume", "RESUME ALL");
  };

  const fullReport = async () => {
    setSending(true);
    addLog("Sending /report to all bots...", "#FFD700");
    await Promise.allSettled([
      sendMessage(tokens.nexus,   tokens.chatId, "/report"),
      sendMessage(tokens.encoder, tokens.chatId, "/all"),
    ]);
    addLog("Report requests sent — check Telegram app", "#00D4FF");
    setSending(false);
  };

  return (
    <div style={{ padding:"24px 16px 90px" }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3, marginBottom:20, textAlign:"center" }}>SYSTEM HEALTH</div>

      {/* Division health cards */}
      <HealthCard title="DIV 1 — XAUAGENT" color="#FFD700">
        <StatusRow label="Strategy" value="ICT + DXY Bias / EXP10" />
        <StatusRow label="Instruments" value="XAUUSD · NDAQ · DAX" />
        <StatusRow label="MT5 Account" value="105090703" />
        <StatusRow label="Crash Threshold" value="10/day (raised from 3)" valueColor="#00FF88" />
        <StatusRow label="Backoff" value="30s → 60s → 120s" valueColor="#00FF88" />
      </HealthCard>

      <HealthCard title="DIV 2 — MARKOVBREAKER" color="#00D4FF">
        <StatusRow label="Strategy" value="8-State Markov Chain" />
        <StatusRow label="MT5 Account" value="#106034160 ($100k demo)" />
        <StatusRow label="Min Probability" value="0.65 (Markov threshold)" />
        <StatusRow label="H1 EMA50" value="Real H1 data (fixed)" valueColor="#00FF88" />
        <StatusRow label="Session" value="London 07-08 / NY 13:30-16" />
      </HealthCard>

      <HealthCard title="DIV 3 — GEXBREAKER" color="#00FF88">
        <StatusRow label="Strategy" value="GEX + Breakout + TPO (4-pillar)" />
        <StatusRow label="Instruments" value="XAUUSD M15/M1" />
        <StatusRow label="Data Feed" value="Not connected" valueColor="#FF8C00" />
        <StatusRow label="Sessions" value="London 07-10 / NY 13:30-16" />
        <div style={{ marginTop:8, padding:"8px 10px", borderRadius:8, background:"rgba(255,140,0,0.08)", border:"1px solid rgba(255,140,0,0.2)", fontSize:11, color:"#FF8C00" }}>
          ⚠ Fix needed: Connect MT5 real-time data feed to Div3 agent
        </div>
      </HealthCard>

      <HealthCard title="NEXUS COMMAND CENTER" color="#9B59B6">
        <StatusRow label="Services" value="whale_watcher · polymarket · news" />
        <StatusRow label="Dashboard" value="localhost:9000" />
        <StatusRow label="ngrok" value="C:\\NEXUS\\ngrok.exe (installed)" valueColor="#00FF88" />
        {lastHealth && <StatusRow label="Last Health Check" value={lastHealth.toLocaleTimeString()} valueColor="#9B59B6" />}
      </HealthCard>

      {/* Known Issues */}
      <div style={{ background:"rgba(255,59,59,0.04)", border:"1px solid rgba(255,59,59,0.15)", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:"#FF3B3B", letterSpacing:2, marginBottom:12 }}>KNOWN ISSUES</div>
        {KNOWN_ISSUES.map((issue, i) => (
          <div key={i} style={{ marginBottom:i < KNOWN_ISSUES.length-1 ? 10 : 0, paddingBottom:i < KNOWN_ISSUES.length-1 ? 10 : 0, borderBottom:i < KNOWN_ISSUES.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, color:SEVERITY[issue.severity], fontWeight:700 }}>{issue.div}</div>
              <div style={{ fontSize:8, padding:"2px 7px", borderRadius:10, background:`${SEVERITY[issue.severity]}20`, border:`1px solid ${SEVERITY[issue.severity]}40`, color:SEVERITY[issue.severity], fontFamily:"'Orbitron',monospace" }}>{issue.severity.toUpperCase()}</div>
            </div>
            <div style={{ fontSize:12, color:"#B0B0C0", marginBottom:4 }}>{issue.issue}</div>
            <div style={{ fontSize:10, color:"#6B6B80", fontStyle:"italic" }}>→ {issue.fix}</div>
          </div>
        ))}
      </div>

      {/* Emergency Controls */}
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:10 }}>EMERGENCY CONTROLS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        <button className="btn-danger" onClick={stopAll} disabled={sending} style={{ opacity:sending?0.5:1 }}>🛑 STOP ALL</button>
        <button className="btn-secondary" onClick={resumeAll} disabled={sending} style={{ opacity:sending?0.5:1 }}>▶ RESUME ALL</button>
        <button className="btn-secondary" onClick={fullReport} disabled={sending} style={{ opacity:sending?0.5:1, fontSize:9 }}>📊 FULL REPORT</button>
        <button className="btn-secondary" onClick={healthCheck} disabled={sending} style={{ opacity:sending?0.5:1, fontSize:9 }}>💓 HEALTH CHECK</button>
      </div>

      {/* Action log */}
      {log.length > 0 && (
        <div style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:12, maxHeight:180, overflowY:"auto" }}>
          {log.map(e => (
            <div key={e.id} style={{ display:"flex", gap:8, marginBottom:6, borderBottom:"1px solid rgba(255,255,255,0.04)", paddingBottom:6 }}>
              <span style={{ fontSize:11, color:e.color, flex:1 }}>{e.msg}</span>
              <span style={{ fontSize:9, color:"#3a3a4a", flexShrink:0 }}>{e.ts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
