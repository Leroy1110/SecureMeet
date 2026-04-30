import { clamp, easeOutBack } from "./math";

export function KnockCard({ progress, approved }: { progress: number; approved: boolean }) {
  const ease = easeOutBack(clamp(progress, 0, 1));
  const ty = (1 - ease) * 24;
  const op = clamp(progress * 1.4, 0, 1);

  return (
    <div
      style={{
        position: "absolute",
        right: 28,
        top: 78,
        width: 280,
        padding: 16,
        borderRadius: 18,
        background: "rgba(22,23,27,0.86)",
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.10)",
        transform: `translateY(${ty}px)`,
        opacity: op,
        color: "#F5F5F7",
        fontFamily: "var(--sm-font-text)",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(245,245,247,0.55)",
          marginBottom: 10,
        }}
      >
        Waiting room
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2F4F7A, #16171B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
          }}
        >
          JM
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>Jun Matsuda</div>
          <div style={{ fontSize: 11.5, color: "rgba(245,245,247,0.55)" }}>jun@securemeet.app</div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button
          style={{
            flex: 1,
            height: 32,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            color: "#F5F5F7",
            border: 0,
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 500,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
          }}
        >
          Decline
        </button>
        <button
          style={{
            flex: 1,
            height: 32,
            borderRadius: 10,
            background: approved ? "#1C8F5A" : "#005CE6",
            color: "#fff",
            border: 0,
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: approved
              ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 4px rgba(28,143,90,0.22)"
              : "inset 0 1px 0 rgba(255,255,255,0.18)",
            transition: "all 240ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          {approved ? "✓ Admitted" : "Admit"}
        </button>
      </div>
    </div>
  );
}
