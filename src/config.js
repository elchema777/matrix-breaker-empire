// Bot configuration — stored only in localStorage empire_tokens.
// No hardcoded fallback: Settings is the sole source of truth. A token
// that hasn't been configured there is simply undefined; callers must
// check for that and show a "not configured" state rather than assume
// a value exists.
export function loadTokens() {
  try {
    const saved = localStorage.getItem("empire_tokens");
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

export function saveTokens(tokens) {
  try { localStorage.setItem("empire_tokens", JSON.stringify(tokens)); } catch { /* storage unavailable/full */ }
}

export const DIVISIONS = {
  div1:    { id:"div1",    label:"DIV 1",   name:"XAUAgent",       bot:"@MatrixBCode_Bot",   color:"#FFD700", strategy:"ICT + DXY Bias",         instruments:"XAUUSD" },
  div2:    { id:"div2",    label:"DIV 2",   name:"MarkovBreaker",  bot:"@MarkovAgent_bot",   color:"#00D4FF", strategy:"8-State Markov Chain",    instruments:"XAUUSD" },
  div3:    { id:"div3",    label:"DIV 3",   name:"GEXBreaker",     bot:"@Matrix_Div3Bot",    color:"#00FF88", strategy:"GEX+Breakout+TPO",        instruments:"XAUUSD M15" },
  nexus:   { id:"nexus",   label:"NEXUS",   name:"NEXUS",          bot:"@MatrixNexus_bot",   color:"#9B59B6", strategy:"Shared Services",         instruments:"—" },
  encoder: { id:"encoder", label:"ENCODER", name:"Encoder/Jarvis", bot:"@MatrixB_encoderbot",color:"#FF8C00", strategy:"AI Brain (Groq 70B)",     instruments:"—" },
};

export const EMPIRE_TARGETS = {
  demo_goal: 150000,
  cp1: 110000,
  cp2: 130000,
  live_trigger: 150000,
};

export function tg(token) {
  return `https://api.telegram.org/bot${token}`;
}

export async function sendMessage(token, chatId, text) {
  const res = await fetch(`${tg(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.json();
}

export async function getUpdates(token, limit = 20) {
  try {
    const res = await fetch(`${tg(token)}/getUpdates?limit=${limit}&timeout=0`);
    return res.json();
  } catch { return { ok: false, result: [] }; }
}

// localStorage helpers
export const ls = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable/full */ } },
};
