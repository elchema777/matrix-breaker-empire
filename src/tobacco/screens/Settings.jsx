import { useRef, useState } from "react";
import { normalize } from "../store";
import { daysBetween, todayStr } from "../calc";
import { Panel, Label, Field, Title } from "../ui";
import { C, F, inp } from "../theme";

const csvCell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Hand a text file to the user: native share sheet on phones when possible, else a normal download. */
async function deliver(name, text, mime) {
  const file = new File([text], name, { type: mime });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) {
    if (e?.name === "AbortError") return;
    console.warn("[tobacco] share failed, falling back to download", e);
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Settings({ state, dispatch, onClose, loadStarter, onLock, saveError }) {
  const { settings } = state;
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");
  const set = (k, v) => dispatch({ type: "settings", patch: { [k]: v } });
  const numField = (k, label, hint) => (
    <Field label={label} hint={hint}>
      <input inputMode="decimal" value={settings[k]} onChange={e => { const v = e.target.value; set(k, v === "" ? "" : Number.isFinite(+v) ? +v : settings[k]); }} style={inp} />
    </Field>
  );

  const exportJson = async () => {
    await deliver(`matrix-leaf-backup-${todayStr()}.json`, JSON.stringify({ app: "matrix-leaf", version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2), "application/json");
    set("lastBackup", new Date().toISOString());
    setMsg("Backup exported ✔");
  };

  const exportCsv = async () => {
    const name = id => state.customers.find(c => c.id === id)?.name || "";
    const head = ["date", "type", "customer", "supplier", "grams", "amount_or_price", "paid", "note"];
    const lines = [...state.txs].sort((a, b) => (a.date < b.date ? -1 : 1)).map(t =>
      [t.date, t.type, name(t.customerId), t.supplier, t.grams, t.price ?? t.amount, t.paid, t.note].map(csvCell).join(","));
    await deliver(`matrix-leaf-${todayStr()}.csv`, [head.join(","), ...lines].join("\n"), "text/csv");
    setMsg("CSV exported ✔");
  };

  const importJson = async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const next = normalize(JSON.parse(await f.text()));
      if (!window.confirm(`Replace ALL current data with this backup?\n${next.txs.length} entries · ${next.customers.length} customers`)) return;
      dispatch({ type: "replace", state: next });
      setMsg("Backup restored ✔");
    } catch (err) {
      console.error("[tobacco] import failed", err);
      setMsg("Import failed: " + (err.message || "invalid file"));
    }
  };

  const wipe = () => {
    if (window.prompt("This deletes EVERYTHING on this device. Type DELETE to confirm.") !== "DELETE") return;
    dispatch({ type: "replace", state: { txs: [], customers: [], settings } });
    setMsg("All data erased");
  };

  const age = settings.lastBackup ? daysBetween(settings.lastBackup.slice(0, 10), todayStr()) : null;

  return (
    <div style={{ padding: "52px 16px 120px" }}>
      <Title right={<button className="btn-secondary" style={{ padding: "7px 12px" }} onClick={onClose}>DONE</button>}>SETTINGS</Title>
      {saveError && <Panel color={C.red} style={{ marginBottom: 12, fontSize: 12 }}>⚠ Couldn't save to device storage: {saveError}. Export a backup now.</Panel>}

      <Panel color={C.purple} style={{ marginBottom: 14 }}>
        <Label color={C.purple}>BACKUP</Label>
        <div style={{ fontSize: 12, color: C.dim, margin: "8px 0 12px", lineHeight: 1.5 }}>
          Your data lives only on this device. Export a backup weekly — if the phone resets or you clear Safari data, it's gone.
          {" "}<b style={{ color: C.text }}>{age == null ? "Never exported." : age === 0 ? "Backed up today." : `Last backup ${age}d ago.`}</b>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={exportJson}>💾 EXPORT BACKUP</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>RESTORE</button>
        </div>
        <button className="btn-secondary" style={{ width: "100%" }} onClick={exportCsv}>EXPORT CSV (spreadsheet)</button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={importJson} style={{ display: "none" }} />
        {msg && <div style={{ fontFamily: F.head, fontSize: 9, letterSpacing: 1, color: C.green, marginTop: 10 }}>{msg.toUpperCase()}</div>}
      </Panel>

      <Panel style={{ marginBottom: 14 }}>
        <Label>BUSINESS RULES</Label>
        <div style={{ height: 10 }} />
        {numField("gPerOz", "GRAMS PER OZ", "You use 28g = 1 oz. Used when entering quantity in oz.")}
        {numField("lowStockG", "LOW-STOCK ALERT (g)", "Alert when stock falls to this many grams.")}
        {numField("overdueDays", "DEBT OVERDUE AFTER (days)")}
        {numField("coldDays", "CUSTOMER “COLD” AFTER (days)", "Flag regulars who haven't bought in this long.")}
      </Panel>

      <Panel style={{ marginBottom: 14 }}>
        <Label>TOOLS</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <button className="btn-secondary" onClick={loadStarter}>IMPORT STARTER DATA FROM MY NOTES</button>
          <button className="btn-secondary" onClick={onLock}>🔒 LOCK NOW</button>
          <button className="btn-danger" onClick={wipe}>ERASE ALL DATA</button>
        </div>
      </Panel>

      <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6, textAlign: "center" }}>
        Install: Safari → Share → Add to Home Screen.<br />The access code is a privacy lock for the screen, not encryption.
      </div>
    </div>
  );
}
