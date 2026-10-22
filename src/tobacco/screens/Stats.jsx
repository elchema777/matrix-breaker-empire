import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, fillDays, money, grams, pct, safeDiv, todayStr, weekdayOf } from "../calc";
import { Panel, Label, Stat, Title, Chip, Empty } from "../ui";
import { C, F } from "../theme";

const RANGES = [["7D", 7], ["30D", 30], ["90D", 90], ["ALL", 0]];
const TT = { contentStyle: { background: "#0d0d14", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, fontFamily: "'Syne',sans-serif", fontSize: 11, color: "#F0F0F0" }, labelStyle: { color: "#FFD700" }, cursor: { fill: "rgba(255,255,255,0.04)" } };
const AX = { stroke: "#3a3a4a", tick: { fill: "#6B6B80", fontSize: 9 }, tickLine: false, axisLine: false };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const usd = v => (v == null ? "—" : money(v));

function Chart({ title, sub, children, h = 190 }) {
  return (
    <Panel style={{ marginBottom: 12, padding: "14px 8px 10px" }}>
      <div style={{ padding: "0 8px 10px" }}><Label color={C.gold}>{title}</Label>{sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{sub}</div>}</div>
      <div style={{ width: "100%", height: h }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </Panel>
  );
}

export default function Stats({ ledger }) {
  const [range, setRange] = useState(30);
  const today = todayStr();
  const first = ledger.rows[0]?.date;

  const from = useMemo(() => {
    const start = range === 0 ? first : addDays(today, -(range - 1));
    return !first ? today : start < first ? first : start;
  }, [range, first, today]);

  const days = useMemo(() => fillDays(ledger.daily, from, today), [ledger, from, today]);
  const rows = useMemo(() => ledger.rows.filter(t => t.date >= from), [ledger, from]);
  const sales = rows.filter(t => t.type === "sale");
  const buys = rows.filter(t => t.type === "buy");

  const k = useMemo(() => {
    const revenue = sales.reduce((a, t) => a + t.price, 0);
    const cogs = sales.reduce((a, t) => a + t.cogs, 0);
    const g = sales.reduce((a, t) => a + t.grams, 0);
    const exp = rows.filter(t => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const buyCost = buys.reduce((a, t) => a + t.amount, 0), buyG = buys.reduce((a, t) => a + t.grams, 0);
    const net = revenue - cogs - exp;
    return { revenue, cogs, g, exp, net, margin: safeDiv(revenue - cogs, revenue) * 100, avgTicket: safeDiv(revenue, sales.length), sellPpg: safeDiv(revenue, g), buyPpg: safeDiv(buyCost, buyG), buyCost, roi: safeDiv(net, buyCost) * 100 };
  }, [sales, buys, rows]);

  const cum = useMemo(() => days.reduce((a, d) => [...a, { ...d, cum: (a.length ? a[a.length - 1].cum : 0) + d.net }], []), [days]);

  const weekday = useMemo(() => {
    const a = WD.map(d => ({ d, revenue: 0, profit: 0, n: 0 }));
    sales.forEach(t => { const w = a[weekdayOf(t.date)]; w.revenue += t.price; w.profit += t.profit; w.n++; });
    return a.map(x => ({ ...x, revenue: Math.round(x.revenue * 100) / 100, profit: Math.round(x.profit * 100) / 100 }));
  }, [sales]);

  const top = useMemo(() => {
    const m = new Map();
    sales.forEach(t => {
      const id = t.customerId || "walkin";
      const name = id === "walkin" ? "Walk-in" : ledger.customers.get(id)?.name || "Unknown";
      const x = m.get(id) || { name, revenue: 0, profit: 0 };
      x.revenue += t.price; x.profit += t.profit; m.set(id, x);
    });
    return [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map(x => ({ ...x, revenue: Math.round(x.revenue * 100) / 100, profit: Math.round(x.profit * 100) / 100 }));
  }, [sales, ledger]);

  const tickets = useMemo(() => {
    const b = [["≤$10", 10], ["$11–20", 20], ["$21–40", 40], ["$41–80", 80], ["$80+", Infinity]].map(([l, max]) => ({ l, max, n: 0 }));
    sales.forEach(t => { b.find(x => t.price <= x.max).n++; });
    return b;
  }, [sales]);

  const xInt = Math.max(0, Math.ceil(days.length / 7) - 1);
  const hasData = ledger.rows.length > 0;

  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <Title>ANALYTICS</Title>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {RANGES.map(([l, v]) => <Chip key={l} active={range === v} onClick={() => setRange(v)}>{l}</Chip>)}
      </div>
      {!hasData && <Empty icon="📊">Charts appear once you log your first buy and sale.</Empty>}
      {hasData && (
        <>
          <Panel color={C.green} style={{ marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <Stat label="REVENUE" value={money(k.revenue)} color={C.gold} />
              <Stat label="NET PROFIT" value={money(k.net)} color={k.net >= 0 ? C.green : C.red} />
              <Stat label="MARGIN" value={pct(k.margin)} />
              <Stat label="SALES" value={sales.length} sub={grams(k.g)} />
              <Stat label="AVG TICKET" value={money(k.avgTicket)} />
              <Stat label="ROI ON BUYS" value={pct(k.roi)} color={k.roi >= 0 ? C.green : C.red} />
              <Stat label="SELL $/G" value={money(k.sellPpg)} color={C.gold} />
              <Stat label="BUY $/G" value={money(k.buyPpg)} color={C.cyan} />
              <Stat label="SPREAD /G" value={money(k.sellPpg - k.buyPpg, true)} color={k.sellPpg >= k.buyPpg ? C.green : C.red} />
            </div>
          </Panel>

          <Chart title="CUMULATIVE NET PROFIT" sub="revenue − cost of goods − expenses">
            <AreaChart data={cum} margin={{ left: -12, right: 8, top: 4 }}>
              <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.4} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" interval={xInt} {...AX} /><YAxis {...AX} tickFormatter={v => `$${v}`} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Area type="monotone" dataKey="cum" name="Net profit" stroke={C.green} strokeWidth={2} fill="url(#gp)" />
            </AreaChart>
          </Chart>

          <Chart title="DAILY REVENUE vs PROFIT">
            <BarChart data={days} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" interval={xInt} {...AX} /><YAxis {...AX} tickFormatter={v => `$${v}`} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="revenue" name="Revenue" fill={C.gold} radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Gross profit" fill={C.green} radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>

          <Chart title="PRICE PER GRAM — SELL vs BUY" sub="your spread is your edge; watch it narrow">
            <LineChart data={days} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" interval={xInt} {...AX} /><YAxis {...AX} tickFormatter={v => `$${v}`} domain={["auto", "auto"]} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="sellPpg" name="Sell $/g" stroke={C.gold} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="buyPpg" name="Buy $/g" stroke={C.cyan} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </Chart>

          <Chart title="STOCK ON HAND (g)">
            <AreaChart data={days} margin={{ left: -12, right: 8, top: 4 }}>
              <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} /><stop offset="100%" stopColor={C.cyan} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" interval={xInt} {...AX} /><YAxis {...AX} />
              <Tooltip {...TT} formatter={v => `${Math.round(v * 10) / 10}g`} />
              <Area type="stepAfter" dataKey="stockG" name="Stock" stroke={C.cyan} strokeWidth={2} fill="url(#gs)" />
            </AreaChart>
          </Chart>

          <Chart title="BEST DAYS OF THE WEEK" sub="revenue by weekday — plan restocks and visits around it">
            <BarChart data={weekday} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="d" {...AX} /><YAxis {...AX} tickFormatter={v => `$${v}`} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Bar dataKey="revenue" name="Revenue" fill={C.gold} radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill={C.green} radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>

          <Chart title="TOP CUSTOMERS" h={Math.max(120, top.length * 34 + 30)}>
            <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" {...AX} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" width={70} {...AX} tick={{ fill: "#c8c8d8", fontSize: 10 }} />
              <Tooltip {...TT} formatter={v => usd(v)} />
              <Bar dataKey="revenue" name="Revenue" fill={C.gold} radius={[0, 3, 3, 0]} />
              <Bar dataKey="profit" name="Profit" fill={C.green} radius={[0, 3, 3, 0]} />
            </BarChart>
          </Chart>

          <Chart title="TICKET SIZE" sub="how many sales land in each price band">
            <BarChart data={tickets} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="l" {...AX} /><YAxis {...AX} allowDecimals={false} />
              <Tooltip {...TT} />
              <Bar dataKey="n" name="Sales" fill={C.purple} radius={[3, 3, 0, 0]} />
            </BarChart>
          </Chart>
        </>
      )}
      <div style={{ fontFamily: F.body, fontSize: 10, color: C.dim, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
        Profit uses weighted-average cost of your buys. More gram-accurate logging = more accurate profit.
      </div>
    </div>
  );
}
