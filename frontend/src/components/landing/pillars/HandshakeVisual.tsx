import { useRafProgress } from "../hooks/useRafProgress";

export function HandshakeVisual() {
  const t = useRafProgress(4);
  const p = (t % 4) / 4;

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "5 / 4",
        borderRadius: 24,
        background: "var(--sm-bg-elev-1)",
        boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(60% 80% at 50% 50%, rgba(0,92,230,0.04), transparent 70%)",
        }}
      />
      <svg viewBox="0 0 400 320" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line
          x1="80"
          y1="160"
          x2="320"
          y2="160"
          stroke="var(--sm-line-strong)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <circle cx={80 + p * 240} cy="160" r="4" fill="var(--sm-accent)" />
        <circle cx={80 + p * 240} cy="160" r="10" fill="rgba(0,92,230,0.18)" />
        <g transform="translate(20,90)">
          <rect width="100" height="140" rx="14" fill="#0A0A0C" />
          <rect x="8" y="8" width="84" height="100" rx="8" fill="#16171B" />
          <circle cx="50" cy="58" r="14" fill="#1B3158" />
          <text x="50" y="62" fontFamily="Inter Tight" fontSize="11" fontWeight="600" textAnchor="middle" fill="#F5F5F7">
            A
          </text>
          <rect x="14" y="118" width="72" height="14" rx="3" fill="rgba(245,245,247,0.10)" />
        </g>
        <g transform="translate(280,90)">
          <rect width="100" height="140" rx="14" fill="#0A0A0C" />
          <rect x="8" y="8" width="84" height="100" rx="8" fill="#16171B" />
          <circle cx="50" cy="58" r="14" fill="#244A38" />
          <text x="50" y="62" fontFamily="Inter Tight" fontSize="11" fontWeight="600" textAnchor="middle" fill="#F5F5F7">
            B
          </text>
          <rect x="14" y="118" width="72" height="14" rx="3" fill="rgba(245,245,247,0.10)" />
        </g>
        <g transform="translate(184, 144)">
          <rect width="32" height="32" rx="10" fill="var(--sm-bg-elev-1)" stroke="var(--sm-line)" strokeWidth="1" />
          <g transform="translate(8,8)" stroke="var(--sm-fg)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="8" width="12" height="7" rx="1.5" />
            <path d="M5 8V5.5a3 3 0 016 0V8" />
          </g>
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 24,
          fontFamily: "var(--sm-font-mono)",
          fontSize: 11,
          color: "var(--sm-fg-subtle)",
        }}
      >
        device · A
      </div>
      <div
        style={{
          position: "absolute",
          right: 24,
          top: 24,
          fontFamily: "var(--sm-font-mono)",
          fontSize: 11,
          color: "var(--sm-fg-subtle)",
        }}
      >
        device · B
      </div>
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 20,
          right: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--sm-font-mono)",
          fontSize: 10.5,
          color: "var(--sm-fg-subtle)",
        }}
      >
        <span>RSA-4096 → AES-256-GCM</span>
        <span style={{ color: "var(--sm-success)" }}>● handshake ok</span>
      </div>
    </div>
  );
}
