import { motion } from "framer-motion";
import { SmIcon, type SmIconName } from "../../sm";
import { fadeInUp, transition } from "../motion";

type TrustItem = { label: string; icon: SmIconName };

const trustItems: TrustItem[] = [
  { label: "End-to-end encrypted", icon: "lock" },
  { label: "Rooms expire in 2 hours", icon: "clock" },
  { label: "Up to 10 participants", icon: "users" },
  { label: "Zero data retention", icon: "shield" },
];

function TrustBarSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      variants={fadeInUp}
      transition={transition}
      style={{
        borderTop: "1px solid var(--sm-line)",
        borderBottom: "1px solid var(--sm-line)",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px 56px",
        }}
      >
        {trustItems.map((item) => (
          <span
            key={item.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--sm-fg-muted)",
              letterSpacing: "-0.005em",
            }}
          >
            <span style={{ color: "var(--sm-fg-subtle)" }}>
              <SmIcon name={item.icon} size={18} />
            </span>
            {item.label}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

export default TrustBarSection;
