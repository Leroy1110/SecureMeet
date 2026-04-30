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
  const bgColor = "#0090FF";
  const shackleColor = inverse ? "rgba(255,255,255,0.85)" : "#0090FF";
  const bodyColor = inverse ? "#ffffff" : "#0090FF";
  const keyholeColor = inverse ? "#0090FF" : "#ffffff";
  const textColor = inverse ? "#F5F5F7" : "var(--sm-fg)";

  // We render a padlock icon: shackle arch + rounded body + keyhole circle
  // The icon fits inside a (size × size*1.1) bounding box
  const iconW = size;
  const iconH = Math.round(size * 1.1);

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg
        width={iconW}
        height={iconH}
        viewBox="0 0 56 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Shackle arch */}
        <path
          d="M15 30 L15 21 Q15 6 28 6 Q41 6 41 21 L41 30"
          stroke={shackleColor}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        {/* Lock body */}
        <rect x="4" y="27" width="48" height="31" rx="10" fill={bodyColor} />
        {/* Keyhole circle */}
        <circle cx="28" cy="43" r="7" fill={keyholeColor} />
      </svg>
      {withWordmark && (
        <div
          style={{
            fontFamily: "var(--sm-font-display)",
            fontSize: size * 0.62,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: textColor,
            lineHeight: 1,
          }}
        >
          SecureMeet
        </div>
      )}
    </div>
  );
}
