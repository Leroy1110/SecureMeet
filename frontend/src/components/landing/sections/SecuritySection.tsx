import { motion } from "framer-motion";
import { SmIcon } from "../../sm";
import { slideInLeft, slideInRight, transition } from "../motion";

const checklist = [
  "RSA public-key exchange",
  "AES symmetric message encryption",
  "Host-controlled room access",
  "Automatic 2-hour room expiration",
  "Encrypted message storage",
  "WebRTC peer-to-peer media",
];

function SecuritySection() {
  return (
    <section id="security" style={{ background: "var(--sm-bg-sunken)", padding: "100px 28px" }}>
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 56,
          alignItems: "center",
        }}
        className="sm-security-grid"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={slideInLeft}
          transition={transition}
        >
          <div className="sm-eyebrow">Security</div>
          <h2
            className="sm-h2"
            style={{ margin: "14px 0 18px", fontSize: "clamp(36px, 5vw, 48px)" }}
          >
            Encryption isn't optional.
            <br />
            It's the architecture.
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--sm-fg-muted)",
              maxWidth: 460,
            }}
          >
            SecureMeet uses RSA key exchange and AES symmetric encryption for
            every message. Your data is encrypted before it touches the server
            and stays encrypted at rest.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={slideInRight}
          transition={transition}
          style={{
            background: "#fff",
            borderRadius: 28,
            padding: 28,
            boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-sm)",
          }}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {checklist.map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--sm-success-soft)",
                    color: "var(--sm-success)",
                    flexShrink: 0,
                  }}
                >
                  <SmIcon name="check" size={14} strokeWidth={2.2} />
                </span>
                <span style={{ fontSize: 14.5, color: "var(--sm-fg)", fontWeight: 500 }}>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .sm-security-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 72px !important;
          }
        }
      `}</style>
    </section>
  );
}

export default SecuritySection;
