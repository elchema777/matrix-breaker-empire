import { TYPES, money, grams, num } from "./calc";
import { C, F } from "./theme";

export function Label({ children, color = C.dim, style }) {
  return <div style={{ fontFamily: F.head, fontSize: 8, letterSpacing: "0.15em", color, ...style }}>{children}</div>;
}

export function Panel({ children, color, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${color ? color + "33" : C.line}`, borderRadius: 14, padding: 14,
      boxShadow: color ? `0 0 24px ${color}10` : "none", cursor: onClick ? "pointer" : "default", ...style,
    }}>{children}</div>
  );
}

export function Stat({ label, value, color = C.text, sub, style }) {
  return (
    <div style={style}>
      <Label>{label}</Label>
      <div style={{ fontFamily: F.head, fontSize: 17, fontWeight: 700, color, marginTop: 5, wordBreak: "break-word" }}>{value}</div>
      {sub != null && <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function Title({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ fontFamily: F.head, fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 3 }}>{children}</div>
      {right}
    </div>
  );
}

export function Chip({ active, color = C.gold, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: "0 0 auto", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontFamily: F.head, fontSize: 9, letterSpacing: 1,
      background: active ? color + "1a" : "rgba(255,255,255,0.03)", border: `1px solid ${active ? color + "66" : C.line}`, color: active ? color : C.dim,
    }}>{children}</button>
  );
}

export function Badge({ color, children }) {
  return <span style={{ fontFamily: F.head, fontSize: 7, letterSpacing: 1, padding: "2px 6px", borderRadius: 5, color, border: `1px solid ${color}55`, background: color + "14" }}>{children}</span>;
}

export function Empty({ icon = "⬡", children }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: C.dim, fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ fontSize: 30, marginBottom: 8, opacity: 0.5 }}>{icon}</div>{children}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <Label>{label}</Label>
      <div style={{ marginTop: 4 }}>{children}</div>
      {hint && <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

/** Bottom sheet modal. */
export function Sheet({ title, color = C.gold, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} className="tb-sheet" style={{
        width: "100%", maxWidth: 430, maxHeight: "92vh", overflowY: "auto", background: "#0b0b12", borderRadius: "18px 18px 0 0",
        border: `1px solid ${color}44`, borderBottom: "none", padding: "18px 16px max(20px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, letterSpacing: 2, color }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: C.dim, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** One transaction line (used in Home, Log and customer profile). */
export function TxRow({ tx, customerName, title, onClick }) {
  const T = TYPES[tx.type] || TYPES.sale;
  let amt, sub;
  const amtColor = T.color;
  if (tx.type === "sale") {
    amt = money(tx.price, true);
    sub = `${grams(tx.grams)}${num(tx.grams) ? ` · ${money(num(tx.price) / num(tx.grams))}/g` : ""}`;
  } else if (tx.type === "buy") {
    amt = money(-num(tx.amount)); sub = `${grams(tx.grams)}${num(tx.grams) ? ` · ${money(num(tx.amount) / num(tx.grams))}/g` : ""}`;
  } else if (tx.type === "payment") { amt = money(tx.amount, true); sub = "payment received"; }
  else if (tx.type === "iou") { amt = money(tx.amount); sub = "owes you"; }
  else { amt = money(-num(tx.amount)); sub = "expense"; }
  const who = title || (tx.type === "buy" ? tx.supplier || "Supplier" : tx.type === "expense" ? tx.note || "Expense" : customerName || (tx.type === "sale" ? "Walk-in" : "—"));
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.line}`, cursor: onClick ? "pointer" : "default" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: T.color + "15", border: `1px solid ${T.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{T.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{who}</div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{sub}{tx.type === "sale" && tx.owed > 0.005 ? <span style={{ color: C.orange }}> · owes {money(tx.owed)}</span> : null}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: F.head, fontSize: 12, fontWeight: 700, color: amtColor }}>{amt}</div>
        {tx.type === "sale" && tx.profit != null && <div style={{ fontSize: 9, color: tx.profit >= 0 ? C.green : C.red, marginTop: 2 }}>{money(tx.profit, true)} profit</div>}
      </div>
    </div>
  );
}

/** Tiny dependency-free sparkline. */
export function Spark({ data, color = C.green, h = 44, w = 300 }) {
  if (!data || data.length < 2) return <div style={{ height: h }} />;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color + "18"} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
