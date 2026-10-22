import { money } from "../calc";
import { Panel, Label, Title, Empty, Badge } from "../ui";
import { C, F } from "../theme";

/** DEBEN — who owes you, oldest-debt aging, one-tap collect. */
export default function Deben({ ledger, settings, open, openProfile }) {
  const all = [...ledger.customers.values()];
  const owing = all.filter(c => c.owed > 0.005).sort((a, b) => b.owed - a.owed);
  const credit = all.filter(c => c.owed < -0.005);
  const over = settings.overdueDays || 14;
  const overdueTotal = owing.filter(c => c.debtAge >= over).reduce((a, c) => a + c.owed, 0);

  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <Title right={<button className="btn-secondary" style={{ padding: "7px 12px" }} onClick={() => open("iou")}>+ IOU</button>}>DEBEN</Title>

      <Panel color={C.orange} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}><Label>TOTAL OWED</Label><div style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: owing.length ? C.orange : C.green, marginTop: 6 }}>{money(ledger.T.receivable)}</div></div>
          <div style={{ flex: 1 }}><Label>OVERDUE ({over}d+)</Label><div style={{ fontFamily: F.head, fontSize: 26, fontWeight: 900, color: overdueTotal > 0 ? C.red : C.dim, marginTop: 6 }}>{money(overdueTotal)}</div></div>
        </div>
      </Panel>

      {!owing.length && <Empty icon="✅">Nobody owes you anything.<br />Sell on credit by setting “Paid now” lower than the price.</Empty>}
      {owing.map(c => {
        const col = c.debtAge >= over ? C.red : c.debtAge >= 7 ? C.gold : C.green;
        return (
          <Panel key={c.id} color={col} style={{ marginBottom: 10 }}>
            <div onClick={() => openProfile(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>oldest debt {c.debtAge === 0 ? "today" : `${c.debtAge}d ago`}</div>
              </div>
              {c.debtAge >= over && <Badge color={C.red}>OVERDUE</Badge>}
              <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 800, color: C.orange }}>{money(c.owed)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-primary" style={{ flex: 1, padding: "10px 8px", fontSize: 9 }} onClick={() => open("payment", null, { customerId: c.id, amount: c.owed })}>✅ COLLECT {money(c.owed)}</button>
              <button className="btn-secondary" style={{ padding: "10px 12px", fontSize: 9 }} onClick={() => open("payment", null, { customerId: c.id })}>PARTIAL</button>
              {c.phone && <a className="btn-secondary" href={`tel:${c.phone}`} style={{ padding: "10px 12px", fontSize: 12, textDecoration: "none" }}>📞</a>}
            </div>
          </Panel>
        );
      })}

      {credit.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Label style={{ marginBottom: 8 }}>PREPAID / CREDIT (you owe them)</Label>
          {credit.map(c => <div key={c.id} onClick={() => openProfile(c.id)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13, cursor: "pointer" }}><span>{c.name}</span><span style={{ color: C.cyan }}>{money(-c.owed)}</span></div>)}
        </div>
      )}
    </div>
  );
}
