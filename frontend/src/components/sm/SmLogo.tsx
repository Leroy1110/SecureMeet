type SmLogoProps = {
  inverse?: boolean;
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

export default function SmLogo({
  inverse = false,
  size = 28,
  withWordmark = true,
  className,
}: SmLogoProps) {
  const markBg = inverse ? "#F5F5F7" : "var(--sm-fg)";
  const markFg = inverse ? "var(--sm-fg)" : "#fff";
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          background: markBg,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--sm-shadow-xs)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "50%",
            background: markFg,
            position: "absolute",
            top: size * 0.22,
          }}
        />
        <div
          style={{
            width: size * 0.46,
            height: size * 0.11,
            borderRadius: size * 0.055,
            background: markFg,
            position: "absolute",
            bottom: size * 0.26,
          }}
        />
      </div>
      {withWordmark && (
        <div
          style={{
            fontFamily: "var(--sm-font-display)",
            fontSize: size * 0.62,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: inverse ? "#F5F5F7" : "var(--sm-fg)",
            lineHeight: 1,
          }}
        >
          SecureMeet
        </div>
      )}
    </div>
  );
}
