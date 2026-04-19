import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

/**
 * 30-second Spring Sprint launch reel, designed to sit under a voiceover.
 *
 * Pacing principles
 *   - Minimal on-screen copy (2-4 words max) so the VO carries the story.
 *   - Every motion has a narrative reason: entrances cue "look here,"
 *     morphs explain "this becomes that," parallax keeps energy between cuts.
 *   - No element is static longer than ~0.8s. A persistent parallax backdrop
 *     (drifting grid + floating stickers) ties the scenes together so the
 *     frame never feels locked off.
 *
 * Scene map (frames @ 30fps, 900 total = 30s)
 *   0   -  90   S1  Hook — scattered quest cards drift, one rises to center
 *   90  - 240   S2  Complete the quest — progress fills, confetti, sticker
 *                   liftoff continues into next scene
 *   240 - 330   S3  Pivot — color bars sweep, die silhouette emerges
 *   330 - 510   S4  Spring Sprint board reveal
 *   510 - 690   S5  Mechanics rhythm — quest → die → pawn
 *   690 - 810   S6  Loop complete — sticker drop
 *   810 - 900   S7  CTA breath
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

function easeT(
  frame: number,
  start: number,
  end: number,
  easing = Easing.out(Easing.cubic)
) {
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
// Persistent backdrop — very slow parallax grid + drifting stickers. Sits
// underneath every scene so the frame always has life, even during beats.
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
      {/* Four deep-parallax stickers drift across the composition */}
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
        opacity: 0.55,
        filter: `blur(${1.2 * (1 - d)}px)`
      }}
    >
      {glyph}
    </div>
  );
}

// ---------------------------------------------------------------------------
// S1 — Hook (0-90f, 3s)
// Scattered quest cards drift, one lifts to the center.
// ---------------------------------------------------------------------------

const hookCards = [
  { x: 220, y: 220, rot: -6, bg: palette.yellow, title: "Finish lab", tag: "SCHOOL" },
  { x: 1400, y: 160, rot: 4, bg: palette.mint, title: "3 mile run", tag: "HEALTH" },
  { x: 180, y: 720, rot: 3, bg: palette.sky, title: "Call Grandma", tag: "SOCIAL" },
  { x: 1320, y: 760, rot: -4, bg: palette.pink, title: "Clean desk", tag: "LIFE" }
];

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 78, 90, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {hookCards.map((c, i) => {
        const t = springy(frame, fps, 6 + i * 4, { damping: 11 });
        const drift = Math.sin((frame + i * 20) / 35) * 8;
        const pullInto = easeT(frame, 62, 90);
        const dx = (960 - c.x - 180) * pullInto;
        const dy = (540 - c.y - 70) * pullInto;
        const shrink = 1 - pullInto * 0.7;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.x + dx,
              top: c.y + dy + drift,
              width: 360,
              padding: "20px 26px",
              border: `6px solid ${palette.ink}`,
              borderRadius: 16,
              background: c.bg,
              boxShadow: `9px 9px 0 ${palette.ink}`,
              transform: `rotate(${c.rot + pullInto * -c.rot * 0.5}deg) scale(${t * shrink})`,
              opacity: t * (1 - exit * 0.6)
            }}
          >
            <div
              style={{
                display: "inline-block",
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
            <div style={{ marginTop: 10, fontSize: 28, fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>
              {c.title}
            </div>
          </div>
        );
      })}

      {/* Center hero card that the scattered cards converge into */}
      <HeroCard frame={frame} fps={fps} />

      {/* Minimal label — the VO carries the explanation */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 120,
          padding: "8px 16px",
          border: `4px solid ${palette.ink}`,
          borderRadius: 999,
          background: palette.white,
          boxShadow: `4px 4px 0 ${palette.ink}`,
          fontSize: 22,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          opacity: easeT(frame, 6, 22),
          transform: `translateY(${(1 - easeT(frame, 6, 22)) * 16}px)`
        }}
      >
        Your quests
      </div>
    </AbsoluteFill>
  );
}

function HeroCard({ frame, fps }: { frame: number; fps: number }) {
  const appear = springy(frame, fps, 60, { damping: 11 });
  return (
    <div
      style={{
        position: "absolute",
        left: 960 - 240,
        top: 540 - 100,
        width: 480,
        padding: "24px 30px",
        border: `7px solid ${palette.ink}`,
        borderRadius: 18,
        background: palette.surface,
        boxShadow: `11px 11px 0 ${palette.ink}`,
        transform: `scale(${appear}) rotate(${(1 - appear) * -6}deg)`,
        opacity: appear
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          border: `3px solid ${palette.ink}`,
          borderRadius: 8,
          background: palette.red,
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: "0.1em",
          color: palette.ink
        }}
      >
        SCHOOL · 75 XP
      </div>
      <div style={{ marginTop: 14, fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
        Finish chem lab
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S2 — Complete + sticker (90-240f, 5s)
// ---------------------------------------------------------------------------

function SceneComplete() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardT = springy(frame, fps, 0, { damping: 12 });
  const progressStart = 28;
  const progressEnd = 68;
  const progress = interpolate(frame, [progressStart, progressEnd], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const cardFade = easeT(frame, 70, 96, Easing.in(Easing.cubic));
  const stickerT = springy(frame, fps, 72, { damping: 10, stiffness: 130 });
  const lift = easeT(frame, 108, 150, Easing.in(Easing.cubic));
  const stickerY = 540 - lift * 760;

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Quest card */}
      <div
        style={{
          position: "absolute",
          left: 960 - 360,
          top: 540 - 220,
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
        <div
          style={{
            display: "inline-block",
            padding: "6px 14px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 10,
            background: palette.sky,
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.1em"
          }}
        >
          SCHOOL · 75 XP
        </div>
        <div style={{ marginTop: 14, fontSize: 58, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Finish chem lab
        </div>
        <div
          style={{
            marginTop: 26,
            height: 32,
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.white,
            overflow: "hidden"
          }}
        >
          <div style={{ height: "100%", width: `${progress}%`, background: palette.red }} />
        </div>
      </div>

      {/* Sticker emerges and lifts off-screen to bridge into S3 */}
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

      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 120,
          padding: "10px 20px",
          border: `4px solid ${palette.ink}`,
          borderRadius: 999,
          background: palette.mint,
          boxShadow: `5px 5px 0 ${palette.ink}`,
          fontSize: 24,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          opacity: easeT(frame, 80, 108),
          transform: `translateY(${(1 - easeT(frame, 80, 108)) * 30}px)`
        }}
      >
        Clear → sticker
      </div>
    </AbsoluteFill>
  );
}

function Confetti({ frame, start, cx, cy }: { frame: number; start: number; cx: number; cy: number }) {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    angle: (i / 28) * Math.PI * 2,
    delay: (i % 6) * 1.2,
    rot: (i * 37) % 360,
    color: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink][i % 5],
    size: 16 + (i % 4) * 5,
    dist: 360 + ((i * 19) % 220)
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
// S3 — Pivot (240-330f, 3s)
// Color bars sweep across the frame, then a die silhouette forms. Signals
// "we are leaving the normal loop and entering the event."
// ---------------------------------------------------------------------------

function ScenePivot() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = [palette.yellow, palette.mint, palette.sky, palette.pink, palette.red];
  const dieT = springy(frame, fps, 50, { damping: 10, stiffness: 120 });
  const dieRot = frame * 6;

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink, overflow: "hidden" }}>
      {bars.map((bg, i) => {
        const delay = i * 3;
        const t = easeT(frame, delay, 28 + delay, Easing.out(Easing.cubic));
        const out = easeT(frame, 60 + delay, 86 + delay, Easing.in(Easing.cubic));
        const width = lerpW(t, out);
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

      {/* Big rotating die silhouette */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 320,
          height: 320,
          marginLeft: -160,
          marginTop: -160,
          border: `10px solid ${palette.ink}`,
          borderRadius: 32,
          background: palette.surface,
          boxShadow: `16px 16px 0 ${palette.ink}`,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          padding: 36,
          gap: 6,
          transform: `scale(${dieT}) rotate(${dieRot}deg)`
        }}
      >
        {renderPips(5)}
      </div>

      {/* Single-word cue */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "12%",
          transform: "translateX(-50%)",
          padding: "10px 20px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 12,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: easeT(frame, 42, 62)
        }}
      >
        NEW this month
      </div>
    </AbsoluteFill>
  );
}

function lerpW(enter: number, exit: number) {
  // Enter up to 1, exit back to 0
  return Math.max(0, enter * (1 - exit));
}

// ---------------------------------------------------------------------------
// S4 — Spring Sprint board reveal (330-510f, 6s)
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
  const titleT = springy(frame, fps, 40);
  const chipT = easeT(frame, 56, 74);

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "52%",
          transform: `translate(-50%, -50%) scale(${pushIn * boardT}) rotate(-0.5deg)`,
          width: 900,
          height: 900,
          padding: 16,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.paperDeep,
          boxShadow: `16px 16px 0 ${palette.ink}`
        }}
      >
        <MiniBoard frame={frame} pawnTile={0} revealFrame={4} />
      </div>

      {/* Big title only — the VO will name the event */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "9%",
          transform: `translateX(-50%) scale(${titleT})`,
          fontSize: 140,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          lineHeight: 0.9,
          color: palette.ink,
          textShadow: `6px 6px 0 ${palette.yellow}`,
          whiteSpace: "nowrap"
        }}
      >
        Spring Sprint
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "88%",
          transform: `translateX(-50%) translateY(${(1 - chipT) * 40}px)`,
          display: "flex",
          gap: 12,
          opacity: chipT
        }}
      >
        <div
          style={{
            padding: "10px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.red,
            color: palette.ink,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow: `6px 6px 0 ${palette.ink}`
          }}
        >
          Limited time
        </div>
        <div
          style={{
            padding: "10px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.yellow,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow: `6px 6px 0 ${palette.ink}`
          }}
        >
          26 tiles
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Mini Board — used in S4 and S6
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

      {/* Center panel */}
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
        <div style={{ fontSize: 72, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Loop<br />the board.
        </div>
      </div>

      {/* Pawn */}
      <div
        style={{
          position: "absolute",
          left: pawnPos.x,
          top: pawnPos.y,
          width: 60,
          height: 60,
          display: "grid",
          placeItems: "center",
          border: `5px solid ${palette.ink}`,
          borderRadius: "50%",
          background: palette.red,
          color: palette.white,
          fontSize: 18,
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
        <div style={{ textAlign: "center", fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Start 🏁 Finish
        </div>
      ) : tile.kind === "plain" ? (
        <div style={{ fontSize: 22, fontWeight: 900, opacity: 0.6, fontFamily: "ui-monospace, Menlo, monospace" }}>
          {index}
        </div>
      ) : (
        <div style={{ fontSize: 30 }}>{tile.glyph}</div>
      )}
    </div>
  );
}

function tilePath(): Array<{ x: number; y: number }> {
  // Card size = 900x900 with padding 10 + border 6, inner grid size ~868.
  const size = 868;
  const cellW = size / 8;
  const cellH = size / 8;
  const centerOf = (row: number, col: number | string) => {
    const c = typeof col === "string" ? 5 : col; // cols 4-6 midpoint = 5
    return {
      x: 16 + (c - 0.5) * cellW,
      y: 16 + (row - 0.5) * cellH
    };
  };
  return makeTiles().map((t) => centerOf(t.row, t.col));
}

// ---------------------------------------------------------------------------
// S5 — Mechanics rhythm (510-690f, 6s)
// Quest → Die → Pawn, told through morphs and focused motion.
// ---------------------------------------------------------------------------

function SceneMechanics() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Quest card shown (0-32)
  // Phase 2: Card morphs into die (28-64)
  // Phase 3: Die rolls and value lands (56-110)
  // Phase 4: Pawn walks across a mini strip (100-170)
  // Phase 5: Sticker preview at end (160-180)

  const cardT = springy(frame, fps, 2);
  const cardFade = easeT(frame, 28, 52, Easing.in(Easing.cubic));
  const dieAppear = springy(frame, fps, 30, { damping: 10, stiffness: 140 });
  const dieFade = easeT(frame, 108, 130, Easing.in(Easing.cubic));
  const dieX = -22 + (frame < 110 ? (frame - 30) * 10 : 700);
  const dieY = -28 + (frame < 110 ? (frame - 30) * 12 : 900);

  // Pawn strip (tiles shown as a 1D walk)
  const stripT = springy(frame, fps, 100, { damping: 12 });
  const stripExit = easeT(frame, 160, 180, Easing.in(Easing.cubic));
  const walkStart = 104;
  const stepPixels = 124;
  const pawnStep = interpolate(frame, [walkStart, walkStart + 50], [0, 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Quest card (phase 1 → fades) */}
      <div
        style={{
          position: "absolute",
          left: 960 - 240,
          top: 540 - 120,
          width: 480,
          padding: "22px 26px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          opacity: cardT * (1 - cardFade),
          transform: `scale(${cardT * (1 - cardFade * 0.4)}) rotate(${cardFade * 8}deg)`
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            border: `3px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.mint,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "0.1em"
          }}
        >
          CLEARED
        </div>
        <div style={{ marginTop: 12, fontSize: 42, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          One quest.
        </div>
      </div>

      {/* Morph transition bolt: a small burst at the morph moment */}
      {frame > 26 && frame < 40 ? <MorphFlash frame={frame} start={28} /> : null}

      {/* Die (appears during morph; dominates phase 3) */}
      {frame > 26 ? (
        <div
          style={{
            position: "absolute",
            left: 960 - 110,
            top: 540 - 110,
            width: 220,
            height: 220,
            perspective: 900,
            display: "grid",
            placeItems: "center",
            opacity: dieAppear * (1 - dieFade),
            transform: `scale(${dieAppear * (1 - dieFade * 0.5)})`
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateX(${dieX}deg) rotateY(${dieY}deg)`
            }}
          >
            {dieFaces.map((face) => (
              <div
                key={face.key}
                style={{
                  position: "absolute",
                  inset: 0,
                  border: `8px solid ${palette.ink}`,
                  borderRadius: 22,
                  background: palette.white,
                  transform: face.transform,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(3, 1fr)",
                  padding: 24,
                  gap: 4
                }}
              >
                {renderPips(face.value)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tile strip + pawn (phase 4) */}
      <div
        style={{
          position: "absolute",
          left: 960 - 380,
          top: 540 - 70,
          width: 760,
          height: 140,
          display: "flex",
          gap: 14,
          padding: 14,
          border: `6px solid ${palette.ink}`,
          borderRadius: 16,
          background: palette.paperDeep,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          transform: `translateY(${(1 - stripT) * 40}px) scale(${stripT * (1 - stripExit * 0.3)})`,
          opacity: stripT * (1 - stripExit)
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: i === 5 ? palette.yellow : i === 3 ? palette.mint : palette.surface,
              boxShadow: `3px 3px 0 ${palette.ink}`,
              fontSize: 24,
              fontWeight: 900
            }}
          >
            {i === 5 ? "🏁" : i}
          </div>
        ))}

        {/* Pawn on the strip */}
        <div
          style={{
            position: "absolute",
            left: 14 + 14 + pawnStep * (760 - 28) / 6 + (760 - 28) / 12 - 24,
            top: 70 - 24,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: palette.red,
            border: `4px solid ${palette.ink}`,
            boxShadow: `3px 3px 0 ${palette.ink}`,
            display: "grid",
            placeItems: "center",
            color: palette.white,
            fontSize: 14,
            fontWeight: 900,
            textTransform: "uppercase"
          }}
        >
          YOU
        </div>
      </div>

      {/* Three micro-labels spelling the loop */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 180,
          display: "flex",
          justifyContent: "center",
          gap: 70
        }}
      >
        {["Clear", "Roll", "Move"].map((w, i) => {
          const t = springy(frame, fps, 12 + i * 18, { damping: 11 });
          const bg = [palette.mint, palette.yellow, palette.sky][i];
          return (
            <div
              key={w}
              style={{
                padding: "14px 22px",
                border: `5px solid ${palette.ink}`,
                borderRadius: 14,
                background: bg,
                boxShadow: `7px 7px 0 ${palette.ink}`,
                fontSize: 44,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                transform: `translateY(${(1 - t) * 40}px) rotate(${(1 - t) * (i - 1) * 4}deg)`,
                opacity: t
              }}
            >
              {w}.
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function MorphFlash({ frame, start }: { frame: number; start: number }) {
  const t = easeT(frame, start, start + 10);
  const fade = easeT(frame, start + 6, start + 14, Easing.in(Easing.cubic));
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 200 + t * 260,
        height: 200 + t * 260,
        marginLeft: -(200 + t * 260) / 2,
        marginTop: -(200 + t * 260) / 2,
        borderRadius: "50%",
        border: `8px solid ${palette.ink}`,
        background: palette.yellow,
        opacity: (1 - fade) * 0.8
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// S6 — Loop complete + sticker drop (690-810f, 4s)
// ---------------------------------------------------------------------------

function SceneSticker() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardT = springy(frame, fps, 2, { damping: 12 });
  const boardSlide = interpolate(frame, [40, 72], [0, -120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic)
  });
  const stickerDrop = springy(frame, fps, 44, { damping: 8, stiffness: 110 });
  const stickerY = interpolate(stickerDrop, [0, 1], [-500, 0]);

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 720,
          height: 720,
          padding: 14,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.paperDeep,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          transform: `translate(-50%, -50%) translateX(${boardSlide}px) scale(${boardT})`
        }}
      >
        <MiniBoard frame={frame} pawnTile={0} revealFrame={0} />
      </div>

      {/* Sticker drops from top-right */}
      <div
        style={{
          position: "absolute",
          right: 220,
          top: 140 + stickerY,
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

      {/* Minimal descriptor */}
      <div
        style={{
          position: "absolute",
          right: 220,
          top: 520,
          width: 340,
          textAlign: "center",
          fontSize: 32,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1,
          opacity: easeT(frame, 70, 92)
        }}
      >
        Event sticker.<br />Yours.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S7 — CTA (810-900f, 3s)
// ---------------------------------------------------------------------------

function SceneCta() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = easeT(frame, 0, 16, Easing.out(Easing.cubic));
  const wordT = springy(frame, fps, 14, { damping: 11 });
  const urlT = springy(frame, fps, 30, { damping: 11 });

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        fontFamily: fontStack,
        color: palette.paper,
        overflow: "hidden"
      }}
    >
      {/* Wipe overlay transitions from previous cream scene */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.paper,
          clipPath: `polygon(0 0, ${100 - wipe * 100}% 0, ${100 - wipe * 100 + 15}% 100%, 0 100%)`
        }}
      />

      {/* Animated stripes */}
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
          gap: 30
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            transform: `scale(${wordT})`
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              display: "grid",
              placeItems: "center",
              border: `8px solid ${palette.ink}`,
              borderRadius: 18,
              background: palette.yellow,
              color: palette.ink,
              boxShadow: `11px 11px 0 ${palette.ink}`,
              fontSize: 80,
              fontWeight: 900
            }}
          >
            SQ
          </div>
          <div style={{ fontSize: 170, fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase" }}>
            SideQuest
          </div>
        </div>

        <div
          style={{
            padding: "18px 28px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.red,
            color: palette.ink,
            boxShadow: `10px 10px 0 ${palette.ink}`,
            fontSize: 38,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transform: `scale(${urlT})`
          }}
        >
          Dice Board · Live now
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Die 3D config (shared)
// ---------------------------------------------------------------------------

const dieFaces = [
  { key: "front", value: 1, transform: "translateZ(110px)" },
  { key: "back", value: 6, transform: "rotateY(180deg) translateZ(110px)" },
  { key: "top", value: 2, transform: "rotateX(90deg) translateZ(110px)" },
  { key: "bottom", value: 5, transform: "rotateX(-90deg) translateZ(110px)" },
  { key: "right", value: 3, transform: "rotateY(90deg) translateZ(110px)" },
  { key: "left", value: 4, transform: "rotateY(-90deg) translateZ(110px)" }
];

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
// Root 30s composition
// ---------------------------------------------------------------------------

export function SideQuestSpringReel() {
  return (
    <AbsoluteFill>
      <PersistentBackdrop />

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
    </AbsoluteFill>
  );
}
