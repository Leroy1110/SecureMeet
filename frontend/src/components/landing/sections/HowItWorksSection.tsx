import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, transition } from "../motion";

const steps = [
  {
    number: "1",
    title: "Create a room",
    description: "Generate a secure room with a unique code and password. Share credentials with your team.",
  },
  {
    number: "2",
    title: "Join securely",
    description: "Participants enter credentials and wait in the lobby. The host approves each one.",
  },
  {
    number: "3",
    title: "Meet privately",
    description: "End-to-end encrypted video, audio, and chat. The room expires when you're done.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how" style={{ padding: "80px 28px", maxWidth: 960, margin: "0 auto" }}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} transition={transition} style={{ textAlign: "center" }}>
          <div className="sm-eyebrow">How it works</div>
          <h2
            className="sm-h2"
            style={{ margin: "14px 0 0", fontSize: "clamp(36px, 5vw, 52px)" }}
          >
            Three steps. Total privacy.
          </h2>
        </motion.div>

        <div
          style={{
            position: "relative",
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 40,
          }}
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={fadeInUp}
              transition={{ ...transition, delay: index * 0.12 }}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "#fff",
                  boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--sm-fg)",
                  fontFamily: "var(--sm-font-mono)",
                }}
              >
                {step.number}
              </span>
              <h3
                style={{
                  margin: "20px 0 6px",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  color: "var(--sm-fg)",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  maxWidth: 280,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--sm-fg-muted)",
                }}
              >
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default HowItWorksSection;
