import { useState } from "react";
import { DEFAULT_TOKENS, loadTokens, saveTokens, EMPIRE_TARGETS, ls } from "../config";

const INP = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#F0F0F0", padding:"10px 12px", fontSize:12, fontFamily:"'Syne',sans-serif", outline:"none", marginTop:4 };
const L   = { fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:"0.15em", color:"#6B6B80" };

export default function Settings({ onClose }) {
  const [tokens, setTokens] = useState(loadTokens);
  const [saved, setSaved]   = useState(false);
  const [settings, setSettings] = useState(() => ls.get("empire_settings", {
    div1_account: "105090703",
    div2_account: "106034160",
    div3_account: "5049913114",
    chat_id:      "8241521898",
    nexus_url:    "",
  }));

  const save = () => {
    saveTokens(tokens);
    ls.set("empire_settings", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    if (!window.confirm("Reset all tokens to defaults?")) return;
    setTokens({ ...DEFAULT_TOKENS });
  };

  const BOT_FIELDS = [
    { key:"div1",    label:"DIV 1 — XAUAgent",       color:"#FFD700" },
    { key:"div2",    label:"DIV 2 — MarkovBreaker",   color:"#00D4FF" },
    { key:"div3",    label:"DIV 3 — GEXBreaker",      color:"#00FF88" },
    { key:"nexus",   label:"NEXUS",                   color:"#9B59B6" },
    { key:"encoder", label:"ENCODER / Jarvis",         color:"#FF8C00" },
    { key:"chatId",  label:"JONATHAN CHAT ID",         color:"#F0F0F0" },
  ];

  return (
    <div style={{ padding:"24px 16px 90px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3 }}>SETTINGS</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6B6B80", cursor:"pointer", fontSize:20 }}>✕</button>
      </div>

      {/* Bot Tokens */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:2, marginBottom:14 }}>BOT TOKENS</div>
        {BOT_FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <div style={{ ...L, color:f.color }}>{f.label}</div>
            <input value={tokens[f.key] || ""} onChange={e => setTokens(t => ({...t,[f.key]:e.target.value}))}
              style={INP} placeholder={f.key === "chatId" ? "Chat ID..." : "Bot token..."} />
          </div>
        ))}
      </div>

      {/* Account Numbers */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:"#00D4FF", letterSpacing:2, marginBottom:14 }}>MT5 ACCOUNTS</div>
        {[
          { key:"div1_account", label:"DIV 1 Account #",  color:"#FFD700" },
          { key:"div2_account", label:"DIV 2 Account #",  color:"#00D4FF" },
          { key:"div3_account", label:"DIV 3 Account #",  color:"#00FF88" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <div style={{ ...L, color:f.color }}>{f.label}</div>
            <input value={settings[f.key] || ""} onChange={e => setSettings(s => ({...s,[f.key]:e.target.value}))}
              type="number" style={INP} placeholder="Account number..." />
          </div>
        ))}
      </div>

      {/* Empire Targets */}
      <div style={{ background:"rgba(255,215,0,0.04)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:"#FFD700", letterSpacing:2, marginBottom:12 }}>EMPIRE TARGETS</div>
        {[
          ["DEMO GOAL (Live Trigger)", `$${EMPIRE_TARGETS.live_trigger.toLocaleString()}`],
          ["CHECKPOINT 1",            `$${EMPIRE_TARGETS.cp1.toLocaleString()}`],
          ["CHECKPOINT 2",            `$${EMPIRE_TARGETS.cp2.toLocaleString()}`],
        ].map(([l, v]) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:11, color:"#6B6B80" }}>{l}</span>
            <span style={{ fontSize:11, color:"#FFD700", fontWeight:700 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop:10, fontSize:10, color:"#3a3a4a" }}>Targets are fixed per the Matrix Breaker sacred rules.</div>
      </div>

      {/* NEXUS Live Data URL */}
      <div style={{ background:"rgba(0,212,255,0.04)", border:"1px solid rgba(0,212,255,0.15)", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:700, color:"#00D4FF", letterSpacing:2, marginBottom:10 }}>LIVE DATA SOURCE</div>
        <div style={{ marginBottom:8 }}>
          <div style={{ ...L, color:"#00D4FF" }}>NEXUS URL (ngrok — sent to Telegram on startup)</div>
          <input value={settings.nexus_url || ""} onChange={e => setSettings(s => ({...s, nexus_url: e.target.value}))}
            style={INP} placeholder="https://xxxx.ngrok.io" />
        </div>
        <div style={{ fontSize:9, color:"#3a3a4a", lineHeight:1.7 }}>
          Paste the ngrok URL from Telegram when empire starts.<br/>
          App polls every 30s — balance, P&amp;L, win rate update live.
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button className="btn-primary" onClick={save} style={{ flex:2 }}>
          {saved ? "✓ SAVED" : "SAVE SETTINGS"}
        </button>
        <button className="btn-secondary" onClick={reset} style={{ flex:1, fontSize:9 }}>RESET</button>
      </div>

      <div style={{ marginTop:16, fontSize:9, color:"#3a3a4a", textAlign:"center", lineHeight:1.8 }}>
        All data stored in localStorage only.<br />Never leaves your device. GitHub Pages compatible.
      </div>
    </div>
  );
}
