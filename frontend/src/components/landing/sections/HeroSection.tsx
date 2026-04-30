import { useEffect, useState } from "react";
import ProductPreview from "../ProductPreview";
import { LandingButton } from "../shared/LandingButton";
import { LandingIcon } from "../shared/icons";

export function HeroSection() {
  const [parY, setParY] = useState(0);

  useEffect(() => {
    const onScroll = () => setParY(window.scrollY * 0.06);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section style={{ position: "relative", paddingTop: 156, paddingBottom: 96, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 700,
          background: "radial-gradient(60% 60% at 50% 30%, rgba(0,92,230,0.06), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 500,
          background: "radial-gradient(40% 50% at 50% 50%, rgba(10,10,12,0.04), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "0 28px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 14px 7px 12px",
            background: "var(--sm-bg-elev-1)",
            borderRadius: 999,
            boxShadow: "inset 0 0 0 1px var(--sm-line), 0 1px 2px rgba(10,10,12,0.04)",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--sm-fg-muted)",
            letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingRight: 10,
              borderRight: "1px solid var(--sm-line)",
              color: "var(--sm-fg)",
              fontWeight: 600,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--sm-success)" }} />
            New
          </span>
          End-to-end encrypted by default
        </div>

        <h1
          style={{
            margin: "32px auto 0",
            maxWidth: 1000,
            fontFamily: "var(--sm-font-display)",
            fontSize: "clamp(56px, 8.6vw, 104px)",
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 0.98,
            color: "var(--sm-fg)",
          }}
        >
          Meetings that stay
          <br />
          <span
            style={{
              background: "linear-gradient(180deg, var(--sm-fg) 30%, var(--sm-fg-subtle) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            between you.
          </span>
        </h1>

        <p
          style={{
            margin: "28px auto 0",
            maxWidth: 600,
            fontSize: 19,
            lineHeight: 1.5,
            color: "var(--sm-fg-muted)",
            letterSpacing: "-0.005em",
          }}
        >
          End-to-end encrypted video, host-approved access, and rooms that vanish when you're done. No recordings.
          No transcripts. No compromises.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 36 }}>
          <LandingButton variant="primary" size="lg" icon="arrow" as="link" to="/register">
            Start a meeting
          </LandingButton>
          <LandingButton variant="secondary" size="lg" as="anchor" href="#features">
            Watch the demo
          </LandingButton>
        </div>
        <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--sm-fg-subtle)" }}>
          Free for up to 10 participants · No credit card · 2-hour rooms
        </p>

        <div
          style={{
            marginTop: 88,
            position: "relative",
            transform: `translateY(${parY}px)`,
            transition: "transform 80ms linear",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              bottom: -60,
              height: 120,
              background: "radial-gradient(50% 100% at 50% 0%, rgba(10,10,12,0.18), transparent 70%)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              margin: "0 auto",
              maxWidth: 1180,
              aspectRatio: "1080 / 620",
              borderRadius: 28,
              overflow: "hidden",
              background: "#0A0A0C",
              boxShadow:
                "0 60px 140px -40px rgba(10,10,12,0.45), 0 24px 50px -16px rgba(10,10,12,0.20), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <ProductPreview />
          </div>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
              fontSize: 12.5,
              color: "var(--sm-fg-subtle)",
              letterSpacing: "-0.005em",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <LandingIcon name="lock" size={13} /> RSA + AES, on device
            </span>
            <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--sm-line-strong)" }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <LandingIcon name="clock" size={13} /> Rooms expire in 2 hours
            </span>
            <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--sm-line-strong)" }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <LandingIcon name="shield" size={13} /> Zero data retention
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
