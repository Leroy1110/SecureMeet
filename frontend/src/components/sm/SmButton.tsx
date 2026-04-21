import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import SmIcon, { type SmIconName } from "./SmIcon";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

type SmButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: Variant;
  size?: Size;
  icon?: SmIconName;
  iconTrailing?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
};

const sizeStyle: Record<Size, { height: number; padx: number; font: number; radius: number; iconSize: number }> = {
  sm: { height: 32, padx: 12, font: 13, radius: 10, iconSize: 14 },
  md: { height: 40, padx: 18, font: 14, radius: 14, iconSize: 16 },
  lg: { height: 48, padx: 22, font: 16, radius: 16, iconSize: 18 },
};

const variantStyle = (v: Variant): React.CSSProperties => {
  switch (v) {
    case "primary":
      return {
        background: "var(--sm-fg)",
        color: "#fff",
        boxShadow: "var(--sm-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.12)",
      };
    case "accent":
      return {
        background: "var(--sm-accent)",
        color: "#fff",
        boxShadow: "var(--sm-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.18)",
      };
    case "secondary":
      return {
        background: "#fff",
        color: "var(--sm-fg)",
        boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
      };
    case "subtle":
      return {
        background: "var(--sm-bg-tint)",
        color: "var(--sm-fg)",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--sm-fg)",
      };
    case "danger":
      return {
        background: "var(--sm-danger)",
        color: "#fff",
        boxShadow: "var(--sm-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.14)",
      };
  }
};

const SmButton = forwardRef<HTMLButtonElement, SmButtonProps>(function SmButton(
  {
    variant = "primary",
    size = "md",
    icon,
    iconTrailing = false,
    fullWidth = false,
    children,
    disabled,
    className,
    style,
    ...rest
  },
  ref,
) {
  const s = sizeStyle[size];
  const merged: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    transition: "all 220ms var(--sm-ease-standard), transform 140ms var(--sm-ease-standard)",
    fontFamily: "var(--sm-font-text)",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    height: s.height,
    padding: `0 ${s.padx}px`,
    fontSize: s.font,
    borderRadius: s.radius,
    width: fullWidth ? "100%" : undefined,
    ...variantStyle(variant),
    ...style,
  };

  const iconNode = icon ? <SmIcon name={icon} size={s.iconSize} /> : null;

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`sm-press ${className ?? ""}`}
      style={merged}
      {...rest}
    >
      {!iconTrailing && iconNode}
      {children}
      {iconTrailing && iconNode}
    </button>
  );
});

export default SmButton;
