import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SmButton } from "../../sm";
import { fadeInUp, staggerContainer, transition } from "../motion";

function FinalCtaSection() {
  return (
    <section style={{ padding: "80px 28px 120px" }}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "var(--sm-fg)",
          borderRadius: 32,
          padding: "64px 48px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--sm-shadow-lg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(77,156,255,0.16), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <motion.h2
          variants={fadeInUp}
          transition={transition}
          className="sm-h2"
          style={{
            margin: 0,
            position: "relative",
            color: "#F5F5F7",
            fontSize: "clamp(36px, 5vw, 56px)",
            letterSpacing: "-0.025em",
          }}
        >
          Ready when you are.
        </motion.h2>

        <motion.p
          variants={fadeInUp}
          transition={transition}
          style={{
            margin: "18px auto 0",
            maxWidth: 520,
            fontSize: 17,
            lineHeight: 1.5,
            color: "rgba(245,245,247,0.7)",
            position: "relative",
          }}
        >
          Free for up to 10 participants. No credit card, no setup. Your first
          private room is one click away.
        </motion.p>

        <motion.div
          variants={fadeInUp}
          transition={transition}
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            position: "relative",
          }}
        >
          <Link to="/register" style={{ textDecoration: "none" }}>
            <SmButton variant="accent" size="lg" icon="arrow" iconTrailing>
              Start free
            </SmButton>
          </Link>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <SmButton
              variant="ghost"
              size="lg"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#F5F5F7",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              Sign in
            </SmButton>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default FinalCtaSection;
