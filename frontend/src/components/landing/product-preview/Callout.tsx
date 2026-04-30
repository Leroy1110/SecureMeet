type CalloutProps = {
  text: string;
  x: number;
  y: number;
  visible: boolean;
  anchor?: "left" | "center" | "right";
};

export function Callout({ text, x, y, visible, anchor = "left" }: CalloutProps) {
  const tx = anchor === "right" ? "-100%" : anchor === "center" ? "-50%" : "0";
  const op = visible ? 1 : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${tx}, ${op === 0 ? 6 : 0}px)`,
        opacity: op,
        transition:
          "opacity 320ms cubic-bezier(0.32, 0.72, 0, 1), transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 11px",
        background: "rgba(245,245,247,0.96)",
        color: "#0A0A0C",
        fontFamily: "var(--sm-font-text)",
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        borderRadius: 999,
        boxShadow: "0 12px 32px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.05)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "#005CE6" }} />
      {text}
    </div>
  );
}
