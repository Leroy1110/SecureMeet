import { type ReactNode } from "react";
import { SmIcon } from "../sm";

type RoomDrawerProps = {
  isOpen: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

const RoomDrawer = ({ isOpen, title, description, onClose, children }: RoomDrawerProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--sm-overlay)",
          backdropFilter: "var(--sm-blur-sm)",
          WebkitBackdropFilter: "var(--sm-blur-sm)",
          border: 0,
          cursor: "pointer",
        }}
      />
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          boxShadow: "var(--sm-shadow-xl)",
          borderLeft: "1px solid var(--sm-line)",
          borderTopLeftRadius: 28,
          borderBottomLeftRadius: 28,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--sm-line)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--sm-fg)",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--sm-fg-muted)",
              }}
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sm-press"
            aria-label="Close panel"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              border: 0,
              background: "var(--sm-bg-tint)",
              color: "var(--sm-fg-muted)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <SmIcon name="x" size={14} />
          </button>
        </header>
        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
          }}
        >
          {children}
        </div>
      </aside>
    </div>
  );
};

export default RoomDrawer;
