import { motion } from "framer-motion";
import { SmIcon, type SmIconName } from "../../sm";
import { fadeInUp, staggerContainer, transition } from "../motion";

type Feature = {
  title: string;
  description: string;
  icon: SmIconName;
};

const features: Feature[] = [
  {
    icon: "lock",
    title: "End-to-end encrypted",
    description: "RSA + AES. Keys never leave your device - not even we can read your conversation.",
  },
  {
    icon: "users",
    title: "Host-approved waiting room",
    description: "Every participant is vetted before they join. You decide who enters.",
  },
  {
    icon: "clock",
    title: "Rooms expire in 2 hours",
    description: "No recordings. No transcripts. No lingering data.",
  },
  {
    icon: "chat",
    title: "Encrypted chat",
    description: "Public and private messages encrypted at rest, scoped to the room.",
  },
  {
    icon: "screen",
    title: "Host-controlled sharing",
    description: "Screen sharing requires host approval. No surprises.",
  },
  {
    icon: "shield",
    title: "Zero data retention",
    description: "Audit trail for you, nothing for us. Full transparency.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: "100px 28px", maxWidth: 1120, margin: "0 auto" }}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} transition={transition} style={{ textAlign: "center" }}>
          <div className="sm-eyebrow">What's inside</div>
          <h2
            className="sm-h2"
            style={{
              margin: "14px 0 0",
              color: "var(--sm-fg)",
              fontSize: "clamp(36px, 5vw, 52px)",
            }}
          >
            Everything you need.
            <br />
            Nothing you don't.
          </h2>
        </motion.div>

        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              transition={{ ...transition, delay: index * 0.06 }}
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "24px 24px 28px",
                boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-xs)",
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
                <SmIcon name={feature.icon} size={18} />
              </div>
              <h3
                style={{
                  margin: "16px 0 6px",
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: "-0.011em",
                  color: "var(--sm-fg)",
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--sm-fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default FeaturesSection;
