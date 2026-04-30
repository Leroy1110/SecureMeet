import type { ReactNode } from "react";

export function PillarBlock({
  eyebrow,
  title,
  body,
  visual,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 80,
        alignItems: "center",
        padding: "80px 0",
      }}
    >
      <div style={{ order: reverse ? 2 : 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--sm-accent)",
          }}
        >
          {eyebrow}
        </div>
        <h3
          style={{
            margin: "14px 0 0",
            fontFamily: "var(--sm-font-display)",
            fontSize: 48,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            color: "var(--sm-fg)",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "20px 0 0",
            fontSize: 17,
            lineHeight: 1.55,
            color: "var(--sm-fg-muted)",
            maxWidth: 460,
          }}
        >
          {body}
        </p>
      </div>
      <div style={{ order: reverse ? 1 : 2 }}>{visual}</div>
    </div>
  );
}
