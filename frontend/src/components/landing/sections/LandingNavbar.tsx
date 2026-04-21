import { Link } from "react-router-dom";
import { SmButton, SmLogo } from "../../sm";

type LandingNavbarProps = {
  scrolled: boolean;
};

function LandingNavbar({ scrolled }: LandingNavbarProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "var(--sm-blur-md)",
        WebkitBackdropFilter: "var(--sm-blur-md)",
        background: scrolled ? "rgba(251,251,253,0.82)" : "rgba(251,251,253,0.6)",
        borderBottom: scrolled ? "1px solid var(--sm-line)" : "1px solid transparent",
        transition: "all 220ms var(--sm-ease-standard)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <SmLogo size={28} />
        <nav
          className="hidden md:flex"
          style={{
            gap: 28,
            fontSize: 14,
            color: "var(--sm-fg-muted)",
            fontWeight: 500,
          }}
        >
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
            Features
          </a>
          <a href="#security" style={{ color: "inherit", textDecoration: "none" }}>
            Security
          </a>
          <a href="#how" style={{ color: "inherit", textDecoration: "none" }}>
            How it works
          </a>
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <SmButton variant="ghost" size="sm">
              Sign in
            </SmButton>
          </Link>
          <Link to="/register" style={{ textDecoration: "none" }}>
            <SmButton variant="primary" size="sm">
              Get started
            </SmButton>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default LandingNavbar;
