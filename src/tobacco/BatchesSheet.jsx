import { money, grams, niceDate, safeDiv, pct } from "./calc";
import { Sheet, Label, Badge, Empty } from "./ui";
import { C, F } from "./theme";

/** Every buy as its own batch: what you paid, what's left, what it has earned so far. */
export default function BatchesSheet({ ledger, open, onClose }) {
  const lots = [...ledger.lots].reverse();
  const live = lots.filter(l => l.remaining > 0.001);
  return (
    <Sheet title="BATCHES" color={C.cyan} onClose={onClose}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 14, lineHeight: 1.5 }}>
        Each buy keeps its own price. Sales use the oldest batch first unless you pick one. {live.length} active · {grams(ledger.stock.g)} left worth {money(ledger.stock.cost)}.
      </div>
      {!lots.length && <Empty icon="📦">No buys yet.</Empty>}
      {lots.map(l => {
        const out = l.remaining <= 0.001;
        const profit = l.revenue - l.cogs;
        const payback = Math.min(100, safeDiv(l.revenue, l.cost) * 100);
        const col = out ? C.dim : C.cyan;
        return (
          <div key={l.id} onClick={() => open("buy", ledger.rows.find(r => r.id === l.id))} style={{ border: `1px solid ${col}33`, background: col + "0a", borderRadius: 12, padding: 12, marginBottom: 10, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{niceDate(l.date)}{l.supplier ? ` · ${l.supplier}` : ""}</div>
              <Badge color={out ? C.dim : C.green}>{out ? "SOLD OUT" : "ACTIVE"}</Badge>
            </div>
            <div style={{ fontFamily: F.head, fontSize: 15, fontWeight: 700, color: C.cyan, margin: "8px 0 2px" }}>{grams(l.grams)} for {money(l.cost)}</div>
            <div style={{ fontSize: 10, color: C.dim }}>{money(l.ppg)}/g</div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, margin: "10px 0 6px" }}>
              <div style={{ width: `${(l.remaining / l.grams) * 100}%`, height: "100%", borderRadius: 2, background: col }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim }}>
              <span>{grams(l.remaining)} left · {grams(l.soldG)} sold</span>
              <span>revenue {money(l.revenue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Label color={payback >= 100 ? C.green : C.gold}>{payback >= 100 ? "PAID BACK ✔" : `${Math.round(payback)}% PAID BACK`}</Label>
              <span style={{ fontFamily: F.head, fontSize: 11, fontWeight: 700, color: profit >= 0 ? C.green : C.red }}>{money(profit, true)} · {pct(safeDiv(profit, l.cost) * 100)} ROI</span>
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
