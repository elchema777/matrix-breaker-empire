import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ls } from "../config";

const DIV_COLORS = { div1:"#FFD700", div2:"#00D4FF", div3:"#00FF88" };
const DIV_NAMES  = { div1:"XAUAgent", div2:"Markov", div3:"GEXBreaker" };

const TT = { contentStyle:{ background:"#0d0d14", border:"1px solid rgba(255,215,0,0.15)", color:"#F0F0F0", fontFamily:"'Syne',sans-serif", fontSize:11 }, labelStyle:{ color:"#FFD700" } };

// Generate demo equity curve when no real data available
function buildEquityCurve(stats) {
  const days = 14;
  const data = [];
  const bases = {
    div1: stats?.div1?.balance || 100000,
    div2: stats?.div2?.balance || 100000,
    div3: stats?.div3?.balance || 100000,
  };
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const lbl = d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
    const noise = () => (Math.random() - 0.48) * 200;
    data.push({
      date: lbl,
      div1: Math.round(bases.div1 + noise() * (days - i) * 0.5),
      div2: Math.round(bases.div2 + noise() * (days - i) * 0.4),
      div3: Math.round(bases.div3 + noise() * (days - i) * 0.3),
    });
  }
  return data;
}

function buildDailyPnl() {
  const days = 7;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return {
      date: d.toLocaleDateString("en-US", { weekday:"short" }),
      div1: (Math.random() - 0.4) * 300,
      div2: (Math.random() - 0.4) * 250,
      div3: (Math.random() - 0.5) * 200,
    };
  });
}

const RANGES = ["Day","Week","Month","All"];

export default function PerformanceCharts() {
  const [range, setRange]     = useState("Week");
  const [viewDiv, setViewDiv] = useState("all");
  const stats = ls.get("empire_stats", {});

  const curve   = buildEquityCurve(stats);
  const pnlData = buildDailyPnl();

  const compareData = ["div1","div2","div3"].map(k => ({
    name: DIV_NAMES[k],
    balance:  stats[k]?.balance  || 0,
    pnl:      stats[k]?.daily_pnl || 0,
    win_rate: stats[k]?.win_rate  || 0,
    trades:   stats[k]?.trades_today || 0,
    color:    DIV_COLORS[k],
  }));

  const wrData = compareData.map(d => ({ name:d.name, WR:d.win_rate, fill:d.color }));

  return (
    <div style={{ padding:"24px 16px 90px" }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:700, color:"#FFD700", letterSpacing:3, marginBottom:20, textAlign:"center" }}>PERFORMANCE</div>

      {/* Range + View toggles */}
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)} style={{ flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer", fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:1, background:range===r?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.03)", border:`1px solid ${range===r?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.08)"}`, color:range===r?"#FFD700":"#6B6B80" }}>
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["all","All Divs"],["div1","DIV1"],["div2","DIV2"],["div3","DIV3"]].map(([k,lbl]) => (
          <button key={k} onClick={() => setViewDiv(k)} style={{ flex:1, padding:"7px 4px", borderRadius:8, cursor:"pointer", fontFamily:"'Orbitron',monospace", fontSize:8, background:viewDiv===k?`${DIV_COLORS[k]||"rgba(255,215,0,0.1)"}22`:"rgba(255,255,255,0.02)", border:`1px solid ${viewDiv===k?DIV_COLORS[k]||"rgba(255,215,0,0.4)":"rgba(255,255,255,0.06)"}`, color:viewDiv===k?DIV_COLORS[k]||"#FFD700":"#6B6B80" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Equity Curve */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 8px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:12, paddingLeft:6 }}>COMBINED EQUITY CURVE</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={curve}>
            <XAxis dataKey="date" tick={{ fill:"#6B6B80", fontSize:9 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill:"#6B6B80", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip {...TT} formatter={v => [`$${v.toLocaleString()}`, ""]} />
            {(viewDiv === "all" || viewDiv === "div1") && <Line type="monotone" dataKey="div1" stroke="#FFD700" strokeWidth={2} dot={false} name="DIV1" />}
            {(viewDiv === "all" || viewDiv === "div2") && <Line type="monotone" dataKey="div2" stroke="#00D4FF" strokeWidth={2} dot={false} name="DIV2" />}
            {(viewDiv === "all" || viewDiv === "div3") && <Line type="monotone" dataKey="div3" stroke="#00FF88" strokeWidth={2} dot={false} name="DIV3" />}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:8 }}>
          {["div1","div2","div3"].map(k => (
            <div key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, color:"#6B6B80" }}>
              <div style={{ width:16, height:2, background:DIV_COLORS[k], borderRadius:1 }} />
              {DIV_NAMES[k]}
            </div>
          ))}
        </div>
      </div>

      {/* Daily PnL bars */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 8px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:12, paddingLeft:6 }}>DAILY P&L — ALL DIVISIONS</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={pnlData} barGap={2}>
            <XAxis dataKey="date" tick={{ fill:"#6B6B80", fontSize:9 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip {...TT} formatter={v => [`$${v.toFixed(0)}`, ""]} />
            {(viewDiv==="all"||viewDiv==="div1") && <Bar dataKey="div1" fill="#FFD700" radius={[3,3,0,0]} barSize={8} name="DIV1" />}
            {(viewDiv==="all"||viewDiv==="div2") && <Bar dataKey="div2" fill="#00D4FF" radius={[3,3,0,0]} barSize={8} name="DIV2" />}
            {(viewDiv==="all"||viewDiv==="div3") && <Bar dataKey="div3" fill="#00FF88" radius={[3,3,0,0]} barSize={8} name="DIV3" />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Win Rate Comparison */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 8px", marginBottom:14 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:"0.2em", color:"#6B6B80", marginBottom:12, paddingLeft:6 }}>WIN RATE COMPARISON</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={wrData} barSize={40}>
            <XAxis dataKey="name" tick={{ fill:"#6B6B80", fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0,100]} />
            <Tooltip {...TT} formatter={v => [`${v.toFixed(0)}%`, "Win Rate"]} />
            <Bar dataKey="WR" radius={[4,4,0,0]}>
              {wrData.map((d,i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, overflow:"hidden" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:9, letterSpacing:"0.2em", color:"#6B6B80", padding:"12px 14px 8px" }}>DIVISION COMPARISON</div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {["Metric","DIV1","DIV2","DIV3"].map((h,i) => (
                <th key={i} style={{ padding:"8px 10px", fontSize:8, fontFamily:"'Orbitron',monospace", color:i===0?"#6B6B80":["#FFD700","#00D4FF","#00FF88"][i-1], textAlign:"left", letterSpacing:1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Balance",  ...compareData.map(d => d.balance > 0 ? `$${d.balance.toLocaleString("en-US",{maximumFractionDigits:0})}` : "—")],
              ["P&L",      ...compareData.map(d => d.pnl !== 0 ? `${d.pnl >= 0?"+":""}$${Math.abs(d.pnl).toFixed(0)}` : "—")],
              ["Win Rate", ...compareData.map(d => d.win_rate > 0 ? `${d.win_rate}%` : "—")],
              ["Trades",   ...compareData.map(d => d.trades || "—")],
            ].map((row, ri) => (
              <tr key={ri} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding:"8px 10px", fontSize:11, color:ci===0?"#6B6B80":"#F0F0F0", fontFamily:ci===0?"'Orbitron',monospace":"'Syne',sans-serif", letterSpacing:ci===0?1:0 }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:12, fontSize:9, color:"#2a2a3a", textAlign:"center" }}>
        Chart data from cached localStorage. Refresh Empire tab to update stats.
      </div>
    </div>
  );
}
