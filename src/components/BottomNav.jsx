const TABS = [
  { id: "empire",   icon: "⬡",  label: "Empire"   },
  { id: "commands", icon: "⌨", label: "Commands" },
  { id: "charts",   icon: "📊", label: "Charts"   },
  { id: "alerts",   icon: "🔔", label: "Alerts"   },
  { id: "health",   icon: "🛡",  label: "Health"   },
];

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "rgba(5,5,8,0.97)",
      borderTop: "1px solid rgba(255,215,0,0.12)",
      display: "flex", zIndex: 100,
      backdropFilter: "blur(20px)",
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onNavigate(t.id)} style={{
          flex: 1, padding: "10px 4px 8px",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: active === t.id ? "#FFD700" : "#3a3a4a",
          transition: "color 0.2s",
          borderTop: active === t.id ? "2px solid #FFD700" : "2px solid transparent",
        }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 8, letterSpacing: "0.08em", fontFamily: "'Orbitron',monospace", fontWeight: active === t.id ? 700 : 400 }}>
            {t.label.toUpperCase()}
          </span>
        </button>
      ))}
    </nav>
  );
}
