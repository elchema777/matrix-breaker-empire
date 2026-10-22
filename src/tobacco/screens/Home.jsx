import { useMemo } from "react";
import { money, grams, buildAlerts, todayStr, addDays, fillDays, daysBetween, TYPES } from "../calc";
import { Panel, Label, Stat, Title, TxRow, Spark, Empty } from "../ui";
import { C, F } from "../theme";

export default function Home({ state, ledger, open, goto, openProfile, loadStarter }) {
  const { T, stock, rows, daily, customers } = ledger;
  const { settings } = state;
  const today = todayStr();
  const alerts = useMemo(() => buildAlerts(ledger, settings), [ledger, settings]);
  const todayRow = daily.find(d => d.date === today);
  const series = useMemo(() => fillDays(daily, addDays(today, -13), today), [daily, today]);
  const wk = series.slice(7).reduce((a, d) => a + d.revenue, 0);
  const pwk = series.slice(0, 7).reduce((a, d) => a + d.revenue, 0);
  const wkDelta = pwk > 0 ? ((wk - pwk) / pwk) * 100 : null;
  const recent = rows.slice(-6).reverse();
  const stockPct = Math.min(100, (stock.g / Math.max(settings.lowStockG * 4, stock.g, 1)) * 100);
  const backupAge = settings.lastBackup ? daysBetween(settings.lastBackup.slice(0, 10), today) : null;
  const needBackup = rows.length >= 5 && (backupAge == null || backupAge >= 7);
  const nameOf = id => customers.get(id)?.name;

  if (!rows.length && !state.customers.length) {
    return (
      <div style={{ padding: "52px 16px 120px" }}>
        <Title>MATRIX LEAF</Title>
        <Panel color={C.gold} style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 40 }}>⬡</div>
          <div style={{ fontFamily: F.head, fontSize: 12, color: C.gold, letterSpacing: 2, margin: "10px 0 8px" }}>SYSTEM ONLINE</div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 18 }}>
            Log every buy and every sale. Matrix Leaf tracks stock, profit per gram, who owes you and your best customers.
          </div>
          <button className="btn-primary" style={{ width: "100%", marginBottom: 10 }} onClick={() => open("buy")}>📦 LOG FIRST BUY</button>
          <button className="btn-secondary" style={{ width: "100%" }} onClick={loadStarter}>IMPORT FROM MY NOTES</button>
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <Title>COMMAND CENTER</Title>

      <Panel color={C.green} style={{ marginBottom: 12 }}>
        <Label>NET PROFIT · ALL TIME</Label>
        <div style={{ fontFamily: F.head, fontSize: 30, fontWeight: 900, color: T.netProfit >= 0 ? C.green : C.red, margin: "6px 0 12px" }}>{money(T.netProfit)}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <Stat label="REVENUE" value={money(T.revenue)} color={C.gold} style={{ flex: 1 }} />
          <Stat label="COST OF GOODS" value={money(T.cogs)} color={C.cyan} style={{ flex: 1 }} />
          <Stat label="EXPENSES" value={money(T.expenses)} color={C.red} style={{ flex: 1 }} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Spark data={series.map(d => d.revenue)} color={C.gold} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginTop: 4 }}>
            <span>14-day revenue</span>
            <span>7d: {money(wk)}{wkDelta != null && <span style={{ color: wkDelta >= 0 ? C.green : C.red }}> ({wkDelta >= 0 ? "+" : ""}{Math.round(wkDelta)}% vs prior)</span>}</span>
          </div>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Panel color={C.cyan}>
          <Stat label="STOCK" value={grams(stock.g)} color={C.cyan} sub={`${(stock.g / (settings.gPerOz || 28)).toFixed(1)} oz · worth ${money(stock.cost)}`} />
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 10 }}>
            <div style={{ width: `${stockPct}%`, height: "100%", borderRadius: 2, background: stock.g <= settings.lowStockG ? C.red : C.cyan }} />
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>avg cost {money(stock.avg)}/g</div>
        </Panel>
        <Panel color={C.orange} onClick={() => goto("owed")}>
          <Stat label="OWED TO YOU" value={money(T.receivable)} color={T.receivable > 0 ? C.orange : C.green} sub={T.debtors ? `${T.debtors} ${T.debtors === 1 ? "person" : "people"}` : "all clear"} />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 10 }}>collected {Math.round(T.collection)}% of sales</div>
        </Panel>
        <Panel>
          <Stat label="NET CASH" value={money(T.netCash)} color={T.netCash >= 0 ? C.green : C.red} sub={`in ${money(T.cashIn)} · out ${money(T.cashOut)}`} />
        </Panel>
        <Panel color={C.gold}>
          <Stat label="TODAY" value={money(todayRow?.revenue || 0)} color={C.gold} sub={todayRow ? `${todayRow.sales} sales · ${grams(todayRow.gramsSold)} · ${money(todayRow.revenue - todayRow.cogs, true)}` : "no sales yet"} />
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        {["sale", "buy", "payment", "expense"].map(t => (
          <button key={t} onClick={() => open(t)} style={{ background: TYPES[t].color + "12", border: `1px solid ${TYPES[t].color}40`, borderRadius: 12, padding: "12px 2px", color: TYPES[t].color, cursor: "pointer", fontFamily: F.head, fontSize: 8, letterSpacing: 1 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{TYPES[t].icon}</div>{TYPES[t].label}
          </button>
        ))}
      </div>

      {needBackup && (
        <Panel color={C.purple} style={{ marginBottom: 12 }} onClick={() => goto("settings")}>
          <div style={{ fontSize: 12 }}>💾 <b>Back up your data</b> — {backupAge == null ? "never exported" : `last backup ${backupAge}d ago`}. Tap to export.</div>
        </Panel>
      )}

      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Label style={{ marginBottom: 8 }}>ALERTS</Label>
          {alerts.map(a => (
            <div key={a.id} onClick={() => (a.customerId ? openProfile(a.customerId) : goto("log"))} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", marginBottom: 6, borderRadius: 10, cursor: "pointer", background: C[a.level] + "10", border: `1px solid ${C[a.level]}33`, fontSize: 12 }}>
              <span>{a.icon}</span><span style={{ flex: 1 }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Label>RECENT ACTIVITY</Label>
        <span onClick={() => goto("log")} style={{ fontSize: 10, color: C.gold, cursor: "pointer" }}>see all →</span>
      </div>
      {recent.length ? recent.map(t => <TxRow key={t.id} tx={t} customerName={nameOf(t.customerId)} onClick={() => open(t.type, t)} />) : <Empty>No transactions yet.</Empty>}
    </div>
  );
}
