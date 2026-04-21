import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fadeInUp, staggerContainer, transition } from "../motion";
import { SmButton, SmIcon } from "../../sm";

const participants = [
  { n: "TM", name: "Tom · You", color: "#1b3158" },
  { n: "JM", name: "Jun", color: "#244a38" },
  { n: "IY", name: "ilay", color: "#3a2450" },
  { n: "LT", name: "Leo", color: "#553a1d" },
  { n: "RI", name: "Roni", color: "#4a1e25" },
];

function HeroSection() {
  return (
    <section
      style={{
        position: "relative",
        padding: "120px 28px 80px",
        textAlign: "center",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      {/* Soft radial wash (≤5% opacity, no gradient clouds) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(50% 50% at 50% 15%, rgba(0, 92, 230, 0.05), transparent 70%)",
        }}
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        style={{ position: "relative" }}
      >
        <motion.div
          variants={fadeInUp}
          transition={transition}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "#fff",
            boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--sm-fg-muted)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--sm-success)" }} />
          Privacy-first video meetings
        </motion.div>

        <motion.h1
          variants={fadeInUp}
          transition={transition}
          style={{
            margin: "28px 0 0",
            fontFamily: "var(--sm-font-display)",
            fontSize: "clamp(48px, 8vw, 84px)",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
            color: "var(--sm-fg)",
          }}
        >
          Meetings that stay
          <br />
          <span style={{ color: "var(--sm-fg-subtle)" }}>between you.</span>
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          transition={transition}
          style={{
            margin: "26px auto 0",
            maxWidth: 560,
            fontSize: 19,
            lineHeight: 1.5,
            color: "var(--sm-fg-muted)",
          }}
        >
          End-to-end encrypted video calls, host-approved access, and rooms
          that expire. No recordings. No compromises.
        </motion.p>

        <motion.div
          variants={fadeInUp}
          transition={transition}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
            marginTop: 36,
          }}
        >
          <Link to="/register" style={{ textDecoration: "none" }}>
            <SmButton variant="primary" size="lg" icon="arrow" iconTrailing>
              Start a meeting
            </SmButton>
          </Link>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <SmButton variant="secondary" size="lg">
              Sign in
            </SmButton>
          </Link>
        </motion.div>

        <motion.p
          variants={fadeInUp}
          transition={transition}
          style={{ marginTop: 16, fontSize: 12.5, color: "var(--sm-fg-subtle)" }}
        >
          No credit card required · Free for up to 10 participants
        </motion.p>

        {/* Hero device preview */}
        <motion.div
          variants={fadeInUp}
          transition={transition}
          style={{ marginTop: 72, position: "relative" }}
        >
          <div
            style={{
              borderRadius: 28,
              overflow: "hidden",
              boxShadow: "var(--sm-shadow-xl)",
              background: "var(--sm-stage)",
              aspectRatio: "16 / 9",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(60% 70% at 50% 30%, rgba(77,156,255,0.18), transparent 70%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 28,
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gridTemplateRows: "1fr 1fr",
                gap: 14,
              }}
            >
              {participants.map((p, i) => (
                <div
                  key={p.n}
                  style={{
                    gridColumn: i === 0 ? "span 1" : undefined,
                    gridRow: i === 0 ? "span 2" : undefined,
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${p.color}, #0A0A0C)`,
                    position: "relative",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
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
                        width: i === 0 ? 72 : 36,
                        height: i === 0 ? 72 : 36,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F5F5F7",
                        fontWeight: 600,
                        fontSize: i === 0 ? 22 : 14,
                      }}
                    >
                      {p.n}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      bottom: 10,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(10,10,12,0.6)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      color: "#F5F5F7",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
            {/* Floating dock */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 24,
                transform: "translateX(-50%)",
                display: "flex",
                gap: 8,
                padding: 10,
                background: "rgba(22,23,27,0.68)",
                backdropFilter: "var(--sm-blur-md)",
                WebkitBackdropFilter: "var(--sm-blur-md)",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["mic", "video", "screen", "chat", "users"] as const).map((n) => (
                <div
                  key={n}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F5F5F7",
                  }}
                >
                  <SmIcon name={n} size={16} />
                </div>
              ))}
              <div
                style={{
                  padding: "0 16px",
                  height: 40,
                  borderRadius: 999,
                  background: "var(--sm-danger)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                End
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default HeroSection;
