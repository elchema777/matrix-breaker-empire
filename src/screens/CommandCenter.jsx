import { useState, useRef } from "react";
import { DIVISIONS, loadTokens, sendMessage } from "../config";

const BOT_COMMANDS = {
  div1:    ["/status","/balance","/trades","/pause","/resume","/stop"],
  div2:    ["/status","/balance","/trades","/pause","/resume","/stop"],
  div3:    ["/status","/balance","/gex_report","/pause","/resume","/stop"],
  nexus:   ["/status","/health","/report","/resume","/emergency_stop"],
  encoder: ["/status","/summary","/div1","/div2","/div3","/all"],
};

const CMD_COLORS = {
  "/stop": "#FF3B3B", "/emergency_stop": "#FF3B3B", "/pause": "#FF8C00",
  "/resume": "#00FF88", "/status": "#00D4FF", "/health": "#00D4FF",
};

export default function CommandCenter() {
  const [selected, setSelected] = useState("div1");
  const [custom, setCustom]     = useState("");
  const [log, setLog]           = useState([]);
  const [sending, setSending]   = useState(false);
  const logRef = useRef(null);
  const logId  = useRef(0);

  const tokens = loadTokens();
  const tokenMap = { div1:tokens.div1, div2:tokens.div2, div3:tokens.div3, nexus:tokens.nexus, encoder:tokens.encoder };
  const div = DIVISIONS[selected];

  const addLog = (dir, text, color="#F0F0F0") => {
    const entry = { id: ++logId.current, dir, text, color, ts:new Date().toLocaleTimeString() };
    setLog(prev => [entry, ...prev].slice(0, 80));
  };

  const send = async cmd => {
    if (sending) return;
    const token = tokenMap[selected];
    if (!token) { addLog("ERR","No token configured for this bot — set it in Settings","#FF3B3B"); return; }
    if (!tokens.chatId) { addLog("ERR","No chat ID configured — set it in Settings","#FF3B3B"); return; }
    setSending(true);
    addLog("→", `[${div.label}] ${cmd}`, div.color);
    try {
      const res = await sendMessage(token, tokens.chatId, cmd);
      if (res.ok) {
        addLog("✓", "Sent successfully", "#00FF88");
      } else {
        addLog("✗", `Failed: ${res.description || "Unknown error"}`, "#FF3B3B");
      }
    } catch (e) {
      addLog("✗", `Network error: ${e.message}`, "#FF3B3B");
    }
    setSending(false);
  };

  const sendCustom = () => {
    if (!custom.trim()) return;
    send(custom.trim());
    setCustom("");
  };

  return (
    <div style={{ padding:"24px 16px 90px" }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3, marginBottom:20, textAlign:"center" }}>BOT COMMAND CENTER</div>

      {/* Bot selector */}
      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
        {Object.keys(DIVISIONS).map(k => {
          const d = DIVISIONS[k];
          const active = selected === k;
          return (
            <button key={k} onClick={() => setSelected(k)} style={{
              padding:"8px 12px", borderRadius:8, cursor:"pointer",
              fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:1, fontWeight:700,
              background: active ? `${d.color}20` : "rgba(255,255,255,0.03)",
              border:`1px solid ${active ? `${d.color}60` : "rgba(255,255,255,0.08)"}`,
              color: active ? d.color : "#6B6B80",
              flexShrink:0, whiteSpace:"nowrap",
            }}>{d.label}</button>
          );
        })}
      </div>

      {/* Active bot info */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${div.color}25`, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:11, fontWeight:700, color:div.color, marginBottom:2 }}>{div.name}</div>
        <div style={{ fontSize:10, color:"#6B6B80" }}>{div.bot} · {div.strategy}</div>
      </div>

      {/* Command buttons */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
        {(BOT_COMMANDS[selected] || []).map(cmd => (
          <button key={cmd} onClick={() => send(cmd)} disabled={sending}
            style={{
              padding:"10px 16px", borderRadius:8, cursor:sending ? "not-allowed" : "pointer",
              fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:1, fontWeight:700,
              background: CMD_COLORS[cmd] ? `${CMD_COLORS[cmd]}15` : "rgba(255,255,255,0.04)",
              border:`1px solid ${CMD_COLORS[cmd] ? `${CMD_COLORS[cmd]}40` : "rgba(255,255,255,0.1)"}`,
              color: CMD_COLORS[cmd] || "#B0B0C0",
              opacity: sending ? 0.5 : 1,
              transition:"all 0.15s",
            }}>
            {cmd}
          </button>
        ))}
      </div>

      {/* Custom command */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendCustom()}
          placeholder="/custom_command or any text..."
          style={{
            flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, color:"#F0F0F0", padding:"12px 14px", fontSize:13,
            fontFamily:"'Syne',sans-serif", outline:"none",
          }}
        />
        <button className="btn-primary" onClick={sendCustom} disabled={sending || !custom.trim()}
          style={{ padding:"12px 16px", fontSize:10, opacity:custom.trim() && !sending ? 1 : 0.4 }}>
          SEND
        </button>
      </div>

      {/* Response log */}
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:8 }}>
        COMMAND LOG {sending && "· SENDING..."}
      </div>
      <div ref={logRef} style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:10, padding:12, maxHeight:280, overflowY:"auto" }}>
        {log.length === 0 ? (
          <div style={{ color:"#3a3a4a", fontSize:12, textAlign:"center", padding:20 }}>
            Select a bot and send a command — log appears here.<br/>
            <span style={{ fontSize:10, color:"#2a2a3a" }}>Responses arrive in your Telegram app.</span>
          </div>
        ) : log.map(e => (
          <div key={e.id} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8, borderBottom:"1px solid rgba(255,255,255,0.04)", paddingBottom:8 }}>
            <span style={{ fontSize:11, color:e.color, flexShrink:0, width:16 }}>{e.dir}</span>
            <span style={{ fontSize:12, color:e.color, flex:1, fontFamily:"'Syne',sans-serif", lineHeight:1.5 }}>{e.text}</span>
            <span style={{ fontSize:9, color:"#3a3a4a", flexShrink:0 }}>{e.ts}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop:12, fontSize:10, color:"#2a2a3a", textAlign:"center", lineHeight:1.8 }}>
        Commands are sent via Telegram Bot API.<br/>
        {tokens.chatId ? "Bot responses arrive in your Telegram app." : "Set your chat ID in Settings to receive responses."}
      </div>
    </div>
  );
}
