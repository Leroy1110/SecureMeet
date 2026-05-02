import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  mic: (
    <g>
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" />
    </g>
  ),
  video: (
    <g>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </g>
  ),
  screen: (
    <g>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </g>
  ),
  chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  users: (
    <g>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </g>
  ),
};

export function Dock() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: 8,
        background: "rgba(22,23,27,0.74)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 50px -12px rgba(0,0,0,0.6)",
      }}
    >
      {Object.keys(ICONS).map((k) => (
        <div
          key={k}
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F5F5F7",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[k]}
          </svg>
        </div>
      ))}
      <div
        style={{
          marginLeft: 4,
          height: 38,
          padding: "0 14px",
          borderRadius: 999,
          background: "#C6301F",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--sm-font-text)",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        End
      </div>
    </div>
  );
}
