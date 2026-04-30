import { LandingButton } from "../shared/LandingButton";

export function ClosingCtaSection() {
  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px 100px" }}>
      <div
        style={{
          position: "relative",
          background: "#0A0A0C",
          color: "#F5F5F7",
          borderRadius: 36,
          padding: "88px 56px",
          textAlign: "center",
          overflow: "hidden",
          boxShadow: "var(--sm-shadow-xl)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(60% 80% at 50% 0%, rgba(77,156,255,0.18), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(40% 60% at 50% 100%, rgba(77,156,255,0.06), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4D9CFF",
            }}
          >
            Ready when you are
          </div>
          <h3
            style={{
              margin: "14px auto 0",
              fontFamily: "var(--sm-font-display)",
              fontSize: "clamp(40px, 5.4vw, 72px)",
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              maxWidth: 800,
            }}
          >
            Spin up a room.
            <br />
            <span style={{ color: "rgba(245,245,247,0.55)" }}>Leave no trace.</span>
          </h3>
          <p
            style={{
              margin: "22px auto 0",
              maxWidth: 480,
              fontSize: 16.5,
              lineHeight: 1.5,
              color: "rgba(245,245,247,0.7)",
            }}
          >
            Your first meeting takes 8 seconds to start. No download, no account, no credit card.
          </p>
          <div style={{ marginTop: 36, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <LandingButton variant="accent" size="lg" icon="arrow" as="link" to="/register">
              Start a meeting
            </LandingButton>
            <a
              href="mailto:hello@securemeet.app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 52,
                padding: "0 24px",
                border: 0,
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                color: "#F5F5F7",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 15.5,
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                textDecoration: "none",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
              }}
            >
              Talk to sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
