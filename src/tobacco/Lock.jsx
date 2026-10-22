import { useState } from "react";
import MatrixRain from "../components/MatrixRain";
import { C, F } from "./theme";

// SHA-256 of the access code — the plain text is not stored in the bundle.
// NOTE: this is a front-end privacy gate, not encryption. Data stays unencrypted in this device's storage.
const HASH = "69ae5adf6e187277c3fb4a7b149866ab186a27b58018f60888ef8973c068430d";

/** Hex SHA-256 of a string via WebCrypto (requires https or localhost). */
async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function Lock({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!crypto?.subtle) throw new Error("Secure context required (open over https)");
      const ok = (await sha256(pw.trim())) === HASH;
      if (ok) { onUnlock(); return; }
      setFails(f => f + 1);
      setErr(fails >= 2 ? "ACCESS DENIED — TRY AGAIN" : "ACCESS DENIED");
      setShake(true); setPw("");
      setTimeout(() => setShake(false), 450);
    } catch (e2) {
      console.error("[tobacco] unlock failed", e2);
      setErr(String(e2.message || e2).toUpperCase());
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", fontFamily: F.body }}>
      <MatrixRain opacity={0.09} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${C.gold} 30%,${C.cyan} 50%,${C.gold} 70%,transparent)`, zIndex: 3 }} />
      <form onSubmit={submit} className={shake ? "tb-shake" : ""} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 340, textAlign: "center" }}>
        <div className="tb-pulse" style={{ fontSize: 64, color: C.gold, lineHeight: 1 }}>⬡</div>
        <div style={{ fontFamily: F.head, fontSize: 20, fontWeight: 900, letterSpacing: 5, color: C.gold, marginTop: 14 }}>MATRIX LEAF</div>
        <div style={{ fontFamily: F.head, fontSize: 8, letterSpacing: 4, color: C.dim, marginTop: 6, marginBottom: 30 }}>TRADE TERMINAL</div>
        <input
          type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} autoFocus
          autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="ACCESS CODE" aria-label="Access code"
          style={{ width: "100%", textAlign: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${err ? C.red + "88" : C.gold + "44"}`, borderRadius: 10, color: C.text, padding: "14px", fontSize: 16, letterSpacing: 4, fontFamily: F.head, outline: "none" }}
        />
        <div style={{ height: 22, marginTop: 10, fontFamily: F.head, fontSize: 9, letterSpacing: 2, color: C.red }}>{err}</div>
        <button className="btn-primary" type="submit" disabled={busy || !pw} style={{ width: "100%", marginTop: 4, opacity: pw ? 1 : 0.5 }}>ENTER THE MATRIX</button>
      </form>
    </div>
  );
}
