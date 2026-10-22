import { useState } from "react";
import { uid, now } from "./store";
import { Sheet, Field } from "./ui";
import { C, inp } from "./theme";

/** Add / edit a customer profile. Deleting is only allowed when they have no logged transactions. */
export default function CustomerSheet({ customer, hasTx, dispatch, onClose, onDeleted }) {
  const editing = !!customer;
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [notes, setNotes] = useState(customer?.notes || "");
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    const c = { id: customer?.id || uid(), name: name.trim(), phone: phone.trim(), notes: notes.trim(), createdAt: customer?.createdAt || now() };
    dispatch({ type: editing ? "updCust" : "addCust", customer: c });
    onClose(c);
  };

  const del = () => {
    if (hasTx) { setErr("Has transactions — can't delete. Edit the name instead."); return; }
    if (window.confirm(`Delete ${customer.name}?`)) { dispatch({ type: "delCust", id: customer.id }); onDeleted?.(); onClose(); }
  };

  return (
    <Sheet title={editing ? "EDIT CUSTOMER" : "NEW CUSTOMER"} color={C.cyan} onClose={() => onClose()}>
      <Field label="NAME"><input autoFocus={!editing} value={name} onChange={e => setName(e.target.value)} placeholder="Name or nickname" style={inp} /></Field>
      <Field label="PHONE (optional)"><input inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="787-…" style={inp} /></Field>
      <Field label="NOTES"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Preferences, where to meet, reliability…" style={{ ...inp, resize: "vertical" }} /></Field>
      {err && <div style={{ fontSize: 11, color: C.red, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        {editing && <button className="btn-danger" onClick={del}>DELETE</button>}
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>{editing ? "SAVE" : "ADD CUSTOMER"}</button>
      </div>
    </Sheet>
  );
}
