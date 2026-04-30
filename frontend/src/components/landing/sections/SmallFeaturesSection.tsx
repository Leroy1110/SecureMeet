import { LandingIcon, type IconName } from "../shared/icons";

const items: { icon: IconName; title: string; desc: string }[] = [
  { icon: "chat", title: "Encrypted chat", desc: "Public and private messages, encrypted at rest, scoped to the room." },
  { icon: "screen", title: "Host-controlled sharing", desc: "Screen shares require host approval. No surprises mid-call." },
  { icon: "users", title: "Up to 50 participants", desc: "Adaptive grid that prioritizes whoever is speaking." },
  { icon: "flash", title: "Sub-100ms latency", desc: "Selective forwarding edge nodes in 14 regions." },
  { icon: "eye", title: "No tracking, anywhere", desc: "No analytics scripts. No fingerprinting. Not even on this page." },
  { icon: "globe", title: "Works in the browser", desc: "No download. No plugins. No accounts for guests." },
];

export function SmallFeaturesSection() {
  return (
    <section id="security" style={{ maxWidth: 1180, margin: "0 auto", padding: "64px 28px 96px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              background: "var(--sm-bg-elev-1)",
              borderRadius: 20,
              padding: "24px 24px 28px",
              boxShadow: "inset 0 0 0 1px var(--sm-line), 0 1px 2px rgba(10,10,12,0.03)",
              transition: "transform 220ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 220ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "inset 0 0 0 1px var(--sm-line-strong), 0 12px 28px -12px rgba(10,10,12,0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "inset 0 0 0 1px var(--sm-line), 0 1px 2px rgba(10,10,12,0.03)";
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--sm-bg-tint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sm-fg)",
              }}
            >
              <LandingIcon name={item.icon} size={18} />
            </div>
            <h4
              style={{
                margin: "16px 0 6px",
                fontFamily: "var(--sm-font-display)",
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "var(--sm-fg)",
              }}
            >
              {item.title}
            </h4>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--sm-fg-muted)" }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
