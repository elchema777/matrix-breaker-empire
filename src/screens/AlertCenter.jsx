import { useState, useEffect, useCallback } from "react";
import { DIVISIONS, loadTokens, getUpdates, ls } from "../config";

const FILTER_TABS = ["All","Div1","Div2","Div3","NEXUS","Alerts"];
const DIV_MAP = { div1:"Div1", div2:"Div2", div3:"Div3", nexus:"NEXUS", encoder:"Encoder" };

function classifyMsg(text = "") {
  const t = text.toUpperCase();
  if (t.includes("PAUSED") || t.includes("STOP"))         return { label:"PAUSED",  color:"#FF3B3B" };
  if (t.includes("ERROR") || t.includes("FAIL") || t.includes("CRASH")) return { label:"ERROR",   color:"#FF3B3B" };
  if (t.includes("WARN") || t.includes("OFFLINE"))        return { label:"WARN",    color:"#FF8C00" };
  if (t.includes("OPENED") || t.includes("CLOSED") || t.includes("TRADE") || t.includes("ORDER")) return { label:"TRADE", color:"#00FF88" };
  if (t.includes("STATUS") || t.includes("BALANCE") || t.includes("REPORT")) return { label:"STATUS", color:"#00D4FF" };
  if (t.includes("HEALTH") || t.includes("ONLINE"))       return { label:"HEALTH",  color:"#9B59B6" };
  return { label:"INFO", color:"#6B6B80" };
}

export default function AlertCenter() {
  const [filter, setFilter]         = useState("All");
  const [alerts, setAlerts]         = useState(() => ls.get("empire_alerts", []));
  const [loading, setLoading]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const tokens = loadTokens();
    const sources = [
      { key:"div1",    token:tokens.div1,    label:DIV_MAP.div1    },
      { key:"div2",    token:tokens.div2,    label:DIV_MAP.div2    },
      { key:"div3",    token:tokens.div3,    label:DIV_MAP.div3    },
      { key:"nexus",   token:tokens.nexus,   label:DIV_MAP.nexus   },
      { key:"encoder", token:tokens.encoder, label:DIV_MAP.encoder },
    ];

    const newAlerts = [];
    await Promise.allSettled(sources.map(async src => {
      try {
        const data = await getUpdates(src.token, 10);
        if (data.ok && data.result) {
          for (const u of data.result) {
            const msg = u.message || u.channel_post || {};
            const text = msg.text || msg.caption || "";
            if (!text) continue;
            const cls = classifyMsg(text);
            newAlerts.push({
              id:        u.update_id,
              source:    src.label,
              sourceKey: src.key,
              text,
              color:     cls.color,
              label:     cls.label,
              ts:        (msg.date || Date.now()/1000) * 1000,
              isAlert:   ["ERROR","PAUSED","WARN"].includes(cls.label),
            });
          }
        }
      } catch {}
    }));

    // Sort by timestamp desc, deduplicate
    const merged = [...newAlerts, ...alerts]
      .sort((a,b) => b.ts - a.ts)
      .filter((x,i,arr) => arr.findIndex(y => y.id === x.id) === i)
      .slice(0, 50);

    setAlerts(merged);
    ls.set("empire_alerts", merged);
    setLastRefresh(new Date());
    setLoading(false);
  }, [alerts]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, refresh]);

  const filtered = filter === "All"    ? alerts
    : filter === "Alerts" ? alerts.filter(a => a.isAlert)
    : alerts.filter(a => a.source === filter);

  const sourceColor = key => DIVISIONS[key]?.color || "#6B6B80";

  return (
    <div style={{ padding:"24px 16px 90px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3 }}>ALERT CENTER</div>
        <button onClick={() => setAutoRefresh(a => !a)}
          style={{ padding:"6px 12px", borderRadius:8, fontSize:9, fontFamily:"'Orbitron',monospace", background:autoRefresh?"rgba(0,255,136,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${autoRefresh?"rgba(0,255,136,0.4)":"rgba(255,255,255,0.08)"}`, color:autoRefresh?"#00FF88":"#6B6B80", cursor:"pointer" }}>
          AUTO {autoRefresh?"ON":"OFF"}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:5, marginBottom:14, overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
        {FILTER_TABS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:"7px 12px", borderRadius:8, cursor:"pointer", fontFamily:"'Orbitron',monospace", fontSize:8, letterSpacing:1, background:filter===f?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.03)", border:`1px solid ${filter===f?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.07)"}`, color:filter===f?"#FFD700":"#6B6B80", flexShrink:0 }}>
            {f.toUpperCase()}
            {f === "Alerts" && alerts.filter(a=>a.isAlert).length > 0 && (
              <span style={{ marginLeft:4, background:"#FF3B3B", color:"#fff", fontSize:7, padding:"1px 4px", borderRadius:10 }}>{alerts.filter(a=>a.isAlert).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Refresh button */}
      <button className="btn-secondary" onClick={refresh} disabled={loading}
        style={{ width:"100%", marginBottom:12, opacity:loading ? 0.5 : 1 }}>
        {loading ? "FETCHING..." : `🔄 REFRESH FROM BOTS ${lastRefresh ? `· ${lastRefresh.toLocaleTimeString()}` : ""}`}
      </button>

      {/* Alert feed */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px", color:"#6B6B80" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📡</div>
          <div style={{ fontSize:13, marginBottom:8 }}>No messages in feed.</div>
          <div style={{ fontSize:11, color:"#3a3a4a", lineHeight:1.8 }}>
            Tap REFRESH to poll bot updates.<br/>
            Updates show commands received by each bot.
          </div>
        </div>
      ) : filtered.map(alert => (
        <div key={alert.id} style={{
          background:"rgba(255,255,255,0.03)", border:`1px solid ${alert.color}22`, borderLeft:`3px solid ${alert.color}`,
          borderRadius:"0 10px 10px 0", padding:"10px 12px", marginBottom:8,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:8, fontFamily:"'Orbitron',monospace", fontWeight:700, padding:"2px 7px", borderRadius:10, background:`${alert.color}18`, border:`1px solid ${alert.color}40`, color:alert.color }}>
                {alert.label}
              </span>
              <span style={{ fontSize:9, fontFamily:"'Orbitron',monospace", color:sourceColor(alert.sourceKey), fontWeight:600 }}>
                {alert.source}
              </span>
            </div>
            <span style={{ fontSize:9, color:"#3a3a4a" }}>
              {new Date(alert.ts).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
          <div style={{ fontSize:12, color:"#B0B0C0", lineHeight:1.6 }}>{alert.text.slice(0, 200)}{alert.text.length > 200 ? "…" : ""}</div>
        </div>
      ))}

      <div style={{ marginTop:12, fontSize:9, color:"#2a2a3a", textAlign:"center", lineHeight:1.8 }}>
        Auto-refresh polls all 5 bots every 30 seconds.<br/>
        Shows messages received by each bot via getUpdates API.
      </div>
    </div>
  );
}
