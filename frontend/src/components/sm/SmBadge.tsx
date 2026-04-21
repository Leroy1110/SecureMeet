import type { ReactNode } from "react";
import SmIcon, { type SmIconName } from "./SmIcon";

type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "outline" | "inverse-success" | "inverse-danger" | "inverse-neutral";

type SmBadgeProps = {
  tone?: Tone;
  icon?: SmIconName;
  dot?: boolean;
  children: ReactNode;
};

const toneStyle = (tone: Tone): React.CSSProperties => {
  switch (tone) {
    case "success":
      return { background: "var(--sm-success-soft)", color: "var(--sm-success)" };
    case "warn":
      return { background: "var(--sm-warn-soft)", color: "var(--sm-warn)" };
    case "danger":
      return { background: "var(--sm-danger-soft)", color: "var(--sm-danger)" };
    case "info":
      return { background: "var(--sm-accent-soft)", color: "var(--sm-accent)" };
    case "outline":
      return {
        background: "rgba(255,255,255,0.72)",
        color: "var(--sm-fg)",
        boxShadow: "inset 0 0 0 1px var(--sm-line)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };
    case "inverse-success":
      return { background: "rgba(28,143,90,0.14)", color: "#4ADE80" };
    case "inverse-danger":
      return { background: "rgba(198,48,31,0.16)", color: "#FF7A6B" };
    case "inverse-neutral":
      return { background: "rgba(255,255,255,0.08)", color: "#F5F5F7" };
    case "neutral":
    default:
      return { background: "var(--sm-bg-tint)", color: "var(--sm-fg)" };
  }
};

export default function SmBadge({ tone = "neutral", icon, dot, children }: SmBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 26,
        padding: "0 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        fontFamily: "var(--sm-font-text)",
        ...toneStyle(tone),
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
          }}
        />
      )}
      {icon && <SmIcon name={icon} size={12} />}
      {children}
    </span>
  );
}
