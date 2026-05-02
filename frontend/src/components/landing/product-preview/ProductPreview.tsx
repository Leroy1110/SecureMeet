import { useEffect, useRef, useState } from "react";
import { useRafProgress } from "../hooks/useRafProgress";
import { ProductScene } from "./ProductScene";

export function ProductPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const t = useRafProgress(14);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setScale(Math.min(w / 1080, h / 620));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        background: "#0A0A0C",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1080,
          height: 620,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <ProductScene t={t} />
      </div>
    </div>
  );
}
