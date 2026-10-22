import { useMemo, useState } from "react";
import { TYPES, todayStr, money, grams, num } from "./calc";
import { uid, now } from "./store";
import { Sheet, Field, Label, Chip } from "./ui";
import { C, F, inp } from "./theme";

const QUICK_G = [1, 2, 3.5, 7, 14, 28];
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Add / edit sheet for sale, buy, payment, iou and expense.
 * preset: { customerId, amount } to prefill (e.g. "Collect" from the Deben tab).
 */
export default function TxSheet({ type, tx, preset = {}, state, ledger, dispatch, onClose }) {
  const editing = !!tx;
  const T = TYPES[type];
  const { customers, settings, txs } = state;
  const gPerOz = settings.gPerOz || 28;

  const initQty = tx && tx.grams != null ? String(tx.grams) : "";
  const [date, setDate] = useState(tx?.date || todayStr());
  const [customerId, setCustomerId] = useState(tx?.customerId ?? preset.customerId ?? "");
  const [newName, setNewName] = useState("");
  const [supplier, setSupplier] = useState(tx?.supplier || "");
  const [qty, setQty] = useState(initQty);
  const [unit, setUnit] = useState("g");
  const [amount, setAmount] = useState(tx ? String(type === "sale" ? tx.price : tx.amount ?? "") : preset.amount != null ? String(round(preset.amount)) : "");
  const [paid, setPaid] = useState(tx && type === "sale" ? String(tx.paid ?? tx.price) : "");
  const [paidTouched, setPaidTouched] = useState(!!tx && type === "sale" && tx.paid != null && tx.paid !== tx.price);
  const [note, setNote] = useState(tx?.note || "");
  const [err, setErr] = useState("");

  const g = unit === "oz" ? num(qty) * gPerOz : num(qty);
  const amt = num(amount);
  const paidNow = paidTouched ? num(paid) : amt;
  const isNew = customerId === "__new";
  const needsCustomer = type === "payment" || type === "iou";
  const suppliers = useMemo(() => [...new Set(txs.filter(t => t.type === "buy" && t.supplier).map(t => t.supplier))], [txs]);
  const cust = ledger.customers.get(customerId);

  const avgCost = ledger.stock.avg;
  const estCogs = g * avgCost;
  const estProfit = amt - estCogs;
  const overStock = type === "sale" && !editing && g > ledger.stock.g + 0.001 && ledger.T.buyCount > 0;

  const save = () => {
    setErr("");
    const fail = m => { setErr(m); return false; };
    if (!date) return fail("Pick a date");
    if ((type === "sale" || type === "buy") && !(g > 0)) return fail("Enter the quantity");
    if (type !== "sale" && !(amt > 0)) return fail("Enter an amount");
    if (type === "sale" && !(amt >= 0)) return fail("Enter the price");
    if (type === "sale" && qty === "") return fail("Enter the quantity");
    if (type === "sale" && paidNow > amt + 0.001) return fail("Paid can't be more than the price");
    if (type === "sale" && amt - paidNow > 0.005 && (!customerId || (isNew && !newName.trim()))) return fail("Pick who owes the rest");
    if (needsCustomer && (!customerId || (isNew && !newName.trim()))) return fail("Pick a customer");

    let cid = customerId && customerId !== "__new" ? customerId : null;
    if (isNew && newName.trim()) {
      cid = uid();
      dispatch({ type: "addCust", customer: { id: cid, name: newName.trim(), phone: "", notes: "", createdAt: now() } });
    }
    const base = { id: tx?.id || uid(), type, date, ts: tx?.ts || now(), note: note.trim() };
    let out;
    if (type === "sale") out = { ...base, customerId: cid, grams: round(g, 3), price: round(amt), paid: round(paidNow) };
    else if (type === "buy") out = { ...base, supplier: supplier.trim(), grams: round(g, 3), amount: round(amt) };
    else if (type === "expense") out = { ...base, amount: round(amt) };
    else out = { ...base, customerId: cid, amount: round(amt) };
    dispatch({ type: editing ? "updateTx" : "addTx", tx: out });
    onClose();
  };

  const remove = () => {
    if (window.confirm("Delete this entry? This can't be undone.")) { dispatch({ type: "delTx", id: tx.id }); onClose(); }
  };

  const customerPicker = required => (
    <Field label={required ? "CUSTOMER" : "CUSTOMER (blank = walk-in)"}>
      <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={inp}>
        <option value="">{required ? "— select —" : "Walk-in / unnamed"}</option>
        {customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => {
          const o = ledger.customers.get(c.id)?.owed || 0;
          return <option key={c.id} value={c.id}>{c.name}{o > 0.005 ? ` (owes ${money(o)})` : ""}</option>;
        })}
        <option value="__new">+ New customer…</option>
      </select>
      {isNew && <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" style={{ ...inp, marginTop: 8 }} />}
    </Field>
  );

  const qtyField = () => (
    <Field label="QUANTITY">
      <div style={{ display: "flex", gap: 8 }}>
        <input inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={{ ...inp, flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          <Chip active={unit === "g"} color={T.color} onClick={() => setUnit("g")}>G</Chip>
          <Chip active={unit === "oz"} color={T.color} onClick={() => setUnit("oz")}>OZ</Chip>
        </div>
      </div>
      {unit === "g" ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {QUICK_G.map(q => <Chip key={q} color={T.color} active={num(qty) === q} onClick={() => setQty(String(q))}>{q}g</Chip>)}
        </div>
      ) : <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>1 oz = {gPerOz}g → {grams(g)}</div>}
    </Field>
  );

  return (
    <Sheet title={`${editing ? "EDIT " : "NEW "}${T.label}`} color={T.color} onClose={onClose}>
      <Field label="DATE"><input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} style={inp} /></Field>

      {type === "sale" && customerPicker(false)}
      {type === "payment" && customerPicker(true)}
      {type === "iou" && customerPicker(true)}
      {type === "buy" && (
        <Field label="SUPPLIER (optional)">
          <input list="tb-suppliers" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Who you bought from" style={inp} />
          <datalist id="tb-suppliers">{suppliers.map(s => <option key={s} value={s} />)}</datalist>
        </Field>
      )}

      {(type === "sale" || type === "buy") && qtyField()}

      <Field label={type === "sale" ? "PRICE ($)" : type === "buy" ? "TOTAL COST ($)" : "AMOUNT ($)"}>
        <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inp} />
        {type === "payment" && cust && cust.owed > 0.005 && (
          <div style={{ marginTop: 8 }}><Chip color={C.green} onClick={() => setAmount(String(round(cust.owed)))}>FULL BALANCE {money(cust.owed)}</Chip></div>
        )}
      </Field>

      {type === "sale" && (
        <Field label="PAID NOW ($)" hint={amt - paidNow > 0.005 ? undefined : "Leave as-is if paid in full"}>
          <input inputMode="decimal" value={paidTouched ? paid : amount} onChange={e => { setPaid(e.target.value); setPaidTouched(true); }} placeholder="0" style={inp} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Chip color={C.green} active={!paidTouched || paidNow === amt} onClick={() => { setPaidTouched(false); setPaid(""); }}>PAID FULL</Chip>
            <Chip color={C.orange} active={paidTouched && paidNow === 0} onClick={() => { setPaidTouched(true); setPaid("0"); }}>ON CREDIT</Chip>
          </div>
        </Field>
      )}

      {type === "expense" && <Field label="WHAT FOR"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Gas, bags, scale, speaker…" style={inp} /></Field>}
      {type !== "expense" && <Field label="NOTE (optional)"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Anything to remember" style={inp} /></Field>}

      {/* Live preview */}
      {(type === "sale" || type === "buy") && g > 0 && amt >= 0 && amount !== "" && (
        <div style={{ background: T.color + "0d", border: `1px solid ${T.color}33`, borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 80 }}><Label>PER GRAM</Label><div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: T.color, marginTop: 4 }}>{money(amt / g)}</div></div>
          {type === "sale" && avgCost > 0 && (
            <>
              <div style={{ flex: 1, minWidth: 80 }}><Label>EST. PROFIT</Label><div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: estProfit >= 0 ? C.green : C.red, marginTop: 4 }}>{money(estProfit, true)}</div></div>
              <div style={{ flex: 1, minWidth: 80 }}><Label>MARGIN</Label><div style={{ fontFamily: F.head, fontSize: 14, fontWeight: 700, color: C.text, marginTop: 4 }}>{amt > 0 ? Math.round((estProfit / amt) * 100) : 0}%</div></div>
            </>
          )}
          {type === "sale" && amt - paidNow > 0.005 && (
            <div style={{ flex: "1 0 100%", fontSize: 11, color: C.orange }}>⏳ {money(amt - paidNow)} will be added to what this customer owes.</div>
          )}
          {type === "sale" && avgCost > 0 && <div style={{ flex: "1 0 100%", fontSize: 10, color: C.dim }}>Cost basis {money(avgCost)}/g (weighted average of your buys)</div>}
        </div>
      )}
      {overStock && <div style={{ fontSize: 11, color: C.gold, marginBottom: 12 }}>⚠ You only have {grams(ledger.stock.g)} logged in stock — log the buy first so profit is accurate.</div>}
      {err && <div style={{ fontFamily: F.head, fontSize: 9, letterSpacing: 1, color: C.red, marginBottom: 10 }}>{err.toUpperCase()}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        {editing && <button className="btn-danger" onClick={remove}>DELETE</button>}
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>{editing ? "SAVE CHANGES" : `LOG ${T.label}`}</button>
      </div>
    </Sheet>
  );
}
