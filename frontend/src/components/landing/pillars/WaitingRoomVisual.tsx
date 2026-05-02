import { useEffect, useState } from "react";
import { LandingIcon } from "../shared/icons";

const people = [
  { initials: "JN", name: "Jun Tanaka", email: "jun@securemeet.app" },
  { initials: "EM", name: "Emily Park", email: "emily@securemeet.app" },
  { initials: "DV", name: "David Okafor", email: "david@securemeet.app" },
];

export function WaitingRoomVisual() {
  const [admitted, setAdmitted] = useState<[boolean, boolean, boolean]>([false, false, false]);

  useEffect(() => {
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % 4;
      if (step === 1) setAdmitted([true, false, false]);
      else if (step === 2) setAdmitted([true, true, false]);
      else if (step === 3) setAdmitted([true, true, true]);
      else setAdmitted([false, false, false]);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "5 / 4",
        borderRadius: 24,
        background: "var(--sm-bg-elev-1)",
        boxShadow: "inset 0 0 0 1px var(--sm-line), var(--sm-shadow-sm)",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--sm-fg-subtle)",
          }}
        >
          Waiting room · 3
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--sm-fg-muted)" }}>You decide</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {people.map((person, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              background: "var(--sm-bg-elev-1)",
              borderRadius: 14,
              boxShadow: "inset 0 0 0 1px var(--sm-line)",
              transition: "all 360ms cubic-bezier(0.32, 0.72, 0, 1)",
              transform: admitted[i] ? "translateX(8px)" : "translateX(0)",
              opacity: admitted[i] ? 0.55 : 1,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2F4F7A, #16171B)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              {person.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em", color: "var(--sm-fg)" }}>
                {person.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--sm-fg-subtle)" }}>{person.email}</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 30,
                padding: "0 12px",
                borderRadius: 999,
                background: admitted[i] ? "var(--sm-success-soft)" : "var(--sm-accent)",
                color: admitted[i] ? "var(--sm-success)" : "#fff",
                fontSize: 12,
                fontWeight: 600,
                boxShadow: admitted[i] ? "none" : "inset 0 1px 0 rgba(255,255,255,0.16)",
                transition: "all 240ms cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            >
              {admitted[i] ? (
                <>
                  <LandingIcon name="check" size={12} stroke={2.4} /> In
                </>
              ) : (
                "Admit"
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
