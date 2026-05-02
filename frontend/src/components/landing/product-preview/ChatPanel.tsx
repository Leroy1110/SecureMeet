import { CHAT_MESSAGES } from "./data";
import { clamp } from "./math";

export function ChatPanel({ visible, scrollY }: { visible: boolean; scrollY: number }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 60,
        bottom: 80,
        width: 280,
        borderRadius: 20,
        background: "rgba(20,21,25,0.84)",
        backdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 460ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms",
        color: "#F5F5F7",
        fontFamily: "var(--sm-font-text)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Chat</div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(77,156,255,0.95)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Encrypted
        </div>
      </div>
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {CHAT_MESSAGES.map((message, i) => {
          const op = clamp((scrollY - message.t) / 0.4, 0, 1);
          const ty = (1 - op) * 8;

          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateY(${ty}px)`,
                transition: "all 240ms cubic-bezier(0.32, 0.72, 0, 1)",
                alignSelf: message.mine ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  color: "rgba(245,245,247,0.5)",
                  marginBottom: 4,
                  paddingLeft: message.mine ? 0 : 2,
                  paddingRight: message.mine ? 2 : 0,
                  textAlign: message.mine ? "right" : "left",
                }}
              >
                {message.who} · {message.when}
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 14,
                  background: message.mine ? "#005CE6" : "rgba(255,255,255,0.06)",
                  color: message.mine ? "#fff" : "#F5F5F7",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  boxShadow: message.mine
                    ? "inset 0 1px 0 rgba(255,255,255,0.18)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            fontSize: 12,
            color: "rgba(245,245,247,0.4)",
          }}
        >
          Message everyone…
        </div>
      </div>
    </div>
  );
}
