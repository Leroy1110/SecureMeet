import type { TileLayout } from "./types";

type TileProps = TileLayout & {
  name: string;
  initials: string;
  hue: string;
  muted?: boolean;
  speaking?: boolean;
  you?: boolean;
};

export function Tile({ name, initials, hue, muted, speaking, you, x, y, w, h }: TileProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transformOrigin: "center",
        transition: "all 600ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          overflow: "hidden",
          background: `linear-gradient(140deg, ${hue}, #0A0A0C 75%)`,
          boxShadow: speaking
            ? "0 0 0 2.5px #4D9CFF, 0 18px 50px -12px rgba(77,156,255,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)"
            : "inset 0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px -10px rgba(0,0,0,0.5)",
          transition: "box-shadow 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: w * 0.32,
              height: w * 0.32,
              maxWidth: 96,
              maxHeight: 96,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F5F5F7",
              fontFamily: "var(--sm-font-display)",
              fontWeight: 600,
              fontSize: Math.min(28, w * 0.11),
              letterSpacing: "-0.02em",
              backdropFilter: "blur(8px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {initials}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(120% 80% at 50% 110%, rgba(0,0,0,0.45), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: "rgba(10,10,12,0.66)",
            backdropFilter: "blur(10px) saturate(180%)",
            borderRadius: 999,
            color: "#F5F5F7",
            fontFamily: "var(--sm-font-text)",
            fontSize: 11.5,
            fontWeight: 500,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          {muted && (
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6" />
              <path d="M19 10v2a7 7 0 01-.11 1.23M12 19v3M5 10v2a7 7 0 0010.77 5.89" />
              <path d="M3 3l18 18" />
            </svg>
          )}
          <span>
            {name}
            {you ? " · You" : ""}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            width: 22,
            height: 22,
            borderRadius: 7,
            background: "rgba(10,10,12,0.66)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#F5F5F7",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
