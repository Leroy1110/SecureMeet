import { useEffect, useState } from "react";

export function useRafProgress(durationSeconds: number) {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      setT((prev) => (prev + (now - last) / 1000) % durationSeconds);
      last = now;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationSeconds]);

  return t;
}
