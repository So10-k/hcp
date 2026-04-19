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
 * 25s first-time tutorial for the main /board page.
 *
 * Mirrors the gameboard tutorial (hook → 3 steps → outro) but teaches the
 * core quest loop instead of the dice event, and closes with a venetian-
 * blind shutter outro (rather than a radial collapse) to keep repeat
 * viewers visually engaged.
 *
 * Scene map (750 frames @ 30fps):
 *   0   - 90   S0 Hook
 *   90  - 270  S1 Drop a quest (wizard → card)
 *   270 - 450  S2 Focus in (timer + steps)
 *   450 - 630  S3 Clear. Earn. Streak (confetti + sticker + streak bar)
 *   630 - 750  S4 Outro (venetian-blind close + "Your run.")
 *
 * Last 36 frames (1.2s) are the shutter-close window — the custom
 * <TutorialPlayer> begins its scale+fade dismiss on the same frame so
 * both close together.
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

function Backdrop() {
  const frame = useCurrentFrame();
  const drift = frame * 0.9;
  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        ...bgGrid(0.05, 64),
        backgroundPosition: `${drift}px ${drift * 0.3}px`,
        overflow: "hidden"
      }}
    >
      <DriftSticker x={-120} y={220} color={palette.pink} glyph="★" rot={-8} size={180} phase={0} />
      <DriftSticker x={1720} y={260} color={palette.mint} glyph="🌿" rot={10} size={170} phase={1} />
      <DriftSticker x={140} y={820} color={palette.sky} glyph="⚡" rot={-4} size={160} phase={2} />
      <DriftSticker x={1640} y={840} color={palette.yellow} glyph="✺" rot={8} size={150} phase={3} />
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
// Step header (reused)
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
          fontSize: 118,
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
// S0 Hook
// ---------------------------------------------------------------------------

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tagT = springy(frame, fps, 2);
  const titleT = springy(frame, fps, 10, { damping: 11 });
  const subT = easeT(frame, 30, 50);
  const exit = easeT(frame, 78, 90, Easing.in(Easing.cubic));
  const stripeT = easeT(frame, 6, 42, Easing.out(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.06})`,
        opacity: 1 - exit
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", gap: 24 }}>
        <div
          style={{
            padding: "12px 24px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.yellow,
            color: palette.ink,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            boxShadow: `7px 7px 0 ${palette.ink}`,
            transform: `scale(${tagT})`
          }}
        >
          Welcome · Your Board
        </div>

        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            textTransform: "uppercase",
            lineHeight: 0.9,
            textAlign: "center",
            letterSpacing: "-0.01em",
            textShadow: `7px 7px 0 ${palette.red}`,
            transform: `scale(${titleT})`
          }}
        >
          The loop.
        </div>

        {/* Color stripe */}
        <div
          style={{
            width: 700 * stripeT,
            height: 24,
            border: `5px solid ${palette.ink}`,
            borderRadius: 8,
            background: `linear-gradient(90deg, ${palette.red} 0 20%, ${palette.yellow} 20% 40%, ${palette.mint} 40% 60%, ${palette.sky} 60% 80%, ${palette.pink} 80%)`,
            boxShadow: `5px 5px 0 ${palette.ink}`,
            overflow: "hidden"
          }}
        />

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
          Drop · Focus · Clear.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S1 Drop a quest — wizard stepper + card plop-out
// ---------------------------------------------------------------------------

function SceneStep1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const steps = ["Name", "Lane", "Moves", "Party", "Launch"];
  const activeStep = Math.min(4, Math.max(0, Math.floor((frame - 32) / 14)));
  const cardT = springy(frame, fps, 108, { damping: 11, stiffness: 130 });
  const captionT = easeT(frame, 134, 156);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="01" title="Drop a quest." tint={palette.red} />

      {/* Stepper */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 480,
          right: 120,
          display: "flex",
          gap: 18
        }}
      >
        {steps.map((s, i) => {
          const active = i <= activeStep;
          const scale = i === activeStep ? 1 + Math.sin(frame / 3) * 0.04 : 1;
          return (
            <div
              key={s}
              style={{
                flex: 1,
                padding: "18px 10px",
                border: `6px solid ${palette.ink}`,
                borderRadius: 14,
                background: active ? palette.mint : palette.white,
                boxShadow: `8px 8px 0 ${palette.ink}`,
                textAlign: "center",
                transform: `scale(${scale})`
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  opacity: 0.7
                }}
              >
                0{i + 1}
              </div>
              <div style={{ marginTop: 4, fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>
                {s}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quest card plop-out */}
      <div
        style={{
          position: "absolute",
          left: 960 - 380,
          top: 660,
          width: 760,
          padding: "26px 32px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `scale(${cardT}) rotate(${(1 - cardT) * -4}deg)`,
          opacity: cardT
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              padding: "5px 12px",
              border: `3px solid ${palette.ink}`,
              borderRadius: 8,
              background: palette.sky,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em"
            }}
          >
            CREATIVE
          </div>
          <div
            style={{
              padding: "5px 12px",
              border: `3px solid ${palette.ink}`,
              borderRadius: 8,
              background: palette.yellow,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.08em"
            }}
          >
            125 XP
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 50, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Draft the pitch
        </div>
        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, opacity: 0.75, lineHeight: 1.3 }}>
          Rough sketch · Messy draft · Polish
        </div>
      </div>

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
        5 steps · 1 quest card.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S2 Focus in — countdown + checkbox steps
// ---------------------------------------------------------------------------

function SceneStep2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));
  const cardT = springy(frame, fps, 28, { damping: 12 });

  // Countdown ticks from 20:00 down to 18:44 across the scene.
  const totalSeconds = interpolate(frame, [28, 160], [20 * 60, 18 * 60 + 44], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const pulse = 1 + Math.sin(frame / 4) * 0.02;

  const steps = ["Open the assignment", "Do a 20 min sprint", "Turn it in"];
  const done = Math.min(2, Math.floor((frame - 80) / 30));
  const captionT = easeT(frame, 132, 154);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="02" title="Focus in." tint={palette.sky} />

      {/* Focus card */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 470,
          right: 120,
          padding: 36,
          border: `7px solid ${palette.ink}`,
          borderRadius: 22,
          background: palette.surface,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          display: "grid",
          gridTemplateColumns: "minmax(420px, 0.55fr) minmax(0, 1fr)",
          gap: 40,
          alignItems: "center",
          transform: `translateY(${(1 - cardT) * 60}px) scale(${cardT})`,
          opacity: cardT
        }}
      >
        {/* Left: big countdown */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.mint,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              boxShadow: `4px 4px 0 ${palette.ink}`
            }}
          >
            Focus Mode
          </div>
          <div
            style={{
              marginTop: 18,
              padding: "24px 10px",
              border: `7px solid ${palette.ink}`,
              borderRadius: 20,
              background: palette.ink,
              color: palette.yellow,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 172,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              boxShadow: `10px 10px 0 ${palette.ink}`,
              transform: `scale(${pulse})`
            }}
          >
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>

        {/* Right: steps + prompt */}
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>
            Focus prompt
          </div>
          <div style={{ marginTop: 10, fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
            What's the smallest possible next move?
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 30 }}>
            {steps.map((s, i) => {
              const isDone = i <= done;
              const t = springy(frame, fps, 40 + i * 10, { damping: 10 });
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "14px 18px",
                    border: `5px solid ${palette.ink}`,
                    borderRadius: 12,
                    background: isDone ? palette.mint : palette.white,
                    boxShadow: `6px 6px 0 ${palette.ink}`,
                    transform: `translateX(${(1 - t) * -40}px)`,
                    opacity: t
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      border: `4px solid ${palette.ink}`,
                      borderRadius: 8,
                      background: isDone ? palette.ink : palette.white,
                      color: palette.yellow,
                      fontSize: 26,
                      fontWeight: 900
                    }}
                  >
                    {isDone ? "✓" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      textDecoration: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.7 : 1
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
        One sprint · one tiny win.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S3 Clear. Earn. Streak.
// ---------------------------------------------------------------------------

function SceneStep3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const cardT = springy(frame, fps, 10, { damping: 12 });
  const progress = interpolate(frame, [36, 76], [50, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const stickerT = springy(frame, fps, 84, { damping: 9, stiffness: 140 });
  const cardFade = easeT(frame, 90, 112, Easing.in(Easing.cubic));
  const streakT = easeT(frame, 110, 140);
  const captionT = easeT(frame, 132, 154);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="03" title="Clear. Earn. Streak." tint={palette.mint} />

      {/* Quest card with progress + Complete button */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 480,
          width: 900,
          padding: "28px 32px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `translateY(${(1 - cardT) * 40}px) scale(${cardT * (1 - cardFade * 0.35)})`,
          opacity: cardT * (1 - cardFade)
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Draft the pitch
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
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
          <div style={{ minWidth: 100, textAlign: "right", fontSize: 32, fontWeight: 900, fontFamily: "ui-monospace, Menlo, monospace" }}>
            {Math.round(progress)}%
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
          <div
            style={{
              padding: "14px 22px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 12,
              background: palette.mint,
              boxShadow: `6px 6px 0 ${palette.ink}`,
              fontSize: 24,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              transform: `scale(${progress >= 100 ? 1.04 : 1})`
            }}
          >
            ✓ Cleared
          </div>
        </div>
      </div>

      {/* Sticker reward appearing */}
      {frame > 80 ? (
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 440,
            width: 320,
            height: 320,
            display: "grid",
            placeItems: "center",
            border: `9px solid ${palette.ink}`,
            borderRadius: "50%",
            background: palette.pink,
            color: palette.ink,
            fontSize: 180,
            boxShadow: `14px 14px 0 ${palette.ink}`,
            transform: `scale(${stickerT}) rotate(${(1 - stickerT) * -30}deg)`,
            opacity: stickerT
          }}
        >
          ✺
        </div>
      ) : null}

      {/* Streak row */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 220,
          display: "flex",
          gap: 12,
          opacity: streakT,
          transform: `translateY(${(1 - streakT) * 30}px)`
        }}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
          const done = i <= 4;
          const t = springy(frame, fps, 116 + i * 3, { damping: 10 });
          return (
            <div
              key={d}
              style={{
                flex: 1,
                height: 90,
                display: "grid",
                placeItems: "center",
                border: `5px solid ${palette.ink}`,
                borderRadius: 12,
                background: done ? palette.mint : palette.white,
                boxShadow: `6px 6px 0 ${palette.ink}`,
                fontSize: 22,
                fontWeight: 900,
                textTransform: "uppercase",
                transform: `scale(${t})`
              }}
            >
              {done ? "✓" : d}
            </div>
          );
        })}
      </div>

      <Confetti frame={frame} start={80} cx={560} cy={620} />

      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 110,
          padding: "12px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT
        }}
      >
        Unlock a sticker · Feed the streak.
      </div>
    </AbsoluteFill>
  );
}

function Confetti({ frame, start, cx, cy }: { frame: number; start: number; cx: number; cy: number }) {
  const pieces = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    angle: (i / 22) * Math.PI * 2,
    delay: (i % 6) * 1.2,
    rot: (i * 37) % 360,
    color: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink][i % 5],
    size: 14 + (i % 4) * 4,
    dist: 320 + ((i * 19) % 180)
  }));
  return (
    <>
      {pieces.map((p) => {
        const local = frame - start - p.delay;
        const t = interpolate(local, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t === 0) return null;
        const fade = interpolate(local, [22, 48], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
// S4 Outro — venetian-blind shutter close
// Six horizontal bars slide in alternating from top and bottom. They meet
// at the center horizontal line during the same 36-frame window that the
// player is shrinking.
// ---------------------------------------------------------------------------

function SceneOutro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stickerT = springy(frame, fps, 2, { damping: 9, stiffness: 130 });
  const titleT = springy(frame, fps, 20, { damping: 11 });
  const subT = easeT(frame, 40, 60);

  // Content scales down during the shutter (local frame 84-120).
  const collapse = easeT(frame, 84, 120, Easing.in(Easing.cubic));
  const scale = 1 - collapse * 0.35;

  // 6 shutter bars, alternating top/bottom, staggered.
  const barColors = [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink, palette.yellow];
  const H = 1080;

  return (
    <AbsoluteFill style={{ fontFamily: fontStack, color: palette.ink }}>
      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          gap: 22,
          transform: `scale(${scale})`,
          opacity: 1 - collapse
        }}
      >
        {/* Sticker cluster: three stickers fanned */}
        <div style={{ display: "flex", gap: 18, transform: `scale(${stickerT})` }}>
          {[
            { c: palette.yellow, g: "★" },
            { c: palette.pink, g: "✺" },
            { c: palette.mint, g: "🌿" }
          ].map((s, i) => (
            <div
              key={i}
              style={{
                width: 200,
                height: 200,
                display: "grid",
                placeItems: "center",
                border: `8px solid ${palette.ink}`,
                borderRadius: "50%",
                background: s.c,
                boxShadow: `11px 11px 0 ${palette.ink}`,
                fontSize: 120,
                transform: `rotate(${(i - 1) * 10 + Math.sin(frame / 8 + i) * 3}deg)`
              }}
            >
              {s.g}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 130,
            fontWeight: 900,
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 0.9,
            textShadow: `8px 8px 0 ${palette.yellow}`,
            transform: `scale(${titleT})`
          }}
        >
          Your board.<br />Your run.
        </div>

        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            opacity: subT
          }}
        >
          Press N anytime to drop a quest.
        </div>
      </div>

      {/* Shutter bars */}
      {barColors.map((bg, i) => {
        const fromTop = i % 2 === 0;
        const stagger = i * 3;
        // Slide in from outside the frame to the center over local frames 84..120
        const t = easeT(frame, 84 + stagger, 116 + stagger, Easing.out(Easing.cubic));
        const barHeight = H / barColors.length;
        const fromY = fromTop ? -barHeight : H;
        const targetY = (i * barHeight);
        const y = fromY + (targetY - fromY) * t;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: y,
              height: barHeight,
              background: bg,
              borderTop: `5px solid ${palette.ink}`,
              borderBottom: `5px solid ${palette.ink}`
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function SideQuestBoardTutorialReel() {
  return (
    <AbsoluteFill>
      <Backdrop />

      <Audio src={staticFile("tutorial-bed.wav")} volume={0.75} />

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

      {/* SFX hits, bar-aligned */}
      <Sequence from={10} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.5} />
      </Sequence>

      {/* S1 */}
      <Sequence from={96} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={122 + i * 14} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.45} />
        </Sequence>
      ))}
      <Sequence from={198} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.7} />
      </Sequence>

      {/* S2 */}
      <Sequence from={276} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={298} durationInFrames={12}>
        <Audio src={staticFile("thud.wav")} volume={0.6} />
      </Sequence>
      {[0, 1, 2].map((i) => (
        <Sequence key={i} from={310 + i * 30} durationInFrames={8}>
          <Audio src={staticFile("click.wav")} volume={0.5} />
        </Sequence>
      ))}

      {/* S3 */}
      <Sequence from={456} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={530} durationInFrames={6}>
        <Audio src={staticFile("click.wav")} volume={0.85} />
      </Sequence>
      <Sequence from={534} durationInFrames={26}>
        <Audio src={staticFile("pop.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={544} durationInFrames={24}>
        <Audio src={staticFile("ding.wav")} volume={0.6} />
      </Sequence>

      {/* Outro — big ding + shutter whooshes on each bar */}
      <Sequence from={636} durationInFrames={28}>
        <Audio src={staticFile("ding.wav")} volume={0.75} />
      </Sequence>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sequence key={i} from={714 + i * 3} durationInFrames={10}>
          <Audio src={staticFile("whoosh.wav")} volume={0.22} />
        </Sequence>
      ))}
      <Sequence from={726} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
}
