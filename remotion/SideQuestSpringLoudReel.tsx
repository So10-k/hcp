import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

/**
 * 30-second Spring Sprint launch reel, loud version.
 *
 * Meant to play on its own (no voiceover). Because the text is the narration:
 *   - More detail per scene (dates, numbers, chip rows, reward strings).
 *   - Less repetition across scenes — each scene earns a unique message.
 *   - All motion lands on the music grid (120 BPM, 0.5s per beat = 15 frames).
 *   - SFX punctuate visual landings: click/whoosh/pop/ding/thud.
 *
 * Scene map (900 frames @ 30fps = 30s). Hard cuts on bar lines:
 *   0   - 90   (bar 0-2)   Hook — 5 quest cards → center
 *   90  - 240  (bar 2-5)   Clear + sticker unlock
 *   240 - 330  (bar 5-7)   Pivot — "This month only"
 *   330 - 510  (bar 7-10)  Spring Sprint board reveal
 *   510 - 690  (bar 10-13) Mechanics — Clear → Roll → Move
 *   690 - 810  (bar 13-15) Sticker drop
 *   810 - 900  (bar 15-17) CTA
 */

const palette = {
  ink: "#171512",
  paper: "#f8efd9",
  paperDeep: "#eadbb9",
  surface: "#fffaf0",
  white: "#ffffff",
  red: "#ff5a3d",
  yellow: "#ffd43d",
  mint: "#44d7a8",
  sky: "#5fc7f2",
  pink: "#ff78b7",
  blue: "#4667ff"
} as const;

const fontStack = '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function easeT(frame: number, start: number, end: number, easing = Easing.out(Easing.cubic)) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing
  });
}

function springy(
  frame: number,
  fps: number,
  delay = 0,
  config?: { mass?: number; stiffness?: number; damping?: number }
) {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { mass: 0.6, stiffness: 140, damping: 16, ...config }
  });
}

function bgGrid(opacity = 0.05, size = 60) {
  return {
    backgroundImage: `
      linear-gradient(90deg, rgba(23,21,18,${opacity}) 1px, transparent 1px),
      linear-gradient(180deg, rgba(23,21,18,${opacity}) 1px, transparent 1px)
    `,
    backgroundSize: `${size}px ${size}px`
  } as const;
}

// ---------------------------------------------------------------------------
// Backdrop (drifts under all scenes for continuity)
// ---------------------------------------------------------------------------

function PersistentBackdrop() {
  const frame = useCurrentFrame();
  const drift = frame * 0.9;
  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        ...bgGrid(0.05, 64),
        backgroundPosition: `${drift}px ${drift * 0.35}px`,
        overflow: "hidden"
      }}
    >
      <FloatingSticker x={-180} y={160} d={0.35} color={palette.pink} glyph="★" rot={-10} size={220} />
      <FloatingSticker x={1760} y={320} d={0.28} color={palette.sky} glyph="◆" rot={14} size={200} />
      <FloatingSticker x={160} y={820} d={0.22} color={palette.mint} glyph="✺" rot={-6} size={180} />
      <FloatingSticker x={1620} y={880} d={0.18} color={palette.yellow} glyph="⚡" rot={8} size={170} />
    </AbsoluteFill>
  );
}

function FloatingSticker({
  x, y, d, color, glyph, rot, size
}: {
  x: number;
  y: number;
  d: number;
  color: string;
  glyph: string;
  rot: number;
  size: number;
}) {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / 70) * 20 * d * 2;
  const dy = Math.cos(frame / 80) * 16 * d * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        border: `${Math.max(3, size / 22)}px solid ${palette.ink}`,
        borderRadius: size / 9,
        background: color,
        boxShadow: `${size / 18}px ${size / 18}px 0 ${palette.ink}`,
        transform: `rotate(${rot + Math.sin(frame / 60) * 3}deg)`,
        fontSize: size * 0.48,
        opacity: 0.5,
        filter: `blur(${1.2 * (1 - d)}px)`
      }}
    >
      {glyph}
    </div>
  );
}

// ---------------------------------------------------------------------------
// S1 Hook — 5 category cards converge; header + subhead
// ---------------------------------------------------------------------------

const hookCards = [
  { x: 200, y: 190, rot: -7, bg: palette.yellow, title: "Finish lab", tag: "SCHOOL", xp: 75 },
  { x: 1380, y: 140, rot: 4, bg: palette.mint, title: "3 mile run", tag: "HEALTH", xp: 100 },
  { x: 140, y: 700, rot: 3, bg: palette.sky, title: "Call Grandma", tag: "SOCIAL", xp: 50 },
  { x: 1320, y: 740, rot: -4, bg: palette.pink, title: "Inbox zero", tag: "LIFE", xp: 50 },
  { x: 780, y: 180, rot: 6, bg: palette.red, title: "Draft the pitch", tag: "CREATIVE", xp: 125 }
];

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Top header */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 90,
          display: "flex",
          gap: 12,
          alignItems: "center",
          opacity: easeT(frame, 4, 20),
          transform: `translateY(${(1 - easeT(frame, 4, 20)) * 16}px)`
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.white,
            boxShadow: `4px 4px 0 ${palette.ink}`,
            fontSize: 20,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.14em"
          }}
        >
          Your week
        </div>
        <div
          style={{
            padding: "8px 14px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.yellow,
            boxShadow: `4px 4px 0 ${palette.ink}`,
            fontSize: 20,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.14em"
          }}
        >
          5 lanes · 1 rhythm
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 150,
          fontSize: 96,
          fontWeight: 900,
          textTransform: "uppercase",
          lineHeight: 0.9,
          opacity: easeT(frame, 10, 28)
        }}
      >
        Quest by quest.
      </div>

      {hookCards.map((c, i) => {
        const t = springy(frame, fps, 6 + i * 3, { damping: 11 });
        const drift = Math.sin((frame + i * 20) / 35) * 8;
        const pullInto = easeT(frame, 60, 90);
        const dx = (960 - c.x - 180) * pullInto;
        const dy = (540 - c.y - 70) * pullInto;
        const shrink = 1 - pullInto * 0.75;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.x + dx,
              top: c.y + dy + drift,
              width: 360,
              padding: "18px 22px",
              border: `6px solid ${palette.ink}`,
              borderRadius: 16,
              background: c.bg,
              boxShadow: `9px 9px 0 ${palette.ink}`,
              transform: `rotate(${c.rot + pullInto * -c.rot * 0.5}deg) scale(${t * shrink})`,
              opacity: t * (1 - pullInto * 0.6)
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div
                style={{
                  padding: "3px 10px",
                  border: `3px solid ${palette.ink}`,
                  borderRadius: 8,
                  background: palette.white,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.1em"
                }}
              >
                {c.tag}
              </div>
              <div
                style={{
                  padding: "3px 10px",
                  border: `3px solid ${palette.ink}`,
                  borderRadius: 8,
                  background: palette.ink,
                  color: palette.yellow,
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: "0.08em"
                }}
              >
                {c.xp} XP
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>
              {c.title}
            </div>
          </div>
        );
      })}

      {/* Center hero card */}
      <HeroCard frame={frame} fps={fps} />
    </AbsoluteFill>
  );
}

function HeroCard({ frame, fps }: { frame: number; fps: number }) {
  const appear = springy(frame, fps, 62, { damping: 11 });
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - 260,
        top: 540 - 110,
        width: 520,
        padding: "24px 28px",
        border: `7px solid ${palette.ink}`,
        borderRadius: 18,
        background: palette.surface,
        boxShadow: `12px 12px 0 ${palette.ink}`,
        transform: `scale(${appear}) rotate(${(1 - appear) * -6}deg)`,
        opacity: appear
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            padding: "5px 12px",
            border: `3px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.red,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.08em"
          }}
        >
          SCHOOL
        </div>
        <div
          style={{
            padding: "5px 12px",
            border: `3px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.yellow,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.08em"
          }}
        >
          75 XP
        </div>
        <div
          style={{
            padding: "5px 12px",
            border: `3px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.sky,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.08em"
          }}
        >
          THIS WEEK
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 46, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
        Finish chem lab
      </div>
      <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, opacity: 0.72, lineHeight: 1.3 }}>
        Open rubric · 20 min sprint · Turn in
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S2 Complete — percentage ticker, reward string, sticker liftoff
// ---------------------------------------------------------------------------

function SceneComplete() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardT = springy(frame, fps, 0, { damping: 12 });
  const progress = interpolate(frame, [28, 68], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const cardFade = easeT(frame, 72, 96, Easing.in(Easing.cubic));
  const stickerT = springy(frame, fps, 72, { damping: 10, stiffness: 130 });
  const lift = easeT(frame, 108, 150, Easing.in(Easing.cubic));
  const stickerY = 540 - lift * 800;
  const rewardT = easeT(frame, 78, 100);

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Quest card */}
      <div
        style={{
          position: "absolute",
          left: 960 - 360,
          top: 540 - 240,
          width: 720,
          padding: "32px 40px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          opacity: cardT * (1 - cardFade),
          transform: `scale(${cardT * (1 - cardFade * 0.4)}) translateY(${cardFade * -60}px)`
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              padding: "6px 14px",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.sky,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em"
            }}
          >
            SCHOOL · 75 XP
          </div>
          <div
            style={{
              padding: "6px 14px",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.mint,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em"
            }}
          >
            IN PROGRESS
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 56, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Finish chem lab
        </div>

        {/* Progress bar + counter */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
          <div
            style={{
              flex: 1,
              height: 30,
              border: `5px solid ${palette.ink}`,
              borderRadius: 999,
              background: palette.white,
              overflow: "hidden"
            }}
          >
            <div style={{ height: "100%", width: `${progress}%`, background: palette.red }} />
          </div>
          <div
            style={{
              minWidth: 110,
              textAlign: "right",
              fontSize: 42,
              fontWeight: 900,
              fontFamily: "ui-monospace, Menlo, monospace"
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Sticker liftoff */}
      <div
        style={{
          position: "absolute",
          left: 960 - 170,
          top: stickerY - 170,
          width: 340,
          height: 340,
          display: "grid",
          placeItems: "center",
          border: `8px solid ${palette.ink}`,
          borderRadius: "50%",
          background: `radial-gradient(circle at 32% 28%, #fff4c0 0 22%, ${palette.yellow} 22% 100%)`,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          fontSize: 200,
          transform: `scale(${stickerT}) rotate(${(1 - stickerT) * -20 + lift * 40}deg)`,
          opacity: stickerT
        }}
      >
        ★
      </div>

      <Confetti frame={frame} start={64} cx={960} cy={540} />

      {/* Reward unlock banner */}
      <div
        style={{
          position: "absolute",
          left: 960 - 260,
          top: 860,
          width: 520,
          padding: "14px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.mint,
          boxShadow: `7px 7px 0 ${palette.ink}`,
          textAlign: "center",
          opacity: rewardT,
          transform: `translateY(${(1 - rewardT) * 30}px)`
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>
          Reward unlocked
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1 }}>
          ★ School sticker
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Confetti({ frame, start, cx, cy }: { frame: number; start: number; cx: number; cy: number }) {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    angle: (i / 30) * Math.PI * 2,
    delay: (i % 6) * 1.2,
    rot: (i * 37) % 360,
    color: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink][i % 5],
    size: 16 + (i % 4) * 5,
    dist: 380 + ((i * 19) % 220)
  }));
  return (
    <>
      {pieces.map((p) => {
        const local = frame - start - p.delay;
        const t = interpolate(local, [0, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t === 0) return null;
        const fade = interpolate(local, [22, 52], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const dx = Math.cos(p.angle) * p.dist * t;
        const dy = Math.sin(p.angle) * p.dist * t - 60 * (1 - t) + 180 * t * t;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: cx + dx,
              top: cy + dy,
              width: p.size,
              height: p.size * 0.62,
              background: p.color,
              border: `3px solid ${palette.ink}`,
              borderRadius: 4,
              transform: `rotate(${p.rot + t * 520}deg)`,
              opacity: fade
            }}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// S3 Pivot — "This month only" with dates, die silhouette
// ---------------------------------------------------------------------------

function ScenePivot() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = [palette.yellow, palette.mint, palette.sky, palette.pink, palette.red];
  const dieT = springy(frame, fps, 46, { damping: 10, stiffness: 120 });
  const dieRot = frame * 6;
  const dateT = easeT(frame, 40, 60);

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink, overflow: "hidden" }}>
      {bars.map((bg, i) => {
        const delay = i * 3;
        const t = easeT(frame, delay, 28 + delay, Easing.out(Easing.cubic));
        const out = easeT(frame, 60 + delay, 86 + delay, Easing.in(Easing.cubic));
        const width = Math.max(0, t * (1 - out));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 20)}%`,
              top: 0,
              width: "22%",
              height: "100%",
              background: bg,
              borderRight: `6px solid ${palette.ink}`,
              transform: `scaleX(${width}) translateX(${(1 - width) * -200}px)`,
              transformOrigin: "left center"
            }}
          />
        );
      })}

      {/* Center die */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 280,
          height: 280,
          marginLeft: -140,
          marginTop: -140,
          border: `10px solid ${palette.ink}`,
          borderRadius: 28,
          background: palette.surface,
          boxShadow: `16px 16px 0 ${palette.ink}`,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          padding: 32,
          gap: 4,
          transform: `scale(${dieT}) rotate(${dieRot}deg)`
        }}
      >
        {renderPips(5)}
      </div>

      {/* Top pill: "This month only" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "12%",
          transform: "translateX(-50%)",
          padding: "12px 22px",
          border: `6px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          boxShadow: `8px 8px 0 rgba(23,21,18,0.25)`,
          opacity: easeT(frame, 36, 56)
        }}
      >
        · This Month Only ·
      </div>

      {/* Date range strip */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "14%",
          transform: `translateX(-50%) translateY(${(1 - dateT) * 40}px)`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: dateT
        }}
      >
        {["Apr 14", "→", "Apr 30"].map((label, i) => (
          <div
            key={i}
            style={{
              padding: "12px 18px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 12,
              background: i === 1 ? "transparent" : palette.yellow,
              boxShadow: i === 1 ? "none" : `6px 6px 0 ${palette.ink}`,
              fontSize: 34,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em"
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S4 Spring Sprint board reveal — title, subtitle, chip row, LTE tag
// ---------------------------------------------------------------------------

function SceneBoardReveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardT = springy(frame, fps, 4, { damping: 12 });
  const pushIn = interpolate(frame, [10, 90], [0.8, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic)
  });
  const titleT = springy(frame, fps, 38);
  const subT = easeT(frame, 56, 78);
  const chips = ["26 tiles", "4 jumps", "4 slips", "1 sticker"];

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "54%",
          transform: `translate(-50%, -50%) scale(${pushIn * boardT}) rotate(-0.5deg)`,
          width: 820,
          height: 820,
          padding: 14,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.paperDeep,
          boxShadow: `16px 16px 0 ${palette.ink}`
        }}
      >
        <MiniBoard frame={frame} pawnTile={0} revealFrame={4} />
      </div>

      {/* LTE tag above title */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "6%",
          transform: `translateX(-50%) scale(${titleT})`,
          padding: "8px 18px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 999,
          background: palette.red,
          color: palette.ink,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          boxShadow: `5px 5px 0 ${palette.ink}`
        }}
      >
        Limited Time Event
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "11%",
          transform: `translateX(-50%) scale(${titleT})`,
          fontSize: 126,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          lineHeight: 0.9,
          textShadow: `6px 6px 0 ${palette.yellow}`,
          whiteSpace: "nowrap"
        }}
      >
        Spring Sprint
      </div>

      {/* Subhead */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "20.5%",
          transform: `translateX(-50%) translateY(${(1 - subT) * 20}px)`,
          fontSize: 32,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          opacity: subT
        }}
      >
        The dice board is live.
      </div>

      {/* Chip row at bottom */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "91%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12
        }}
      >
        {chips.map((c, i) => {
          const t = springy(frame, fps, 70 + i * 5, { damping: 11 });
          const bg = [palette.yellow, palette.mint, palette.pink, palette.sky][i];
          return (
            <div
              key={c}
              style={{
                padding: "10px 18px",
                border: `5px solid ${palette.ink}`,
                borderRadius: 999,
                background: bg,
                boxShadow: `6px 6px 0 ${palette.ink}`,
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transform: `scale(${t})`,
                opacity: t
              }}
            >
              {c}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Mini Board
// ---------------------------------------------------------------------------

type Tile = { kind: "start" | "corner" | "forward" | "back" | "plain"; row: number; col: number | string; glyph?: string };

function makeTiles(): Tile[] {
  const PATH: Array<[number, number | string]> = [
    [1, "4 / span 3"],
    [1, 7], [1, 8],
    [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],
    [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],
    [7, 1], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1],
    [1, 2], [1, 3]
  ];
  const CORNERS = new Set([2, 9, 16, 23]);
  const FORWARDS = new Set([4, 8, 13, 18]);
  const BACKS = new Set([6, 11, 15, 20]);
  return PATH.map(([row, col], i) => {
    if (i === 0) return { kind: "start", row, col, glyph: "🏁" };
    if (CORNERS.has(i)) return { kind: "corner", row, col, glyph: "◆" };
    if (FORWARDS.has(i)) return { kind: "forward", row, col, glyph: "→" };
    if (BACKS.has(i)) return { kind: "back", row, col, glyph: "←" };
    return { kind: "plain", row, col };
  });
}

function MiniBoard({ frame, pawnTile, revealFrame }: { frame: number; pawnTile: number; revealFrame: number }) {
  const tiles = makeTiles();
  const positions = tilePath();
  const pawnPos = positions[pawnTile];
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridTemplateRows: "repeat(8, 1fr)",
        gap: 10,
        padding: 10,
        border: `4px solid ${palette.ink}`,
        borderRadius: 14,
        background: palette.paper
      }}
    >
      {tiles.map((tile, i) => {
        const reveal = springy(frame, 30, revealFrame + i * 1.2, { damping: 11, stiffness: 150 });
        return <MiniTile key={i} tile={tile} index={i} reveal={reveal} current={i === pawnTile} frame={frame} />;
      })}

      <div
        style={{
          gridColumn: "2 / span 6",
          gridRow: "2 / span 6",
          display: "grid",
          placeItems: "center",
          padding: 22,
          border: `4px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.surface,
          textAlign: "center",
          transform: `scale(${springy(frame, 30, revealFrame + 20, { damping: 11 })})`
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.16em", opacity: 0.65 }}>
          Event board
        </div>
        <div style={{ marginTop: 10, fontSize: 64, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Complete<br />the loop.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: pawnPos.x,
          top: pawnPos.y,
          width: 54,
          height: 54,
          display: "grid",
          placeItems: "center",
          border: `5px solid ${palette.ink}`,
          borderRadius: "50%",
          background: palette.red,
          color: palette.white,
          fontSize: 16,
          fontWeight: 900,
          boxShadow: `4px 4px 0 ${palette.ink}`,
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame / 6) * 0.05})`,
          zIndex: 4,
          textTransform: "uppercase"
        }}
      >
        YOU
      </div>
    </div>
  );
}

function MiniTile({
  tile, index, reveal, current, frame
}: { tile: Tile; index: number; reveal: number; current: boolean; frame: number }) {
  const bg =
    tile.kind === "start"
      ? palette.yellow
      : tile.kind === "corner"
        ? palette.sky
        : tile.kind === "forward"
          ? palette.mint
          : tile.kind === "back"
            ? palette.pink
            : palette.surface;
  const pulse = current ? 1 + Math.sin(frame / 5) * 0.04 : 1;

  return (
    <div
      style={{
        gridRow: tile.row,
        gridColumn: typeof tile.col === "string" ? tile.col : tile.col,
        padding: 6,
        border: `4px solid ${palette.ink}`,
        borderRadius: 10,
        background: bg,
        boxShadow: `4px 4px 0 ${palette.ink}`,
        display: "grid",
        placeItems: "center",
        outline: current ? `4px solid ${palette.blue}` : undefined,
        outlineOffset: current ? 2 : 0,
        transform: `scale(${reveal * pulse})`,
        opacity: reveal,
        position: "relative"
      }}
    >
      {tile.kind === "start" ? (
        <div style={{ textAlign: "center", fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Start 🏁 Finish
        </div>
      ) : tile.kind === "plain" ? (
        <div style={{ fontSize: 22, fontWeight: 900, opacity: 0.6, fontFamily: "ui-monospace, Menlo, monospace" }}>
          {index}
        </div>
      ) : (
        <div style={{ fontSize: 28 }}>{tile.glyph}</div>
      )}
    </div>
  );
}

function tilePath(): Array<{ x: number; y: number }> {
  const size = 792; // 820 - 14*2 padding - 6*2 border
  const cellW = size / 8;
  const cellH = size / 8;
  const centerOf = (row: number, col: number | string) => {
    const c = typeof col === "string" ? 5 : col;
    return {
      x: 20 + (c - 0.5) * cellW,
      y: 20 + (row - 0.5) * cellH
    };
  };
  return makeTiles().map((t) => centerOf(t.row, t.col));
}

// ---------------------------------------------------------------------------
// S5 Mechanics — 3 steps labeled, with bottom summary banner
// ---------------------------------------------------------------------------

function SceneMechanics() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    {
      bg: palette.mint,
      title: "Complete",
      sub: "Any quest · any lane",
      glyph: "✓"
    },
    {
      bg: palette.yellow,
      title: "Roll",
      sub: "1 die · 1 to 6",
      glyph: "⚂"
    },
    {
      bg: palette.sky,
      title: "Move",
      sub: "Jump · slip · corner",
      glyph: "→"
    }
  ];

  const headerT = easeT(frame, 2, 20);
  const bottomT = springy(frame, fps, 120, { damping: 11, stiffness: 150 });

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 120,
          opacity: headerT,
          transform: `translateY(${(1 - headerT) * 20}px)`
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>
          The loop
        </div>
        <div style={{ fontSize: 92, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.92 }}>
          Three moves.
        </div>
      </div>

      {/* Three step cards */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 380,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 30
        }}
      >
        {steps.map((s, i) => {
          const t = springy(frame, fps, 30 + i * 16, { damping: 10, stiffness: 140 });
          return (
            <div
              key={s.title}
              style={{
                padding: "28px 30px",
                border: `7px solid ${palette.ink}`,
                borderRadius: 18,
                background: s.bg,
                boxShadow: `10px 10px 0 ${palette.ink}`,
                transform: `translateY(${(1 - t) * 60}px) scale(${0.92 + t * 0.08}) rotate(${(1 - t) * (i - 1) * 3}deg)`,
                opacity: t
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75 }}>
                Step {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ marginTop: 8, fontSize: 86, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.9 }}>
                {s.title}
              </div>
              <div style={{ marginTop: 10, fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.sub}
              </div>
              <div style={{ marginTop: 18, fontSize: 92, lineHeight: 1 }}>{s.glyph}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom summary banner */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 120,
          padding: "22px 32px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 16,
          background: palette.ink,
          color: palette.yellow,
          boxShadow: `10px 10px 0 ${palette.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          fontSize: 40,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          transform: `translateY(${(1 - bottomT) * 60}px) scale(${bottomT})`,
          opacity: bottomT
        }}
      >
        <span>Finish the loop →</span>
        <span style={{ color: palette.paper }}>Earn the sticker.</span>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S6 Sticker drop — sticker + detail
// ---------------------------------------------------------------------------

function SceneSticker() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardT = springy(frame, fps, 2, { damping: 12 });
  const boardSlide = interpolate(frame, [40, 72], [0, -240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic)
  });
  const stickerDrop = springy(frame, fps, 44, { damping: 8, stiffness: 110 });
  const stickerY = interpolate(stickerDrop, [0, 1], [-500, 0]);
  const detailT = easeT(frame, 72, 100);
  const earnedT = easeT(frame, 84, 108);

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Small board slides off to make room */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 680,
          height: 680,
          padding: 12,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.paperDeep,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          transform: `translate(-50%, -50%) translateX(${boardSlide}px) scale(${boardT})`
        }}
      >
        <MiniBoard frame={frame} pawnTile={0} revealFrame={0} />
      </div>

      {/* Sticker */}
      <div
        style={{
          position: "absolute",
          right: 240,
          top: 120 + stickerY,
          width: 340,
          height: 340,
          display: "grid",
          placeItems: "center",
          border: `10px solid ${palette.ink}`,
          borderRadius: "50%",
          background: `radial-gradient(circle at 32% 28%, #fff4c0 0 22%, ${palette.yellow} 22% 100%)`,
          boxShadow: `16px 16px 0 ${palette.ink}`,
          fontSize: 220,
          transform: `rotate(${-20 + stickerDrop * 20}deg)`,
          opacity: stickerDrop
        }}
      >
        ★
      </div>

      {/* Detail column */}
      <div
        style={{
          position: "absolute",
          right: 240,
          top: 500,
          width: 340,
          display: "grid",
          gap: 14,
          justifyItems: "center",
          textAlign: "center",
          opacity: detailT,
          transform: `translateY(${(1 - detailT) * 30}px)`
        }}
      >
        <div
          style={{
            padding: "8px 16px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.ink,
            color: palette.yellow,
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase"
          }}
        >
          Spring Sprint · Badge
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 0.95
          }}
        >
          ★ Sticker<br />unlocked
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.7
          }}
        >
          Pinned to your shelf
        </div>
      </div>

      {/* Left-side callouts */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 220,
          display: "grid",
          gap: 14,
          opacity: earnedT,
          transform: `translateX(${(1 - earnedT) * -40}px)`
        }}
      >
        <div
          style={{
            padding: "10px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.mint,
            boxShadow: `5px 5px 0 ${palette.ink}`,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}
        >
          26 tiles looped
        </div>
        <div
          style={{
            padding: "10px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.sky,
            boxShadow: `5px 5px 0 ${palette.ink}`,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}
        >
          1 sticker earned
        </div>
        <div
          style={{
            padding: "10px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.pink,
            boxShadow: `5px 5px 0 ${palette.ink}`,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}
        >
          Event complete
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S7 CTA — URL + date range + live tag
// ---------------------------------------------------------------------------

function SceneCta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = easeT(frame, 0, 16, Easing.out(Easing.cubic));
  const wordT = springy(frame, fps, 14, { damping: 11 });
  const urlT = springy(frame, fps, 28, { damping: 11 });
  const dateT = easeT(frame, 46, 70);
  const livePulse = 1 + Math.sin(frame / 4) * 0.05;

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        fontFamily: fontStack,
        color: palette.paper,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.paper,
          clipPath: `polygon(0 0, ${100 - wipe * 100}% 0, ${100 - wipe * 100 + 15}% 100%, 0 100%)`
        }}
      />

      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${i * 16}%`,
            height: "1.5%",
            background: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink, palette.yellow][i],
            transform: `translateX(${Math.sin((frame + i * 10) / 30) * 20}px)`,
            opacity: 0.5
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26
        }}
      >
        {/* LIVE tag */}
        <div
          style={{
            padding: "10px 22px",
            border: `5px solid ${palette.paper}`,
            borderRadius: 999,
            background: palette.red,
            color: palette.ink,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            boxShadow: `6px 6px 0 ${palette.paper}`,
            transform: `scale(${livePulse})`,
            opacity: wordT
          }}
        >
          · Live Now ·
        </div>

        {/* Logo lockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            transform: `scale(${wordT})`
          }}
        >
          <div
            style={{
              width: 126,
              height: 126,
              display: "grid",
              placeItems: "center",
              border: `7px solid ${palette.ink}`,
              borderRadius: 18,
              background: palette.yellow,
              color: palette.ink,
              boxShadow: `11px 11px 0 ${palette.ink}`,
              fontSize: 72,
              fontWeight: 900
            }}
          >
            SQ
          </div>
          <div style={{ fontSize: 158, fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase" }}>
            SideQuest
          </div>
        </div>

        {/* URL CTA */}
        <div
          style={{
            padding: "18px 32px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.yellow,
            color: palette.ink,
            boxShadow: `10px 10px 0 ${palette.ink}`,
            fontSize: 46,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transform: `scale(${urlT})`
          }}
        >
          sidequester.us / gameboard-ltd
        </div>

        {/* Date range */}
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            opacity: dateT,
            transform: `translateY(${(1 - dateT) * 24}px)`
          }}
        >
          {["Apr 14", "→", "Apr 30", "·", "1 sticker drop"].map((l, i) => (
            <div
              key={i}
              style={{
                padding: "8px 14px",
                border: i === 1 || i === 3 ? "none" : `4px solid ${palette.paper}`,
                borderRadius: 10,
                background: i === 1 || i === 3 ? "transparent" : "rgba(248,239,217,0.08)",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase"
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Die faces (shared)
// ---------------------------------------------------------------------------

function renderPips(value: number) {
  const positions: Record<number, Array<[number, number]>> = {
    1: [[2, 2]],
    2: [[1, 1], [3, 3]],
    3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [1, 3], [3, 1], [3, 3]],
    5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
    6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]]
  };
  return positions[value].map(([row, col], i) => (
    <div
      key={i}
      style={{
        gridRow: row,
        gridColumn: col,
        alignSelf: "center",
        justifySelf: "center",
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: palette.ink,
        boxShadow: "inset -2px -2px 0 rgba(255,255,255,0.22)"
      }}
    />
  ));
}

// ---------------------------------------------------------------------------
// Root — 30s composition with music + SFX layered on beat grid
// ---------------------------------------------------------------------------

export function SideQuestSpringLoudReel() {
  return (
    <AbsoluteFill>
      <PersistentBackdrop />

      {/* Music bed runs the full 30s */}
      <Audio src={staticFile("spring-bed.wav")} volume={0.55} />

      {/* Scenes */}
      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <SceneComplete />
      </Sequence>
      <Sequence from={240} durationInFrames={90}>
        <ScenePivot />
      </Sequence>
      <Sequence from={330} durationInFrames={180}>
        <SceneBoardReveal />
      </Sequence>
      <Sequence from={510} durationInFrames={180}>
        <SceneMechanics />
      </Sequence>
      <Sequence from={690} durationInFrames={120}>
        <SceneSticker />
      </Sequence>
      <Sequence from={810} durationInFrames={90}>
        <SceneCta />
      </Sequence>

      {/* SFX hits — every one is tied to a specific visual landing */}
      {/* S1: convergence whoosh + hero thud */}
      <Sequence from={60} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={80} durationInFrames={10}>
        <Audio src={staticFile("thud.wav")} volume={0.7} />
      </Sequence>

      {/* S2: progress bar click, sticker appear ding, liftoff whoosh */}
      <Sequence from={120} durationInFrames={6}>
        <Audio src={staticFile("click.wav")} volume={0.75} />
      </Sequence>
      <Sequence from={160} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={210} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.4} />
      </Sequence>

      {/* S3: sweep bars + die thud */}
      <Sequence from={242} durationInFrames={18}>
        <Audio src={staticFile("whoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={286} durationInFrames={10}>
        <Audio src={staticFile("thud.wav")} volume={0.75} />
      </Sequence>

      {/* S4: reveal thud + title pop + chip pops */}
      <Sequence from={334} durationInFrames={16}>
        <Audio src={staticFile("thud.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={370} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={400} durationInFrames={14}>
        <Audio src={staticFile("pop.wav")} volume={0.45} />
      </Sequence>
      <Sequence from={470} durationInFrames={10}>
        <Audio src={staticFile("click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={475} durationInFrames={10}>
        <Audio src={staticFile("click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={480} durationInFrames={10}>
        <Audio src={staticFile("click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={485} durationInFrames={10}>
        <Audio src={staticFile("click.wav")} volume={0.6} />
      </Sequence>

      {/* S5: cut whoosh + step landings (complete / roll / move) + summary thud */}
      <Sequence from={510} durationInFrames={18}>
        <Audio src={staticFile("whoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={540} durationInFrames={10}>
        <Audio src={staticFile("pop.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={556} durationInFrames={10}>
        <Audio src={staticFile("pop.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={572} durationInFrames={10}>
        <Audio src={staticFile("pop.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={630} durationInFrames={12}>
        <Audio src={staticFile("thud.wav")} volume={0.7} />
      </Sequence>

      {/* S6: board slide whoosh + sticker drop ding */}
      <Sequence from={708} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.45} />
      </Sequence>
      <Sequence from={735} durationInFrames={30}>
        <Audio src={staticFile("ding.wav")} volume={0.75} />
      </Sequence>

      {/* S7: final wipe whoosh + live ding */}
      <Sequence from={810} durationInFrames={18}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={838} durationInFrames={30}>
        <Audio src={staticFile("ding.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
}
