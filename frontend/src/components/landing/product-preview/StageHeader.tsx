export function StageHeader({ time, highlight }: { time: string; highlight: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 12px",
          background: highlight ? "rgba(0,92,230,0.18)" : "rgba(22,23,27,0.66)",
          backdropFilter: "blur(14px) saturate(180%)",
          borderRadius: 999,
          boxShadow: highlight
            ? "inset 0 0 0 1px rgba(77,156,255,0.42), 0 0 0 4px rgba(77,156,255,0.12)"
            : "inset 0 0 0 1px rgba(255,255,255,0.08)",
          color: "#F5F5F7",
          transition: "all 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span
          style={{
            fontFamily: "var(--sm-font-mono)",
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          SM-7K2-9XB
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: "rgba(22,23,27,0.66)",
          backdropFilter: "blur(14px) saturate(180%)",
          borderRadius: 999,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          color: "#F5F5F7",
          fontFamily: "var(--sm-font-mono)",
          fontSize: 11.5,
          fontWeight: 500,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#1C8F5A" }} />
        <span>{time}</span>
        <span style={{ color: "rgba(245,245,247,0.5)" }}>· expires in 1:42</span>
      </div>
    </div>
  );
}
