export function EncryptionPulse({ progress }: { progress: number }) {
  if (progress <= 0 || progress >= 1) return null;

  const radius = 40 + progress * 1600;
  const op = (1 - progress) * 0.22;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: radius,
        height: radius,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: "1.5px solid rgba(77,156,255,0.6)",
        boxShadow: `0 0 80px rgba(77,156,255,${op * 1.4})`,
        opacity: op * 4,
        pointerEvents: "none",
      }}
    />
  );
}
