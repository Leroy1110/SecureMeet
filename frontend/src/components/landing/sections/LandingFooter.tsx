import SmLogo from "../../sm/SmLogo";

const columns = [
  { h: "Product", items: ["Features", "Security", "Pricing", "Changelog"] },
  { h: "Company", items: ["About", "Manifesto", "Press", "Contact"] },
  { h: "Resources", items: ["White paper", "Source code", "Status", "Help"] },
  { h: "Legal", items: ["Privacy", "Terms", "DPA", "SOC 2"] },
];

export function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--sm-line)",
        padding: "56px 28px 40px",
        background: "var(--sm-bg-elev-1)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 48,
        }}
      >
        <div>
          <SmLogo size={26} />
          <p
            style={{
              margin: "20px 0 0",
              maxWidth: 280,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--sm-fg-muted)",
            }}
          >
            Privacy-first video meetings. Built for people who'd rather not be the product.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.h}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--sm-fg-subtle)",
                marginBottom: 16,
              }}
            >
              {column.h}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {column.items.map((item) => (
                <a
                  key={item}
                  href="#"
                  style={{
                    fontSize: 14,
                    color: "var(--sm-fg)",
                    textDecoration: "none",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          maxWidth: 1180,
          margin: "56px auto 0",
          paddingTop: 24,
          borderTop: "1px solid var(--sm-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          fontSize: 12.5,
          color: "var(--sm-fg-subtle)",
        }}
      >
        <div>© 2026 SecureMeet · Private by design</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--sm-success)" }} />
            All systems operational
          </span>
        </div>
      </div>
    </footer>
  );
}
