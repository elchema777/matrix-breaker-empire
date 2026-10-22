// Pure ledger math for Matrix Leaf. No React, no storage — everything is derived from txs + customers.
//
// Accounting model
//  - Inventory is valued at moving weighted-average cost (WAC). Each sale books COGS = grams * WAC at that moment.
//  - Revenue / profit are accrual-based (a sale counts when made, even if the customer still owes).
//  - Cash view is separate: cash in = money actually collected (sale paid + payments), cash out = buys + expenses.
//  - Debts are applied FIFO: a customer's payment clears their oldest open debt first (drives aging).

const pad = n => String(n).padStart(2, "0");
const EPS = 0.005;

export const num = v => (Number.isFinite(+v) ? +v : 0);
export const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => dstr(new Date());
const toDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
export const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return dstr(d); };
export const weekdayOf = s => toDate(s).getDay();

export function niceDate(s) {
  const t = todayStr();
  if (s === t) return "Today";
  if (s === addDays(t, -1)) return "Yesterday";
  return toDate(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
export const shortDate = s => { const [, m, d] = s.split("-"); return `${+m}/${+d}`; };

export function money(v, signed = false) {
  const n = Math.round(num(v) * 100) / 100;
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(abs) ? 0 : 2, maximumFractionDigits: 2 });
  if (n < 0) return `-$${s}`;
  return `${signed && n > 0 ? "+" : ""}$${s}`;
}
export function grams(v) {
  const n = Math.round(num(v) * 10) / 10;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}g`;
}
export const pct = v => `${(Math.round(num(v) * 10) / 10).toFixed(1)}%`;
export const safeDiv = (a, b) => (b ? a / b : 0);

/**
 * Replay every transaction chronologically and derive inventory, profit, cash, debts and customer stats.
 * @param {Array} txs raw transactions
 * @param {Array} customers customer profiles
 * @param {object} settings app settings (coldDays etc.)
 */
export function buildLedger(txs, customers, settings = {}) {
  const rows = [...txs]
    .sort((a, b) => (a.date === b.date ? num(a.ts) - num(b.ts) : a.date < b.date ? -1 : 1))
    .map(t => ({ ...t }));

  let poolG = 0, poolCost = 0, lastAvg = 0;
  const T = { revenue: 0, cogs: 0, expenses: 0, buySpend: 0, gramsBought: 0, gramsSold: 0, saleCount: 0, buyCount: 0, cashIn: 0, cashOut: 0, creditSales: 0, paymentsIn: 0 };
  const cs = new Map();
  const days = new Map();

  const cState = id => {
    if (!cs.has(id)) cs.set(id, { id, sales: [], revenue: 0, grams: 0, profit: 0, queue: [], credit: 0, dates: new Set(), payments: 0 });
    return cs.get(id);
  };
  const dayOf = date => {
    if (!days.has(date)) days.set(date, { date, revenue: 0, cogs: 0, expenses: 0, buyCost: 0, gramsSold: 0, gramsBought: 0, sales: 0, stockG: 0 });
    return days.get(date);
  };
  const addDebt = (c, date, amt) => {
    if (c.credit > 0) { const use = Math.min(c.credit, amt); c.credit -= use; amt -= use; }
    if (amt > EPS) c.queue.push({ date, amt });
  };
  const applyPay = (c, amt) => {
    while (amt > EPS && c.queue.length) {
      const q = c.queue[0];
      const use = Math.min(q.amt, amt);
      q.amt -= use; amt -= use;
      if (q.amt <= EPS) c.queue.shift();
    }
    if (amt > EPS) c.credit += amt;
  };

  for (const r of rows) {
    const d = dayOf(r.date);
    if (r.type === "buy") {
      const g = num(r.grams), a = num(r.amount);
      poolG += g; poolCost += a;
      if (poolG > 0) lastAvg = poolCost / poolG;
      T.buySpend += a; T.gramsBought += g; T.buyCount++; T.cashOut += a;
      d.buyCost += a; d.gramsBought += g;
    } else if (r.type === "sale") {
      const g = num(r.grams), p = num(r.price);
      const paid = Math.min(p, Math.max(0, r.paid == null ? p : num(r.paid)));
      const avg = poolG > 0 ? poolCost / poolG : lastAvg;
      const cogs = g * avg;
      poolG = Math.max(0, poolG - g);
      poolCost = Math.max(0, poolCost - cogs);
      r.cogs = cogs; r.profit = p - cogs; r.paid = paid; r.owed = p - paid;
      T.revenue += p; T.cogs += cogs; T.gramsSold += g; T.saleCount++; T.cashIn += paid; T.creditSales += p - paid;
      d.revenue += p; d.cogs += cogs; d.gramsSold += g; d.sales++;
      if (r.customerId) {
        const c = cState(r.customerId);
        c.sales.push(r); c.revenue += p; c.grams += g; c.profit += r.profit; c.dates.add(r.date);
        if (p - paid > EPS) addDebt(c, r.date, p - paid);
      }
    } else if (r.type === "payment") {
      const a = num(r.amount);
      T.cashIn += a; T.paymentsIn += a;
      if (r.customerId) { const c = cState(r.customerId); c.payments += a; applyPay(c, a); }
    } else if (r.type === "iou") {
      if (r.customerId) addDebt(cState(r.customerId), r.date, num(r.amount));
    } else if (r.type === "expense") {
      const a = num(r.amount);
      T.expenses += a; T.cashOut += a; d.expenses += a;
    }
    d.stockG = poolG;
  }

  const today = todayStr();
  const stats = new Map();
  let receivable = 0, debtors = 0;
  const known = new Set(customers.map(c => c.id));
  const ids = [...new Set([...customers.map(c => c.id), ...cs.keys()])];
  for (const id of ids) {
    const s = cs.get(id) || cState(id);
    const prof = customers.find(c => c.id === id) || { id, name: "Unknown", phone: "", notes: "" };
    const dates = [...s.dates].sort();
    const gaps = dates.length > 1 ? daysBetween(dates[0], dates[dates.length - 1]) / (dates.length - 1) : null;
    const owed = s.queue.reduce((a, q) => a + q.amt, 0) - s.credit;
    const oldest = s.queue[0]?.date || null;
    const freq = {};
    s.sales.forEach(x => { const k = Math.round(num(x.grams) * 10) / 10; freq[k] = (freq[k] || 0) + 1; });
    const favG = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
    if (owed > EPS) { receivable += owed; debtors++; }
    stats.set(id, {
      ...prof, orphan: !known.has(id),
      sales: s.sales, revenue: s.revenue, grams: s.grams, profit: s.profit, payments: s.payments,
      visits: dates.length, count: s.sales.length,
      avgTicket: safeDiv(s.revenue, s.sales.length), ppg: safeDiv(s.revenue, s.grams),
      firstDate: dates[0] || null, lastDate: dates[dates.length - 1] || null,
      daysSince: dates.length ? daysBetween(dates[dates.length - 1], today) : null,
      avgGap: gaps, favG: favG != null ? +favG : null,
      owed: Math.abs(owed) < EPS ? 0 : owed, oldestDebt: oldest, debtAge: oldest ? daysBetween(oldest, today) : 0,
    });
  }

  // Tier: VIP = top 20% by revenue with >=3 buying days; REG = >=3; NEW otherwise; COLD overrides when gone quiet.
  const buyers = [...stats.values()].filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const vipCut = buyers.length ? buyers[Math.max(0, Math.ceil(buyers.length * 0.2) - 1)].revenue : Infinity;
  const coldDays = settings.coldDays || 21;
  for (const c of stats.values()) {
    if (c.visits >= 2 && c.daysSince >= coldDays) c.tier = "COLD";
    else if (c.visits >= 3 && c.revenue >= vipCut) c.tier = "VIP";
    else if (c.visits >= 3) c.tier = "REG";
    else c.tier = "NEW";
  }

  const daily = [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  daily.forEach(d => { d.net = d.revenue - d.cogs - d.expenses; });

  const grossProfit = T.revenue - T.cogs;
  const netProfit = grossProfit - T.expenses;
  return {
    rows, daily, customers: stats,
    stock: { g: poolG, cost: poolCost, avg: poolG > 0 ? poolCost / poolG : lastAvg },
    T: {
      ...T, grossProfit, netProfit, receivable, debtors,
      margin: safeDiv(grossProfit, T.revenue) * 100,
      roi: safeDiv(netProfit, T.buySpend) * 100,
      netCash: T.cashIn - T.cashOut,
      // share of sales value actually collected (credit given on sales, minus payments received since); IOUs aren't sales so they're excluded
      collection: T.revenue > 0 ? Math.min(100, Math.max(0, safeDiv(T.revenue - Math.max(0, T.creditSales - T.paymentsIn), T.revenue) * 100)) : 100,
    },
  };
}

/** Continuous day-by-day series (zero-filled) between two dates, merging in ledger daily rows. */
export function fillDays(daily, from, to) {
  const map = new Map(daily.map(d => [d.date, d]));
  const out = [];
  let lastStock = 0;
  for (const d of daily) if (d.date < from) lastStock = d.stockG;
  for (let s = from, guard = 0; s <= to && guard < 800; s = addDays(s, 1), guard++) {
    const d = map.get(s);
    if (d) lastStock = d.stockG;
    out.push({
      date: s, label: shortDate(s),
      revenue: d?.revenue || 0, profit: d ? d.revenue - d.cogs : 0, net: d?.net || 0, expenses: d?.expenses || 0,
      buyCost: d?.buyCost || 0, sellPpg: d && d.gramsSold > 0 ? d.revenue / d.gramsSold : null,
      buyPpg: d && d.gramsBought > 0 ? d.buyCost / d.gramsBought : null, gramsSold: d?.gramsSold || 0, stockG: lastStock,
    });
  }
  return out;
}

/** Things that need attention: low stock, overdue debts, customers who went quiet, oversold stock. */
export function buildAlerts(ledger, settings) {
  const out = [];
  const { stock, customers } = ledger;
  const hasBuys = ledger.T.buyCount > 0;
  if (hasBuys && stock.g <= (settings.lowStockG ?? 28)) {
    out.push({ id: "stock", level: stock.g <= 0 ? "red" : "gold", icon: "📦", text: stock.g <= 0 ? "Out of stock — restock needed" : `Low stock: ${grams(stock.g)} left` });
  }
  [...customers.values()].filter(c => c.owed > EPS && c.debtAge >= (settings.overdueDays ?? 14))
    .sort((a, b) => b.owed - a.owed)
    .forEach(c => out.push({ id: "debt" + c.id, level: "red", icon: "⏳", text: `${c.name} owes ${money(c.owed)} · ${c.debtAge}d`, customerId: c.id }));
  [...customers.values()].filter(c => c.tier === "COLD" && c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue).slice(0, 3)
    .forEach(c => out.push({ id: "cold" + c.id, level: "cyan", icon: "💤", text: `${c.name} quiet ${c.daysSince}d (usually every ${Math.round(c.avgGap || 0)}d)`, customerId: c.id }));
  return out;
}

export const TYPES = {
  sale:    { label: "SALE",    icon: "💰", color: "#FFD700" },
  buy:     { label: "BUY",     icon: "📦", color: "#00D4FF" },
  payment: { label: "PAYMENT", icon: "✅", color: "#00FF88" },
  iou:     { label: "IOU",     icon: "⏳", color: "#FF8C00" },
  expense: { label: "EXPENSE", icon: "🧾", color: "#FF6B6B" },
};
