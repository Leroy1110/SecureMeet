import { useEffect, useState } from "react";
import SmLogo from "../../sm/SmLogo";
import type { LandingTheme } from "../hooks/useLandingTheme";
import { LandingButton } from "../shared/LandingButton";
import { ThemeToggle } from "../shared/ThemeToggle";

export function LandingNavbar({
  theme,
  setTheme,
}: {
  theme: LandingTheme;
  setTheme: (theme: LandingTheme) => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "all 360ms cubic-bezier(0.32, 0.72, 0, 1)",
        padding: scrolled ? "10px 24px" : "18px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px 10px 22px",
          background: scrolled ? "var(--sm-bg-elev-2)" : "transparent",
          backdropFilter: scrolled ? "var(--sm-blur-md)" : "none",
          WebkitBackdropFilter: scrolled ? "var(--sm-blur-md)" : "none",
          borderRadius: 999,
          boxShadow: scrolled
            ? "inset 0 0 0 1px var(--sm-line), 0 12px 32px -12px rgba(10,10,12,0.10)"
            : "none",
          transition: "all 360ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <SmLogo size={26} />
        <nav
          style={{
            display: "flex",
            gap: 28,
            fontSize: 13.5,
            fontWeight: 500,
            color: "var(--sm-fg-muted)",
            letterSpacing: "-0.005em",
          }}
        >
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
            Features
          </a>
          <a href="#security" style={{ color: "inherit", textDecoration: "none" }}>
            Security
          </a>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
            Changelog
          </a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <LandingButton variant="ghost" size="sm" as="link" to="/login">
            Sign in
          </LandingButton>
          <LandingButton variant="primary" size="sm" as="link" to="/register">
            Start free
          </LandingButton>
        </div>
      </div>
    </header>
  );
}
