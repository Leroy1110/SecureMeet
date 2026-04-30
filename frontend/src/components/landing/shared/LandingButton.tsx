import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LandingIcon, type IconName } from "./icons";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const sizes: Record<ButtonSize, { h: number; px: number; fs: number; r: number }> = {
  sm: { h: 32, px: 14, fs: 13, r: 10 },
  md: { h: 42, px: 18, fs: 14, r: 12 },
  lg: { h: 52, px: 24, fs: 15.5, r: 14 },
};

export function LandingButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  onClick,
  as,
  to,
  href,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  as?: "button" | "link" | "anchor";
  to?: string;
  href?: string;
}) {
  const [hover, setHover] = useState(false);
  const s = sizes[size];

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: hover ? "var(--sm-graphite-hover)" : "var(--sm-graphite)",
      color: "#fff",
      boxShadow: "var(--sm-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.14)",
    },
    accent: {
      background: hover ? "var(--sm-accent-press)" : "var(--sm-accent)",
      color: "#fff",
      boxShadow: "var(--sm-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.18)",
    },
    secondary: {
      background: hover ? "var(--sm-bg-tint)" : "var(--sm-bg-elev-1)",
      color: "var(--sm-fg)",
      boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
    },
    ghost: {
      background: hover ? "var(--sm-bg-tint)" : "transparent",
      color: "var(--sm-fg)",
    },
  };

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: s.h,
    padding: `0 ${s.px}px`,
    border: 0,
    borderRadius: s.r,
    cursor: "pointer",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    fontSize: s.fs,
    fontFamily: "inherit",
    textDecoration: "none",
    transition: "background 220ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 220ms",
    whiteSpace: "nowrap",
    flexShrink: 0,
    ...variants[variant],
  };

  const inner = (
    <>
      {children}
      {icon && <LandingIcon name={icon} size={size === "lg" ? 17 : 15} />}
    </>
  );

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };

  if (as === "link" && to) {
    return (
      <Link to={to} style={style} {...handlers}>
        {inner}
      </Link>
    );
  }

  if (as === "anchor" && href) {
    return (
      <a href={href} style={style} {...handlers}>
        {inner}
      </a>
    );
  }

  return (
    <button onClick={onClick} style={style} {...handlers}>
      {inner}
    </button>
  );
}
