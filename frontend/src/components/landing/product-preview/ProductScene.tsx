import { Callout } from "./Callout";
import { ChatPanel } from "./ChatPanel";
import { PEOPLE } from "./data";
import { Dock } from "./Dock";
import { EncryptionPulse } from "./EncryptionPulse";
import { KnockCard } from "./KnockCard";
import { clamp, easeInOutCubic } from "./math";
import { StageHeader } from "./StageHeader";
import { Tile } from "./Tile";
import type { TileLayout } from "./types";

export function ProductScene({ t }: { t: number }) {
  const numTiles = t < 3.0 ? 1 : t < 4.0 ? 2 : 3;

  const knockIn = clamp((t - 1.6) / 0.8, 0, 1);
  const knockOut = clamp((t - 3.4) / 0.4, 0, 1);
  const knockProgress = knockIn * (1 - knockOut);
  const approved = t >= 2.9 && t < 3.6;

  const pulseProgress = clamp((t - 3.0) / 1.0, 0, 1);

  const chatVisible = t >= 6.0 && t < 12.5;
  const chatScroll = t - 6.0;

  const codeHighlight = t >= 9.4 && t < 11.0;

  const totalSecs = Math.floor(18 + t * 1.0);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const timeText = `${mins}:${String(secs).padStart(2, "0")}`;

  const camProgress = clamp((t - 9.0) / 2.0, 0, 1);
  const camScale = 1 - easeInOutCubic(camProgress) * 0.04;

  const speakerIdx = Math.floor((t * 1.4) % Math.max(1, numTiles));

  const STAGE_W = 1080;
  const STAGE_H = 620;
  const inset = 16;
  const dockSpace = 86;
  const headerSpace = 56;
  const right = chatVisible ? 312 : inset;
  const left = inset;
  const top = headerSpace;
  const bottom = dockSpace;
  const W = STAGE_W - left - right;
  const H = STAGE_H - top - bottom;

  let layouts: TileLayout[] = [];
  if (numTiles === 1) {
    layouts = [{ x: left + W * 0.18, y: top + H * 0.05, w: W * 0.64, h: H * 0.9 }];
  } else if (numTiles === 2) {
    layouts = [
      { x: left, y: top, w: W * 0.5 - 6, h: H },
      { x: left + W * 0.5 + 6, y: top, w: W * 0.5 - 6, h: H },
    ];
  } else {
    layouts = [
      { x: left, y: top, w: W * 0.62 - 6, h: H },
      { x: left + W * 0.62 + 6, y: top, w: W * 0.38 - 6, h: H * 0.5 - 6 },
      { x: left + W * 0.62 + 6, y: top + H * 0.5 + 6, w: W * 0.38 - 6, h: H * 0.5 - 6 },
    ];
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${camScale})`,
        transformOrigin: "center",
        transition: "transform 240ms linear",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "#0A0A0C" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(60% 70% at 50% 30%, rgba(77,156,255,0.10), transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 3px)",
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      <StageHeader time={timeText} highlight={codeHighlight} />

      {PEOPLE.slice(0, numTiles).map((person, i) => (
        <Tile
          key={person.name}
          {...layouts[i]}
          name={person.name}
          initials={person.initials}
          hue={person.hue}
          muted={person.muted}
          you={person.you}
          speaking={i === speakerIdx}
        />
      ))}

      {t >= 3.0 && t < 3.8 && layouts[1] && (
        <div
          style={{
            position: "absolute",
            ...layouts[1],
            borderRadius: 18,
            boxShadow: `0 0 0 ${(3.8 - t) * 6}px rgba(77,156,255,${(3.8 - t) * 0.4})`,
            pointerEvents: "none",
            transition: "box-shadow 80ms linear",
          }}
        />
      )}
      {t >= 4.0 && t < 4.8 && layouts[2] && (
        <div
          style={{
            position: "absolute",
            ...layouts[2],
            borderRadius: 18,
            boxShadow: `0 0 0 ${(4.8 - t) * 6}px rgba(77,156,255,${(4.8 - t) * 0.4})`,
            pointerEvents: "none",
          }}
        />
      )}

      {knockProgress > 0.02 && <KnockCard progress={knockProgress} approved={approved} />}

      <EncryptionPulse progress={pulseProgress} />

      <ChatPanel visible={chatVisible} scrollY={chatScroll} />

      <Dock />

      <Callout text="Host approves every entry" x={STAGE_W - 300} y={70} visible={t >= 1.9 && t < 3.4} anchor="right" />
      <Callout text="End-to-end handshake" x={STAGE_W / 2} y={STAGE_H / 2 - 30} visible={t >= 3.1 && t < 4.4} anchor="center" />
      <Callout text="Encrypted chat" x={STAGE_W - 320} y={50} visible={t >= 6.4 && t < 8.4} anchor="right" />
      <Callout text="Rooms expire automatically" x={210} y={70} visible={t >= 9.6 && t < 11.4} anchor="left" />

      {t >= 13.4 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#0A0A0C",
            opacity: clamp((t - 13.4) / 0.6, 0, 1),
            pointerEvents: "none",
          }}
        />
      )}
      {t < 0.4 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#0A0A0C",
            opacity: 1 - clamp(t / 0.4, 0, 1),
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
