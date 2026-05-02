import { ExpiryVisual } from "../pillars/ExpiryVisual";
import { HandshakeVisual } from "../pillars/HandshakeVisual";
import { PillarBlock } from "../pillars/PillarBlock";
import { WaitingRoomVisual } from "../pillars/WaitingRoomVisual";

export function PillarsSection() {
  return (
    <section id="features" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 28px" }}>
      <div style={{ textAlign: "center", padding: "80px 0 24px" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--sm-fg-subtle)",
          }}
        >
          What you get
        </div>
        <h2
          style={{
            margin: "16px auto 0",
            maxWidth: 760,
            fontFamily: "var(--sm-font-display)",
            fontSize: "clamp(40px, 5vw, 60px)",
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            color: "var(--sm-fg)",
          }}
        >
          Three things, done seriously.
        </h2>
      </div>

      <PillarBlock
        eyebrow="Encryption"
        title="Keys never leave your device."
        body="Every call uses a fresh RSA-4096 keypair, exchanged peer-to-peer. We pass the encrypted bytes — we can't read them, and neither can anyone else. Not your IT team. Not us. Not anyone."
        visual={<HandshakeVisual />}
      />
      <PillarBlock
        eyebrow="Access"
        title="You vet everyone who joins."
        body="Every participant lands in a waiting room. You see their name, their email, their device — and you decide. No surprise drop-ins. No accidental shares. The host always has the final say."
        visual={<WaitingRoomVisual />}
        reverse
      />
      <PillarBlock
        eyebrow="Retention"
        title="When the room closes, it's gone."
        body="Rooms expire after 2 hours. No recordings, no transcripts, no AI summaries left behind in someone's drive. The conversation lived in the room. Now it doesn't."
        visual={<ExpiryVisual />}
      />
    </section>
  );
}
