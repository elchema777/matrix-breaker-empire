import { useMemo, useState } from "react";
import { niceDate, money, TYPES } from "../calc";
import { Chip, Title, TxRow, Empty } from "../ui";
import { C, F, inp } from "../theme";

const FILTERS = [["all", "ALL"], ["sale", "SALES"], ["buy", "BUYS"], ["payment", "PAID"], ["iou", "IOU"], ["expense", "COSTS"]];

export default function Log({ ledger, open }) {
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const nameOf = id => ledger.customers.get(id)?.name || "";

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = ledger.rows.filter(t => (f === "all" || t.type === f) &&
      (!ql || [nameOf(t.customerId), t.supplier, t.note, TYPES[t.type]?.label].some(x => (x || "").toLowerCase().includes(ql))));
    const m = new Map();
    for (const t of [...list].reverse()) { if (!m.has(t.date)) m.set(t.date, []); m.get(t.date).push(t); }
    return [...m.entries()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, f, q]);

  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <Title>TRANSACTION LOG</Title>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, note, supplier…" style={{ ...inp, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
        {FILTERS.map(([k, l]) => <Chip key={k} active={f === k} onClick={() => setF(k)}>{l}</Chip>)}
      </div>
      {!groups.length && <Empty icon="📒">Nothing here yet.<br />Tap the + button to log a sale or buy.</Empty>}
      {groups.map(([date, list]) => {
        const sales = list.filter(t => t.type === "sale");
        const dayProfit = sales.reduce((a, t) => a + t.profit, 0);
        return (
          <div key={date} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0 2px", borderBottom: `1px solid ${C.gold}22` }}>
              <span style={{ fontFamily: F.head, fontSize: 9, letterSpacing: 2, color: C.gold }}>{niceDate(date).toUpperCase()}</span>
              {sales.length > 0 && <span style={{ fontSize: 10, color: C.dim }}>{sales.length} sale{sales.length > 1 ? "s" : ""} · {money(sales.reduce((a, t) => a + t.price, 0))} · <span style={{ color: dayProfit >= 0 ? C.green : C.red }}>{money(dayProfit, true)}</span></span>}
            </div>
            {list.map(t => <TxRow key={t.id} tx={t} customerName={nameOf(t.customerId)} onClick={() => open(t.type, t)} />)}
          </div>
        );
      })}
    </div>
  );
}
