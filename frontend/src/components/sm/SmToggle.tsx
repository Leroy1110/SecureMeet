type SmToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
};

export default function SmToggle({ label, description, checked, onChange }: SmToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: 0,
        background: "#fff",
        boxShadow: "inset 0 0 0 1px var(--sm-line)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--sm-font-text)",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--sm-fg)" }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "var(--sm-fg-subtle)", marginTop: 2 }}>{description}</div>}
      </div>
      <div
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          background: checked ? "var(--sm-success)" : "#D1D2D8",
          padding: 3,
          boxSizing: "border-box",
          transition: "background 220ms var(--sm-ease-standard)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            marginLeft: checked ? 18 : 0,
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            transition: "margin 220ms var(--sm-ease-standard)",
          }}
        />
      </div>
    </button>
  );
}
