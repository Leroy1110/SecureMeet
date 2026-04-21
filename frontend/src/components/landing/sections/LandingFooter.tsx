import { SmLogo } from "../../sm";

function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--sm-line)",
        padding: "28px 28px",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <SmLogo size={22} withWordmark />
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "var(--sm-fg-subtle)",
            letterSpacing: "-0.005em",
          }}
        >
          © {new Date().getFullYear()} SecureMeet
        </p>
      </div>
    </footer>
  );
}

export default LandingFooter;
