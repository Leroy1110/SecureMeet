import { useRafProgress } from "../hooks/useRafProgress";

export function ExpiryVisual() {
  const t = useRafProgress(8);
  const total = 7200;
  const elapsed = Math.floor((t / 8) * 600);
  const remaining = total - elapsed;
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  const fmt = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const pct = (1 - elapsed / total) * 100;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "5 / 4",
        borderRadius: 24,
        background: "#0A0A0C",
        boxShadow: "var(--sm-shadow-md), inset 0 0 0 1px rgba(255,255,255,0.06)",
        overflow: "hidden",
        color: "#F5F5F7",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(70% 70% at 50% 60%, rgba(77,156,255,0.12), transparent 70%)",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(245,245,247,0.55)",
          }}
        >
          Room expires
        </div>
        <div
          style={{
            fontFamily: "var(--sm-font-mono)",
            fontSize: 11,
            color: "rgba(245,245,247,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          SM-7K2-9XB
        </div>
      </div>
      <div style={{ position: "relative", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--sm-font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: "clamp(56px, 7vw, 96px)",
            fontWeight: 500,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {fmt}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: "rgba(245,245,247,0.55)" }}>then everything is gone</div>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg, #4D9CFF, #005CE6)",
              transition: "width 200ms linear",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--sm-font-mono)",
            fontSize: 11,
            color: "rgba(245,245,247,0.55)",
          }}
        >
          <span>recordings · 0</span>
          <span>transcripts · 0</span>
          <span>data retained · 0 b</span>
        </div>
      </div>
    </div>
  );
}
