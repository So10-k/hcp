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
 * 25s optional intro for the landing page.
 *
 * Opens with a full SideQuest lockup, explains the product in three moves
 * (Drop · Squad · Clear), and closes with a camera-iris outro — twelve
 * wedge blades rotate and converge toward the center. The custom
 * <TutorialPlayer> runs its scale+fade dismiss in the same 1.2s window so
 * the iris-close and the frame-collapse finish together.
 *
 * Scene map (750 frames @ 30fps):
 *   0   - 90   S0 Hook (logo + tagline)
 *   90  - 270  S1 Drop a quest
 *   270 - 450  S2 Bring your crew
 *   450 - 630  S3 Clear to win
 *   630 - 750  S4 Outro (iris close + "Start your run.")
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
      <Drift x={-120} y={220} color={palette.pink} glyph="★" rot={-8} size={180} phase={0} />
      <Drift x={1720} y={260} color={palette.sky} glyph="◆" rot={10} size={170} phase={1} />
      <Drift x={140} y={820} color={palette.mint} glyph="✺" rot={-4} size={160} phase={2} />
      <Drift x={1640} y={840} color={palette.yellow} glyph="⚡" rot={8} size={150} phase={3} />
    </AbsoluteFill>
  );
}

function Drift({
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
        opacity: 0.45
      }}
    >
      {glyph}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step header
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
// S0 — Product logo hook
// ---------------------------------------------------------------------------

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markT = springy(frame, fps, 2, { damping: 11, stiffness: 130 });
  const wordT = easeT(frame, 10, 30);
  const tagT = easeT(frame, 26, 50);
  const exit = easeT(frame, 78, 90, Easing.in(Easing.cubic));
  const stripeT = easeT(frame, 4, 38, Easing.out(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.06})`,
        opacity: 1 - exit
      }}
    >
      <div style={{ position: "absolute", left: 120, top: 160, width: 1100 * stripeT, height: 24, border: `5px solid ${palette.ink}`, borderRadius: 8, background: `linear-gradient(90deg, ${palette.red} 0 20%, ${palette.yellow} 20% 40%, ${palette.mint} 40% 60%, ${palette.sky} 60% 80%, ${palette.pink} 80%)`, boxShadow: `5px 5px 0 ${palette.ink}`, overflow: "hidden" }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          flexDirection: "column"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 200,
              height: 200,
              display: "grid",
              placeItems: "center",
              border: `9px solid ${palette.ink}`,
              borderRadius: 20,
              background: palette.yellow,
              boxShadow: `13px 13px 0 ${palette.ink}`,
              transform: `scale(${markT}) rotate(${(markT - 1) * -6}deg)`,
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: "-0.05em"
            }}
          >
            SQ
          </div>
          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              lineHeight: 0.9,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              opacity: wordT,
              transform: `translateX(${(1 - wordT) * -40}px)`
            }}
          >
            SideQuest
          </div>
        </div>
        <div
          style={{
            padding: "14px 28px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.mint,
            boxShadow: `8px 8px 0 ${palette.ink}`,
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            opacity: tagT,
            transform: `translateY(${(1 - tagT) * 22}px)`
          }}
        >
          Real life. Quest mode.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S1 — Drop a quest (5 category chips + quest card)
// ---------------------------------------------------------------------------

function SceneStep1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));
  const cardT = springy(frame, fps, 60, { damping: 11, stiffness: 130 });
  const captionT = easeT(frame, 132, 154);

  const cats = [
    { bg: palette.yellow, label: "SCHOOL", glyph: "★" },
    { bg: palette.mint, label: "HEALTH", glyph: "🌿" },
    { bg: palette.sky, label: "SOCIAL", glyph: "⚡" },
    { bg: palette.pink, label: "CREATIVE", glyph: "✺" },
    { bg: palette.red, label: "LIFE", glyph: "🛡" }
  ];

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

      {/* 5 category tiles */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 480,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 24
        }}
      >
        {cats.map((c, i) => {
          const t = springy(frame, fps, 10 + i * 8, { damping: 10, stiffness: 150 });
          const bob = Math.sin((frame + i * 12) / 16) * 6;
          return (
            <div
              key={c.label}
              style={{
                aspectRatio: "1 / 1",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                padding: 22,
                border: `7px solid ${palette.ink}`,
                borderRadius: 18,
                background: c.bg,
                boxShadow: `9px 9px 0 ${palette.ink}`,
                transform: `scale(${t}) translateY(${(1 - t) * 30 + bob}px)`,
                opacity: t
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {c.label}
              </div>
              <div style={{ display: "grid", placeItems: "center", fontSize: 120 }}>{c.glyph}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                5–150 XP
              </div>
            </div>
          );
        })}
      </div>

      {/* Quest card drops in */}
      <div
        style={{
          position: "absolute",
          left: 960 - 360,
          top: 820,
          width: 720,
          padding: "20px 30px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `translateY(${(1 - cardT) * 60}px) scale(${cardT})`,
          opacity: cardT
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ padding: "4px 12px", border: `3px solid ${palette.ink}`, borderRadius: 8, background: palette.sky, fontSize: 16, fontWeight: 900, letterSpacing: "0.08em" }}>
            SOCIAL · 50 XP
          </div>
          <div style={{ padding: "4px 12px", border: `3px solid ${palette.ink}`, borderRadius: 8, background: palette.yellow, fontSize: 16, fontWeight: 900, letterSpacing: "0.08em" }}>
            TONIGHT
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Plan Friday hangout
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
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        5 lanes · your rhythm.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S2 — Bring your crew
// ---------------------------------------------------------------------------

function SceneStep2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const cardT = springy(frame, fps, 16, { damping: 11 });
  const captionT = easeT(frame, 132, 154);

  const members = [
    { i: "AV", c: palette.red },
    { i: "JY", c: palette.yellow },
    { i: "NR", c: palette.mint },
    { i: "LE", c: palette.sky },
    { i: "MI", c: palette.pink }
  ];

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="02" title="Bring your crew." tint={palette.sky} />

      {/* Party card */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 480,
          padding: 36,
          border: `7px solid ${palette.ink}`,
          borderRadius: 22,
          background: palette.surface,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          transform: `translateY(${(1 - cardT) * 60}px) scale(${cardT})`,
          opacity: cardT
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>
              Party board
            </div>
            <div style={{ marginTop: 8, fontSize: 72, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.92 }}>
              Study Squad
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.mint,
              color: palette.ink,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: `6px 6px 0 ${palette.ink}`
            }}
          >
            Invite · SQ-STUDY-7F
          </div>
        </div>

        {/* Avatars */}
        <div style={{ display: "flex", gap: 20, marginTop: 30 }}>
          {members.map((m, i) => {
            const t = springy(frame, fps, 22 + i * 6, { damping: 10, stiffness: 170 });
            return (
              <div
                key={m.i}
                style={{
                  width: 128,
                  height: 128,
                  display: "grid",
                  placeItems: "center",
                  border: `6px solid ${palette.ink}`,
                  borderRadius: 16,
                  background: m.c,
                  boxShadow: `8px 8px 0 ${palette.ink}`,
                  fontSize: 40,
                  fontWeight: 900,
                  transform: `scale(${t})`
                }}
              >
                {m.i}
              </div>
            );
          })}
        </div>

        {/* Activity line */}
        <div
          style={{
            marginTop: 24,
            padding: "14px 22px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.yellow,
            boxShadow: `6px 6px 0 ${palette.ink}`,
            fontSize: 28,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            opacity: easeT(frame, 60, 80)
          }}
        >
          @Ava cleared "Essay outline" · Just now
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
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        Private updates · no public ranks.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S3 — Clear to win
// ---------------------------------------------------------------------------

function SceneStep3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));
  const captionT = easeT(frame, 132, 154);

  const stickers = [
    { c: palette.yellow, g: "★" },
    { c: palette.mint, g: "🌿" },
    { c: palette.sky, g: "⚡" },
    { c: palette.pink, g: "✺" },
    { c: palette.red, g: "🛡" }
  ];

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="03" title="Clear to win." tint={palette.mint} />

      {/* Sticker shelf */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 470,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 24
        }}
      >
        {stickers.map((s, i) => {
          const t = springy(frame, fps, 14 + i * 7, { damping: 10, stiffness: 150 });
          const rot = ((i % 2) * 2 - 1) * 4;
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1 / 1",
                display: "grid",
                placeItems: "center",
                border: `7px solid ${palette.ink}`,
                borderRadius: 20,
                background: s.c,
                boxShadow: `10px 10px 0 ${palette.ink}`,
                fontSize: 120,
                transform: `scale(${t}) rotate(${rot * t}deg)`,
                opacity: t
              }}
            >
              {s.g}
            </div>
          );
        })}
      </div>

      {/* Streak + XP row */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 800,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 24
        }}
      >
        {/* Streak */}
        <div
          style={{
            padding: 24,
            border: `6px solid ${palette.ink}`,
            borderRadius: 16,
            background: palette.surface,
            boxShadow: `9px 9px 0 ${palette.ink}`,
            transform: `translateY(${(1 - easeT(frame, 60, 78)) * 30}px)`,
            opacity: easeT(frame, 60, 78)
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>
            Weekly streak
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
              const done = i <= 4;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 70,
                    display: "grid",
                    placeItems: "center",
                    border: `5px solid ${palette.ink}`,
                    borderRadius: 10,
                    background: done ? palette.mint : palette.white,
                    boxShadow: `4px 4px 0 ${palette.ink}`,
                    fontSize: 22,
                    fontWeight: 900,
                    textTransform: "uppercase"
                  }}
                >
                  {done ? "✓" : d}
                </div>
              );
            })}
          </div>
        </div>

        {/* XP */}
        <div
          style={{
            padding: 24,
            border: `6px solid ${palette.ink}`,
            borderRadius: 16,
            background: palette.yellow,
            boxShadow: `9px 9px 0 ${palette.ink}`,
            transform: `translateY(${(1 - easeT(frame, 70, 92)) * 30}px)`,
            opacity: easeT(frame, 70, 92)
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75 }}>
            XP this week
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 98,
              fontWeight: 900,
              fontFamily: "ui-monospace, Menlo, monospace",
              lineHeight: 0.95,
              letterSpacing: "-0.02em"
            }}
          >
            875
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 120,
          bottom: 60,
          padding: "14px 22px",
          border: `5px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.ink,
          color: palette.yellow,
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: `7px 7px 0 rgba(23,21,18,0.25)`,
          opacity: captionT,
          transform: `translateY(${(1 - captionT) * 30}px)`
        }}
      >
        Stickers · streak · clear moments.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// S4 — Outro iris close
// Twelve triangular wedges rotate and converge toward center, while the
// content scales down + dims. Matches the player's 1.2s scale+fade dismiss.
// ---------------------------------------------------------------------------

function SceneOutro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lockupT = springy(frame, fps, 0, { damping: 12 });
  const titleT = springy(frame, fps, 12, { damping: 11 });
  const urlT = easeT(frame, 30, 58);

  // Iris window is local frames 84..120 (1.2s at 30fps).
  const collapse = easeT(frame, 84, 120, Easing.in(Easing.cubic));
  const scale = 1 - collapse * 0.3;
  // The iris "blades" extend from outside the frame towards the center.
  // Blade length 1400 at collapse=0, shrinks toward 0 as they close in.
  const bladeReach = 1200 - collapse * 1200;

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        overflow: "hidden"
      }}
    >
      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          gap: 22,
          transform: `scale(${scale})`,
          opacity: 1 - collapse * 0.85
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 30, transform: `scale(${lockupT})` }}>
          <div
            style={{
              width: 150,
              height: 150,
              display: "grid",
              placeItems: "center",
              border: `8px solid ${palette.ink}`,
              borderRadius: 18,
              background: palette.yellow,
              color: palette.ink,
              fontSize: 80,
              fontWeight: 900,
              boxShadow: `11px 11px 0 ${palette.ink}`
            }}
          >
            SQ
          </div>
          <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase" }}>
            SideQuest
          </div>
        </div>

        <div
          style={{
            fontSize: 106,
            fontWeight: 900,
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 0.92,
            textShadow: `7px 7px 0 ${palette.mint}`,
            transform: `scale(${titleT})`
          }}
        >
          Start your run.
        </div>

        <div
          style={{
            padding: "16px 28px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.red,
            color: palette.ink,
            boxShadow: `10px 10px 0 ${palette.ink}`,
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            opacity: urlT,
            transform: `translateY(${(1 - urlT) * 20}px)`
          }}
        >
          sidequest.app
        </div>
      </div>

      {/* Iris blades: 12 wedges radiating inward from the edge */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360 + frame * 0.9;
        const color = [palette.ink, palette.red, palette.ink, palette.yellow, palette.ink, palette.mint][i % 6];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: bladeReach,
              height: 360,
              background: color,
              borderTop: `4px solid ${palette.ink}`,
              borderBottom: `4px solid ${palette.ink}`,
              transformOrigin: "0 50%",
              transform: `rotate(${angle}deg) translate(0, -50%)`,
              opacity: 0.9,
              clipPath: "polygon(0 0, 100% 50%, 0 100%)"
            }}
          />
        );
      })}

      {/* Central ink dot grows tiny at the end to "close the aperture" */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: collapse * 220,
          height: collapse * 220,
          marginLeft: -(collapse * 110),
          marginTop: -(collapse * 110),
          borderRadius: "50%",
          background: palette.ink,
          boxShadow: `0 0 ${collapse * 200}px rgba(23,21,18,0.8)`
        }}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function SideQuestIntroReel() {
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

      {/* SFX */}
      <Sequence from={10} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.5} />
      </Sequence>

      {/* S1 */}
      <Sequence from={96} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={106 + i * 8} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={152} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.65} />
      </Sequence>

      {/* S2 */}
      <Sequence from={276} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={288 + i * 6} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={330} durationInFrames={20}>
        <Audio src={staticFile("ding.wav")} volume={0.5} />
      </Sequence>

      {/* S3 */}
      <Sequence from={456} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={464 + i * 7} durationInFrames={8}>
          <Audio src={staticFile("pop.wav")} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={538} durationInFrames={24}>
        <Audio src={staticFile("ding.wav")} volume={0.55} />
      </Sequence>

      {/* Outro — iris close: big ding on aperture starting to close, soft whoosh during blades converging, final thud when iris locks */}
      <Sequence from={636} durationInFrames={28}>
        <Audio src={staticFile("ding.wav")} volume={0.8} />
      </Sequence>
      <Sequence from={714} durationInFrames={30}>
        <Audio src={staticFile("whoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={740} durationInFrames={10}>
        <Audio src={staticFile("thud.wav")} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
}
