import type { LandingTheme } from "../hooks/useLandingTheme";

export function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: LandingTheme;
  setTheme: (theme: LandingTheme) => void;
}) {
  const dark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={dark ? "Switch to light" : "Switch to dark"}
      aria-label="Toggle theme"
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: "pointer",
        background: "var(--sm-bg-elev-1)",
        color: "var(--sm-fg)",
        boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
        transition: "all 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        fontFamily: "inherit",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <g>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </g>
        ) : (
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        )}
      </svg>
    </button>
  );
}
