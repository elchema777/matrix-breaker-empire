import { useMemo, useState } from "react";
import { money, grams, pct, niceDate, shortDate, safeDiv } from "../calc";
import { Panel, Label, Stat, Title, Chip, Badge, TxRow, Empty, Spark } from "../ui";
import { C, F, TIER, inp } from "../theme";

const SORTS = [["revenue", "REVENUE"], ["owed", "OWES"], ["recent", "RECENT"], ["name", "A–Z"]];

function Avatar({ name, color, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: color + "1a", border: `1px solid ${color}55`, color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontWeight: 800, fontSize: size * 0.42, flexShrink: 0 }}>
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Profile({ c, ledger, back, edit, open }) {
  const tier = TIER[c.tier] || TIER.NEW;
  const history = ledger.rows.filter(t => t.customerId === c.id).reverse();
  const share = safeDiv(c.revenue, ledger.T.revenue) * 100;
  const spend = c.sales.map(s => s.price);
  const wa = c.phone ? `https://wa.me/${c.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "1$1")}` : null;
  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <button onClick={back} className="btn-secondary" style={{ padding: "7px 12px", marginBottom: 16 }}>← CLIENTS</button>
      <Panel color={tier.color} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={c.name} color={tier.color} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{c.name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <Badge color={tier.color}>{tier.label}</Badge>
              {c.owed > 0.005 && <Badge color={C.orange}>OWES {money(c.owed)}</Badge>}
            </div>
          </div>
          <button onClick={edit} className="btn-secondary" style={{ padding: "8px 12px" }}>EDIT</button>
        </div>
        {(c.phone || c.notes) && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            {c.phone && <div>📞 <a href={`tel:${c.phone}`} style={{ color: C.cyan }}>{c.phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noreferrer" style={{ color: C.green }}>WhatsApp</a></>}</div>}
            {c.notes && <div style={{ marginTop: 4, color: "#b8b8c8" }}>{c.notes}</div>}
          </div>
        )}
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
        <Panel style={{ padding: 10 }}><Stat label="SPENT" value={money(c.revenue)} color={C.gold} /></Panel>
        <Panel style={{ padding: 10 }}><Stat label="PROFIT" value={money(c.profit)} color={c.profit >= 0 ? C.green : C.red} /></Panel>
        <Panel style={{ padding: 10 }}><Stat label="GRAMS" value={grams(c.grams)} color={C.cyan} /></Panel>
        <Panel style={{ padding: 10 }}><Stat label="VISITS" value={c.visits} /></Panel>
        <Panel style={{ padding: 10 }}><Stat label="AVG TICKET" value={money(c.avgTicket)} /></Panel>
        <Panel style={{ padding: 10 }}><Stat label="PAYS /G" value={money(c.ppg)} /></Panel>
      </div>

      <Panel style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 10 }}>BEHAVIOR</Label>
        <div style={{ fontSize: 12, lineHeight: 1.9, color: "#c8c8d8" }}>
          <div>Share of your revenue: <b style={{ color: C.gold }}>{pct(share)}</b></div>
          <div>Usual order: <b>{c.favG != null ? grams(c.favG) : "—"}</b></div>
          <div>Buys every: <b>{c.avgGap != null ? `${Math.round(c.avgGap)} days` : "not enough data"}</b></div>
          <div>Last purchase: <b>{c.lastDate ? (c.daysSince === 0 ? "Today" : `${niceDate(c.lastDate)} (${c.daysSince}d ago)`) : "never"}</b></div>
          <div>Paid back so far: <b style={{ color: C.green }}>{money(c.payments)}</b></div>
        </div>
        {spend.length > 1 && <div style={{ marginTop: 10 }}><Spark data={spend} color={tier.color} /><div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>ticket size per purchase · {shortDate(c.sales[0].date)} → {shortDate(c.sales[c.sales.length - 1].date)}</div></div>}
      </Panel>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => open("sale", null, { customerId: c.id })}>💰 NEW SALE</button>
        {c.owed > 0.005 && <button className="btn-secondary" style={{ flex: 1, color: C.green }} onClick={() => open("payment", null, { customerId: c.id, amount: c.owed })}>✅ COLLECT</button>}
      </div>

      <Label style={{ marginBottom: 4 }}>HISTORY</Label>
      {history.length ? history.map(t => <TxRow key={t.id} tx={t} title={niceDate(t.date)} onClick={() => open(t.type, t)} />) : <Empty>No activity yet.</Empty>}
    </div>
  );
}

export default function Clients({ ledger, profileId, setProfileId, newCustomer, editCustomer, open }) {
  const [sort, setSort] = useState("revenue");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const l = [...ledger.customers.values()].filter(c => !c.orphan && (!ql || c.name.toLowerCase().includes(ql)));
    const by = { revenue: (a, b) => b.revenue - a.revenue, owed: (a, b) => b.owed - a.owed, recent: (a, b) => (a.daysSince ?? 1e9) - (b.daysSince ?? 1e9), name: (a, b) => a.name.localeCompare(b.name) };
    return l.sort(by[sort]);
  }, [ledger, sort, q]);

  const prof = profileId && ledger.customers.get(profileId);
  if (prof) return <Profile c={prof} ledger={ledger} back={() => setProfileId(null)} edit={() => editCustomer(prof)} open={open} />;

  return (
    <div style={{ padding: "52px 16px 130px" }}>
      <Title right={<button className="btn-secondary" style={{ padding: "7px 12px" }} onClick={newCustomer}>+ NEW</button>}>CLIENTS</Title>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search customers…" style={{ ...inp, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
        {SORTS.map(([k, l]) => <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>)}
      </div>
      {!list.length && <Empty icon="👥">No customers yet.<br />Add one here or while logging a sale.</Empty>}
      {list.map(c => {
        const tier = TIER[c.tier] || TIER.NEW;
        return (
          <Panel key={c.id} onClick={() => setProfileId(c.id)} style={{ marginBottom: 8, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={c.name} color={tier.color} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                <Badge color={tier.color}>{tier.label}</Badge>
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
                {c.count ? `${c.count} sale${c.count > 1 ? "s" : ""} · ${grams(c.grams)} · ${c.daysSince === 0 ? "today" : `${c.daysSince}d ago`}` : "no purchases yet"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.gold }}>{money(c.revenue)}</div>
              {c.owed > 0.005 && <div style={{ fontSize: 10, color: C.orange, marginTop: 2 }}>owes {money(c.owed)}</div>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
