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
 * 25-second first-time tutorial reel for the /gameboard-ltd event page.
 *
 * Structure (750 frames @ 30fps):
 *    0  - 90   S0 Hook ("Spring Sprint · How it works")
 *   90  - 270  S1 Step 01 — Complete a quest (card → progress → check)
 *  270  - 450  S2 Step 02 — Roll the die (cursor → button → 3D die)
 *  450  - 630  S3 Step 03 — Walk the board closer to the sticker
 *  630  - 750  S4 Outro (sticker bloom + center-fade that the custom
 *                video player dissolves in sync with)
 *
 * The last ~36 frames (1.2s) perform a radial collapse: all content
 * scales + fades into the center. The custom <TutorialPlayer> listens
 * to `timeupdate` and triggers its own collapse over the same window
 * so the two dissolves read as one continuous animation.
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
// Backdrop
// ---------------------------------------------------------------------------

function TutorialBackdrop() {
  const frame = useCurrentFrame();
  const drift = frame * 0.8;
  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        ...bgGrid(0.05, 64),
        backgroundPosition: `${drift}px ${drift * 0.3}px`,
        overflow: "hidden"
      }}
    >
      <DriftSticker x={-140} y={200} color={palette.pink} glyph="★" rot={-8} size={180} phase={0} />
      <DriftSticker x={1700} y={280} color={palette.sky} glyph="◆" rot={10} size={170} phase={1} />
      <DriftSticker x={120} y={780} color={palette.mint} glyph="✺" rot={-6} size={160} phase={2} />
      <DriftSticker x={1640} y={840} color={palette.yellow} glyph="⚡" rot={6} size={150} phase={3} />
    </AbsoluteFill>
  );
}

function DriftSticker({
  x, y, color, glyph, rot, size, phase
}: {
  x: number; y: number; color: string; glyph: string; rot: number; size: number; phase: number;
}) {
  const frame = useCurrentFrame();
  const dx = Math.sin((frame + phase * 30) / 70) * 16;
  const dy = Math.cos((frame + phase * 40) / 80) * 12;
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
        transform: `rotate(${rot + Math.sin(frame / 55) * 2.5}deg)`,
        fontSize: size * 0.48,
        opacity: 0.5
      }}
    >
      {glyph}
    </div>
  );
}

// ---------------------------------------------------------------------------
// S0 — Hook
// ---------------------------------------------------------------------------

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tagT = springy(frame, fps, 2);
  const titleT = springy(frame, fps, 10, { damping: 11 });
  const subT = easeT(frame, 30, 50);
  const exit = easeT(frame, 78, 90, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.06})`,
        opacity: 1 - exit
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", gap: 22 }}>
        <div
          style={{
            padding: "12px 24px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.red,
            color: palette.ink,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            boxShadow: `7px 7px 0 ${palette.ink}`,
            transform: `scale(${tagT})`
          }}
        >
          Welcome · Spring Sprint
        </div>

        <div
          style={{
            fontSize: 166,
            fontWeight: 900,
            textTransform: "uppercase",
            lineHeight: 0.9,
            textAlign: "center",
            letterSpacing: "-0.01em",
            textShadow: `7px 7px 0 ${palette.yellow}`,
            transform: `scale(${titleT})`
          }}
        >
          How it works.
        </div>

        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: subT,
            transform: `translateY(${(1 - subT) * 24}px)`
          }}
        >
          3 steps · 30 seconds · 1 sticker
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Shared step header: big "STEP 01" number + title on cream background
// ---------------------------------------------------------------------------

function StepHeader({
  number, title, tint
}: { number: string; title: string; tint: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const numT = springy(frame, fps, 4, { damping: 11, stiffness: 130 });
  const titleT = springy(frame, fps, 12, { damping: 12 });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 120,
          padding: "14px 28px",
          border: `6px solid ${palette.ink}`,
          borderRadius: 14,
          background: tint,
          color: palette.ink,
          fontSize: 40,
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          boxShadow: `8px 8px 0 ${palette.ink}`,
          transform: `scale(${numT})`
        }}
      >
        Step {number}
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 220,
          fontSize: 120,
          fontWeight: 900,
          lineHeight: 0.92,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          maxWidth: 1700,
          transform: `translateY(${(1 - titleT) * 30}px)`,
          opacity: titleT
        }}
      >
        {title}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// S1 — Complete a quest
// ---------------------------------------------------------------------------

function SceneStep1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardT = springy(frame, fps, 30, { damping: 12 });
  const progress = interpolate(frame, [52, 110], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const checkT = springy(frame, fps, 110, { damping: 8, stiffness: 140 });
  const captionT = easeT(frame, 120, 138);
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="01" title="Complete a quest." tint={palette.mint} />

      {/* Quest card */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 480,
          width: 1100,
          padding: "30px 36px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 20,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `translateY(${(1 - cardT) * 50}px) scale(${cardT})`,
          opacity: cardT
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              padding: "6px 14px",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.sky,
              fontSize: 20,
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
              background: palette.yellow,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.08em"
            }}
          >
            THIS WEEK
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 58, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Finish chem lab write-up
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 28 }}>
          <div
            style={{
              flex: 1,
              height: 34,
              border: `5px solid ${palette.ink}`,
              borderRadius: 999,
              background: palette.white,
              overflow: "hidden"
            }}
          >
            <div style={{ height: "100%", width: `${progress}%`, background: palette.red }} />
          </div>
          <div style={{ minWidth: 130, textAlign: "right", fontSize: 44, fontWeight: 900, fontFamily: "ui-monospace, Menlo, monospace" }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Checkmark stamp */}
      {frame > 108 ? (
        <div
          style={{
            position: "absolute",
            right: 160,
            top: 460,
            width: 220,
            height: 220,
            display: "grid",
            placeItems: "center",
            border: `8px solid ${palette.ink}`,
            borderRadius: "50%",
            background: palette.mint,
            color: palette.ink,
            boxShadow: `12px 12px 0 ${palette.ink}`,
            fontSize: 160,
            lineHeight: 1,
            transform: `scale(${checkT}) rotate(${(1 - checkT) * -30 + (checkT - 1) * 12}deg)`
          }}
        >
          ✓
        </div>
      ) : null}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 140,
          padding: "14px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        Every quest = 1 die roll.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S2 — Roll the die (cursor + button + 3D die)
// ---------------------------------------------------------------------------

function SceneStep2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cursor moves from bottom-right to the Roll button (center ~960, 700),
  // clicks at frame 68, die then appears + tumbles.
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const clickScale = interpolate(frame, [64, 70, 76], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const dieAppear = springy(frame, fps, 76, { damping: 10, stiffness: 120 });
  const dieRotX = -22 + (frame - 76) * 14;
  const dieRotY = -28 + (frame - 76) * 18;
  const captionT = easeT(frame, 130, 152);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="02" title="Roll the die." tint={palette.yellow} />

      {/* Roll button */}
      <div
        style={{
          position: "absolute",
          left: 960 - 200,
          top: 700 - 60,
          width: 400,
          height: 120,
          display: "grid",
          placeItems: "center",
          border: `7px solid ${palette.ink}`,
          borderRadius: 16,
          background: palette.red,
          color: palette.ink,
          fontSize: 46,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `scale(${clickScale}) translateY(${easeT(frame, 30, 48) === 0 ? 40 : 0}px)`,
          opacity: easeT(frame, 24, 44)
        }}
      >
        Roll Die
      </div>

      {/* Cursor */}
      <Cursor
        frame={frame}
        fps={fps}
        path={[
          { f: 24, x: 1780, y: 1020 },
          { f: 60, x: 956, y: 698 },
          { f: 68, x: 956, y: 698, click: true },
          { f: 78, x: 956, y: 698 },
          { f: 100, x: 1400, y: 900 }
        ]}
      />

      {/* 3D die, appears after click, rotates continuously, then settles */}
      {frame > 74 ? (
        <div
          style={{
            position: "absolute",
            left: 960 - 130,
            top: 480,
            width: 260,
            height: 260,
            perspective: 900,
            display: "grid",
            placeItems: "center",
            opacity: dieAppear,
            transform: `scale(${dieAppear})`
          }}
        >
          <div
            style={{
              width: 260,
              height: 260,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateX(${dieRotX}deg) rotateY(${dieRotY}deg)`
            }}
          >
            {dieFaces.map((face) => (
              <div
                key={face.key}
                style={{
                  position: "absolute",
                  inset: 0,
                  border: `9px solid ${palette.ink}`,
                  borderRadius: 26,
                  background: palette.white,
                  transform: face.transform,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(3, 1fr)",
                  padding: 28,
                  gap: 4
                }}
              >
                {renderPips(face.value)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 140,
          padding: "14px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        1 to 6 · your move.
      </div>
    </AbsoluteFill>
  );
}

// Cursor helper
type Waypoint = { f: number; x: number; y: number; click?: boolean };

function Cursor({ frame, fps, path }: { frame: number; fps: number; path: Waypoint[] }) {
  let x = path[0].x;
  let y = path[0].y;
  let clicking = false;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      const eased = Easing.inOut(Easing.cubic)(t);
      x = a.x + (b.x - a.x) * eased;
      y = a.y + (b.y - a.y) * eased;
      break;
    }
    if (frame > b.f) {
      x = b.x;
      y = b.y;
    }
  }
  for (const p of path) {
    if (p.click && Math.abs(frame - p.f) <= 3) clicking = true;
  }
  const appear = springy(frame, fps, path[0].f);
  const scale = (clicking ? 0.82 : 1) * appear;

  return (
    <div
      style={{
        position: "absolute",
        left: x - 4,
        top: y - 2,
        width: 52,
        height: 52,
        transform: `scale(${scale})`,
        transformOrigin: "4px 2px",
        zIndex: 100
      }}
    >
      {clicking ? (
        <div
          style={{
            position: "absolute",
            left: -22,
            top: -22,
            width: 96,
            height: 96,
            border: `5px solid ${palette.ink}`,
            borderRadius: "50%",
            background: "rgba(255,212,61,0.22)"
          }}
        />
      ) : null}
      <svg width="52" height="52" viewBox="0 0 32 32" style={{ filter: `drop-shadow(4px 4px 0 ${palette.ink})` }}>
        <path
          d="M4 2 L4 26 L10.5 20 L14 28 L17.5 26.5 L14 19 L22 19 Z"
          fill={palette.yellow}
          stroke={palette.ink}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// S3 — Walk the board closer to the sticker
// ---------------------------------------------------------------------------

function SceneStep3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stripT = springy(frame, fps, 24, { damping: 12 });

  // Pawn walks 5 tiles across the strip over ~50 frames
  const walkStart = 58;
  const pawnStep = interpolate(frame, [walkStart, walkStart + 60], [0, 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });

  const stickerT = springy(frame, fps, 118, { damping: 9, stiffness: 130 });
  const captionT = easeT(frame, 130, 152);
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="03" title="One step closer." tint={palette.sky} />

      {/* Tile strip */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 480,
          right: 120,
          height: 240,
          display: "flex",
          gap: 18,
          padding: 22,
          border: `7px solid ${palette.ink}`,
          borderRadius: 20,
          background: palette.paperDeep,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `translateY(${(1 - stripT) * 50}px) scale(${stripT})`,
          opacity: stripT
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const bg = i === 5 ? palette.yellow : i === 3 ? palette.mint : palette.surface;
          const glyph = i === 5 ? "🏁" : i === 3 ? "→" : String(i);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                border: `5px solid ${palette.ink}`,
                borderRadius: 12,
                background: bg,
                boxShadow: `4px 4px 0 ${palette.ink}`,
                fontSize: 48,
                fontWeight: 900
              }}
            >
              {glyph}
            </div>
          );
        })}

        {/* Pawn overlay */}
        <div
          style={{
            position: "absolute",
            left: 22 + 22 + (pawnStep + 0.5) * ((1920 - 240 - 44 - 5 * 18) / 6) + 18 * pawnStep - 40,
            top: 240 / 2 + 22 - 40,
            width: 80,
            height: 80,
            display: "grid",
            placeItems: "center",
            border: `6px solid ${palette.ink}`,
            borderRadius: "50%",
            background: palette.red,
            color: palette.white,
            fontSize: 22,
            fontWeight: 900,
            textTransform: "uppercase",
            boxShadow: `5px 5px 0 ${palette.ink}`
          }}
        >
          YOU
        </div>
      </div>

      {/* Sticker target at end of strip */}
      {frame > 100 ? (
        <div
          style={{
            position: "absolute",
            right: 100,
            top: 320,
            width: 200,
            height: 200,
            display: "grid",
            placeItems: "center",
            border: `8px solid ${palette.ink}`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, #fff4c0 0 22%, ${palette.yellow} 22% 100%)`,
            boxShadow: `11px 11px 0 ${palette.ink}`,
            fontSize: 120,
            transform: `scale(${stickerT}) rotate(${Math.sin(frame / 9) * 6}deg)`,
            opacity: stickerT
          }}
        >
          ★
        </div>
      ) : null}

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 140,
          padding: "14px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        Complete the loop · earn the sticker.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S4 — Outro with center-fade (630-750f, 4s)
// Final 36 frames (1.2s): radial collapse to center that the player
// shell will match in sync.
// ---------------------------------------------------------------------------

function SceneOutro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stickerT = springy(frame, fps, 2, { damping: 9, stiffness: 130 });
  const titleT = springy(frame, fps, 20, { damping: 11 });
  const subT = easeT(frame, 36, 56);

  // Collapse window: last 36 frames (local 84..120). scale 1 → 0.
  const collapse = easeT(frame, 84, 120, Easing.in(Easing.cubic));
  const scale = 1 - collapse;
  const radialRadius = (1 - collapse) * 120;

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        // Radial mask that closes from full viewport to a point at center.
        WebkitMask: `radial-gradient(circle at 50% 50%, #000 ${radialRadius}%, transparent ${radialRadius + 8}%)`,
        mask: `radial-gradient(circle at 50% 50%, #000 ${radialRadius}%, transparent ${radialRadius + 8}%)`
      }}
    >
      {/* Rays rotating gently */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * 360;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 1500,
              height: 64,
              background: i % 2 === 0 ? palette.mint : palette.pink,
              border: `3px solid ${palette.ink}`,
              transformOrigin: "0 50%",
              transform: `rotate(${a + frame * 1.4}deg) translateY(-50%)`,
              opacity: 0.15 * (1 - collapse)
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          gap: 22,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          opacity: 1 - collapse
        }}
      >
        {/* Sticker */}
        <div
          style={{
            width: 360,
            height: 360,
            display: "grid",
            placeItems: "center",
            border: `10px solid ${palette.ink}`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, #fff4c0 0 22%, ${palette.yellow} 22% 100%)`,
            boxShadow: `14px 14px 0 ${palette.ink}`,
            fontSize: 240,
            transform: `scale(${stickerT}) rotate(${Math.sin(frame / 8) * 4}deg)`
          }}
        >
          ★
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 0.92,
            textShadow: `6px 6px 0 ${palette.mint}`,
            transform: `scale(${titleT})`
          }}
        >
          Your turn.
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            opacity: subT
          }}
        >
          Let's go.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// 3D Die faces
// ---------------------------------------------------------------------------

const dieFaces = [
  { key: "front", value: 1, transform: "translateZ(130px)" },
  { key: "back", value: 6, transform: "rotateY(180deg) translateZ(130px)" },
  { key: "top", value: 2, transform: "rotateX(90deg) translateZ(130px)" },
  { key: "bottom", value: 5, transform: "rotateX(-90deg) translateZ(130px)" },
  { key: "right", value: 3, transform: "rotateY(90deg) translateZ(130px)" },
  { key: "left", value: 4, transform: "rotateY(-90deg) translateZ(130px)" }
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
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: palette.ink,
        boxShadow: "inset -2px -2px 0 rgba(255,255,255,0.22)"
      }}
    />
  ));
}

// ---------------------------------------------------------------------------
// Root — 25s composition with tutorial bed + SFX on every step landing
// ---------------------------------------------------------------------------

export function SideQuestTutorialReel() {
  return (
    <AbsoluteFill>
      <TutorialBackdrop />

      {/* Music bed runs the full 25s */}
      <Audio src={staticFile("tutorial-bed.wav")} volume={0.75} />

      {/* Scene clips */}
      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <SceneStep1 />
      </Sequence>
      <Sequence from={270} durationInFrames={180}>
        <SceneStep2 />
      </Sequence>
      <Sequence from={450} durationInFrames={180}>
        <SceneStep3 />
      </Sequence>
      <Sequence from={630} durationInFrames={120}>
        <SceneOutro />
      </Sequence>

      {/* SFX hits, bar-aligned with the bed */}
      {/* Hook pop */}
      <Sequence from={10} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.5} />
      </Sequence>

      {/* Step 1: header land + check stamp + caption */}
      <Sequence from={96} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={118} durationInFrames={12}>
        <Audio src={staticFile("thud.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={204} durationInFrames={24}>
        <Audio src={staticFile("ding.wav")} volume={0.7} />
      </Sequence>

      {/* Step 2: header + click + die settle */}
      <Sequence from={276} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={338} durationInFrames={8}>
        <Audio src={staticFile("click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={344} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.55} />
      </Sequence>

      {/* Step 3: header + step ticks + sticker zoom */}
      <Sequence from={456} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={510 + i * 12} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={568} durationInFrames={24}>
        <Audio src={staticFile("ding.wav")} volume={0.55} />
      </Sequence>

      {/* Outro: big ding at sticker + soft whoosh as the radial collapses */}
      <Sequence from={636} durationInFrames={30}>
        <Audio src={staticFile("ding.wav")} volume={0.85} />
      </Sequence>
      <Sequence from={714} durationInFrames={30}>
        <Audio src={staticFile("whoosh.wav")} volume={0.45} />
      </Sequence>
    </AbsoluteFill>
  );
}
