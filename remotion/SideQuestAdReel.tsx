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
// Shared helpers
// ---------------------------------------------------------------------------

function bgGrid(opacity = 0.06) {
  return {
    backgroundImage: `
      linear-gradient(90deg, rgba(23,21,18,${opacity}) 1px, transparent 1px),
      linear-gradient(180deg, rgba(23,21,18,${opacity}) 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px"
  } as const;
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeT(frame: number, start: number, end: number, easing = Easing.out(Easing.cubic)) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing
  });
}

// ---------------------------------------------------------------------------
// Cursor with accurate tip at (x+4, y+2) relative to container (x, y)
// ---------------------------------------------------------------------------

type Waypoint = { f: number; x: number; y: number; click?: boolean };

// Helper: convert a target "tip lands at (tx, ty)" into a cursor container origin.
function tipAt(tx: number, ty: number): { x: number; y: number } {
  return { x: tx - 4, y: ty - 2 };
}

function CursorPath({ path, fps }: { path: Waypoint[]; fps: number }) {
  const frame = useCurrentFrame();
  let x = path[0].x;
  let y = path[0].y;
  let clicking = false;

  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      const eased = Easing.inOut(Easing.cubic)(t);
      x = lerp(a.x, b.x, eased);
      y = lerp(a.y, b.y, eased);
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
  const pressScale = clicking ? 0.82 : 1;
  const scale = pressScale * appear;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 44,
        height: 44,
        transform: `scale(${scale})`,
        transformOrigin: "4px 2px",
        zIndex: 100,
        pointerEvents: "none"
      }}
    >
      {clicking ? (
        <div
          style={{
            position: "absolute",
            left: -20,
            top: -20,
            width: 80,
            height: 80,
            border: `4px solid ${palette.ink}`,
            borderRadius: "50%",
            background: "rgba(255,212,61,0.22)"
          }}
        />
      ) : null}
      <svg width="44" height="44" viewBox="0 0 32 32" style={{ filter: `drop-shadow(3px 3px 0 ${palette.ink})` }}>
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
// Scene A — Brand intro (0-27, ~0.9s)
// ---------------------------------------------------------------------------

function SceneIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const markT = springy(frame, fps, 1, { damping: 11, stiffness: 130 });
  const wordT = easeT(frame, 6, 20);
  const tagT = easeT(frame, 14, 24);
  const exitT = easeT(frame, 22, 27, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        fontFamily: fontStack,
        color: palette.ink,
        ...bgGrid(0.08),
        transform: `scale(${1 - exitT * 0.06})`,
        opacity: 1 - exitT
      }}
    >
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
              width: 180,
              height: 180,
              display: "grid",
              placeItems: "center",
              border: `8px solid ${palette.ink}`,
              borderRadius: 18,
              background: palette.yellow,
              boxShadow: `12px 12px 0 ${palette.ink}`,
              transform: `scale(${markT}) rotate(${(markT - 1) * -8}deg)`,
              fontSize: 100,
              fontWeight: 900,
              letterSpacing: "-0.05em"
            }}
          >
            SQ
          </div>
          <div
            style={{
              fontSize: 184,
              fontWeight: 900,
              lineHeight: 0.9,
              textTransform: "uppercase",
              opacity: wordT,
              transform: `translateX(${(1 - wordT) * -40}px)`
            }}
          >
            SideQuest
          </div>
        </div>
        <div
          style={{
            padding: "14px 26px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 12,
            background: palette.mint,
            boxShadow: `7px 7px 0 ${palette.ink}`,
            fontSize: 40,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
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
// Shared topbar chrome + stat strip used for B/C/D background continuity
// ---------------------------------------------------------------------------

function Topbar() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 96,
        padding: "0 56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(248,239,217,0.94)",
        borderBottom: `5px solid ${palette.ink}`
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 900 }}>
        <div
          style={{
            width: 62,
            height: 62,
            display: "grid",
            placeItems: "center",
            border: `4px solid ${palette.ink}`,
            borderRadius: 10,
            background: palette.yellow,
            boxShadow: `4px 4px 0 ${palette.ink}`,
            fontSize: 22
          }}
        >
          SQ
        </div>
        SideQuest
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 20, fontWeight: 900, textTransform: "uppercase" }}>
        {["Dashboard", "Board", "Party", "Admin"].map((label) => (
          <div
            key={label}
            style={{
              padding: "10px 14px",
              border: `4px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.surface,
              boxShadow: `3px 3px 0 ${palette.ink}`
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene B — Create quest click (27-90, 2.1s)
//   Click at global frame 58. Button centered at screen (960, 600).
// ---------------------------------------------------------------------------

function SceneCreate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // +Create button press scale
  const clickScale = interpolate(frame, [27, 31, 35], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Quest card slides in right after click (click is at frame 58 global = local 31)
  const cardSpring = springy(frame, fps, 33, { damping: 12, stiffness: 130 });

  return (
    <AbsoluteFill style={{ background: palette.paper, fontFamily: fontStack, color: palette.ink, ...bgGrid() }}>
      <Topbar />

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 140,
          fontSize: 22,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          opacity: 0.7
        }}
      >
        Board · Personal
      </div>
      <div style={{ position: "absolute", left: 120, top: 170, fontSize: 74, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
        Drop a quest.
      </div>
      <div style={{ position: "absolute", left: 120, top: 260, fontSize: 28, fontWeight: 800, maxWidth: 640, lineHeight: 1.3 }}>
        Pick the lane. Add the steps. Send it.
      </div>

      {/* + Create quest button (precise click target, center at 960, 600) */}
      <div
        style={{
          position: "absolute",
          left: 960 - 260,
          top: 600 - 52,
          width: 520,
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          border: `6px solid ${palette.ink}`,
          borderRadius: 14,
          background: palette.red,
          boxShadow: `10px 10px 0 ${palette.ink}`,
          fontSize: 38,
          fontWeight: 900,
          textTransform: "uppercase",
          transform: `scale(${clickScale})`
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            border: `4px solid ${palette.ink}`,
            borderRadius: 10,
            background: palette.yellow,
            fontSize: 30
          }}
        >
          +
        </span>
        Create quest
      </div>

      {/* Quest Card that pops in after click */}
      <div
        style={{
          position: "absolute",
          left: 960 - 340,
          top: 760,
          width: 680,
          padding: "24px 30px",
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          opacity: cardSpring,
          transform: `translateY(${(1 - cardSpring) * 60}px) scale(${0.94 + cardSpring * 0.06})`
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              padding: "5px 12px",
              border: `3px solid ${palette.ink}`,
              borderRadius: 8,
              background: palette.sky,
              fontSize: 18,
              fontWeight: 900,
              textTransform: "uppercase"
            }}
          >
            School
          </div>
          <div
            style={{
              padding: "5px 12px",
              border: `3px solid ${palette.ink}`,
              borderRadius: 8,
              background: palette.yellow,
              fontSize: 18,
              fontWeight: 900,
              textTransform: "uppercase"
            }}
          >
            75 XP
          </div>
        </div>
        <div style={{ fontSize: 44, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.98, marginTop: 14 }}>
          Finish chem lab write-up
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.8, marginTop: 10, lineHeight: 1.35 }}>
          Open rubric · 20 min sprint · Turn in
        </div>
      </div>

      <CursorPath
        fps={fps}
        path={[
          { f: 27, x: 1800, y: 900 },
          { f: 54, ...tipAt(960, 600) },
          { f: 58, ...tipAt(960, 600), click: true },
          { f: 68, ...tipAt(960, 600) },
          { f: 90, x: 1100, y: 720 }
        ]}
      />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Scene C — Complete + morph to sticker (90-162, 2.4s)
//   Click at global frame 125 on "Complete" button centered at (790, 740)
// ---------------------------------------------------------------------------

function SceneComplete() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progress bar fills starting just before click → completes ~frame 140
  const progress = interpolate(frame, [122, 140], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const clickScale = interpolate(frame, [122, 126, 130], [1, 0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  // Card fades/shrinks as sticker emerges
  const morphFrame = 140;
  const cardFade = easeT(frame, morphFrame, morphFrame + 12, Easing.in(Easing.cubic));
  const stickerT = springy(frame, fps, morphFrame - 88, { damping: 9, stiffness: 150 });

  const cardSpring = springy(frame, fps, 0, { damping: 12, stiffness: 120 });
  // Note: "delay" for springy is in frames from start of this Sequence; scene starts at global 90, so local frame 0.

  return (
    <AbsoluteFill style={{ background: palette.paper, fontFamily: fontStack, color: palette.ink, ...bgGrid() }}>
      <Topbar />

      {/* Quest Card centered; "Complete" button at (790, 740) */}
      <div
        style={{
          position: "absolute",
          left: 960 - 400,
          top: 540 - 280,
          width: 800,
          padding: "38px 44px",
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          opacity: cardSpring * (1 - cardFade),
          transform: `translateY(${(1 - cardSpring) * 60}px) scale(${(1 - cardFade * 0.35)})`
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 14px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 10,
            background: palette.sky,
            fontSize: 20,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em"
          }}
        >
          School · 75 XP
        </div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 0.98, textTransform: "uppercase", marginTop: 16 }}>
          Finish chem lab write-up
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.35, marginTop: 14, opacity: 0.82 }}>
          Open rubric · 20 min sprint · Turn in.
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 26,
            height: 30,
            border: `5px solid ${palette.ink}`,
            borderRadius: 999,
            background: palette.white,
            overflow: "hidden"
          }}
        >
          <div style={{ height: "100%", width: `${progress}%`, background: palette.red }} />
        </div>

        {/* Buttons row — "Complete" button center at (790, 740) */}
        <div style={{ display: "flex", gap: 16, marginTop: 22 }}>
          <div
            style={{
              // total card left = 560, padding 44 → first button starts at 604
              // button width ~ 220, so button center at (604 + 110) = 714. Hmm need 790.
              // Easier: absolute-position this button to guarantee the center.
              position: "absolute",
              left: 790 - 110,
              top: 740 - 32,
              width: 220,
              height: 64,
              display: "grid",
              placeItems: "center",
              border: `5px solid ${palette.ink}`,
              borderRadius: 12,
              background: palette.mint,
              boxShadow: `6px 6px 0 ${palette.ink}`,
              fontSize: 26,
              fontWeight: 900,
              textTransform: "uppercase",
              transform: `scale(${clickScale})`,
              transformOrigin: "center"
            }}
          >
            Complete
          </div>
          <div
            style={{
              position: "absolute",
              left: 790 + 130,
              top: 740 - 32,
              width: 220,
              height: 64,
              display: "grid",
              placeItems: "center",
              border: `5px solid ${palette.ink}`,
              borderRadius: 12,
              background: palette.white,
              boxShadow: `6px 6px 0 ${palette.ink}`,
              fontSize: 26,
              fontWeight: 900,
              textTransform: "uppercase"
            }}
          >
            Focus mode
          </div>
        </div>
      </div>

      {/* Sticker emerges from center */}
      {frame >= morphFrame - 6 ? (
        <div
          style={{
            position: "absolute",
            left: 960 - 190,
            top: 540 - 190,
            width: 380,
            height: 380,
            border: `8px solid ${palette.ink}`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, #fff4c0 0 22%, ${palette.yellow} 22% 100%)`,
            boxShadow: `14px 14px 0 ${palette.ink}`,
            display: "grid",
            placeItems: "center",
            fontSize: 220,
            transform: `scale(${stickerT}) rotate(${(1 - stickerT) * -20}deg)`,
            opacity: stickerT
          }}
        >
          ★
        </div>
      ) : null}

      <ConfettiBurst frame={frame} startFrame={126} cx={790} cy={740} />

      <CursorPath
        fps={fps}
        path={[
          { f: 90, x: 1100, y: 720 },
          { f: 118, ...tipAt(790, 740) },
          { f: 125, ...tipAt(790, 740), click: true },
          { f: 135, ...tipAt(790, 740) },
          { f: 162, x: 1200, y: 900 }
        ]}
      />
    </AbsoluteFill>
  );
}

function ConfettiBurst({ frame, startFrame, cx, cy }: { frame: number; startFrame: number; cx: number; cy: number }) {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    angle: (i / 36) * Math.PI * 2,
    delay: (i % 7) * 1.2,
    rot: (i * 41) % 360,
    color: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink][i % 5],
    size: 14 + (i % 4) * 5,
    dist: 400 + ((i * 19) % 220)
  }));

  return (
    <>
      {pieces.map((p) => {
        const local = frame - startFrame - p.delay;
        const t = interpolate(local, [0, 28], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        if (t === 0) return null;
        const fade = interpolate(local, [22, 40], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp"
        });
        const dx = Math.cos(p.angle) * p.dist * t;
        const dy = Math.sin(p.angle) * p.dist * t - 80 * (1 - t) + 220 * t * t;
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
// Scene D — Features flash: rewards + party (162-240, 2.6s)
// ---------------------------------------------------------------------------

function SceneFeatures() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleT = springy(frame, fps, 2);
  const stickers = [
    { color: palette.yellow, glyph: "★" },
    { color: palette.mint, glyph: "🌿" },
    { color: palette.pink, glyph: "✺" },
    { color: palette.sky, glyph: "⚡" },
    { color: palette.red, glyph: "🛡" }
  ];

  // Party block reveal after frame 36 (local)
  const partyT = springy(frame, fps, 38, { damping: 11 });

  // Streak bar reveal
  const streakT = springy(frame, fps, 52, { damping: 11 });

  return (
    <AbsoluteFill style={{ background: palette.paper, fontFamily: fontStack, color: palette.ink, ...bgGrid() }}>
      <Topbar />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 138,
          opacity: titleT,
          transform: `translateY(${(1 - titleT) * 30}px)`
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
          Stickers · Squad · Streak
        </div>
        <div style={{ fontSize: 78, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, marginTop: 10 }}>
          Clearing feels great.
        </div>
      </div>

      {/* Sticker strip */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 310,
          display: "flex",
          gap: 20
        }}
      >
        {stickers.map((s, i) => {
          const t = springy(frame, fps, 6 + i * 4, { damping: 9, stiffness: 160 });
          const rot = ((i % 2) * 2 - 1) * 4;
          return (
            <div
              key={i}
              style={{
                width: 146,
                height: 146,
                display: "grid",
                placeItems: "center",
                border: `6px solid ${palette.ink}`,
                borderRadius: 16,
                background: s.color,
                boxShadow: `8px 8px 0 ${palette.ink}`,
                transform: `scale(${t}) rotate(${rot * t}deg)`,
                fontSize: 78
              }}
            >
              {s.glyph}
            </div>
          );
        })}
      </div>

      {/* Party card (right side) */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 520,
          width: 540,
          padding: 24,
          border: `6px solid ${palette.ink}`,
          borderRadius: 16,
          background: palette.surface,
          boxShadow: `9px 9px 0 ${palette.ink}`,
          opacity: partyT,
          transform: `translateX(${(1 - partyT) * 60}px)`
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
          Party board
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, marginTop: 8 }}>
          Squad sees the move.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          {["AV", "JY", "NR", "LE"].map((x, i) => {
            const t = springy(frame, fps, 46 + i * 3, { damping: 9, stiffness: 170 });
            return (
              <div
                key={x}
                style={{
                  width: 72,
                  height: 72,
                  display: "grid",
                  placeItems: "center",
                  border: `5px solid ${palette.ink}`,
                  borderRadius: 10,
                  background: [palette.red, palette.yellow, palette.mint, palette.sky][i],
                  boxShadow: `4px 4px 0 ${palette.ink}`,
                  fontSize: 22,
                  fontWeight: 900,
                  transform: `scale(${t})`
                }}
              >
                {x}
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak bar (left side) */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 520,
          width: 780,
          padding: 24,
          border: `6px solid ${palette.ink}`,
          borderRadius: 16,
          background: palette.surface,
          boxShadow: `9px 9px 0 ${palette.ink}`,
          opacity: streakT,
          transform: `translateY(${(1 - streakT) * 40}px)`
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
          Weekly streak
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
            const isDone = i <= 4;
            const t = springy(frame, fps, 56 + i * 2, { damping: 10, stiffness: 180 });
            return (
              <div
                key={d}
                style={{
                  flex: 1,
                  height: 84,
                  display: "grid",
                  placeItems: "center",
                  border: `5px solid ${palette.ink}`,
                  borderRadius: 10,
                  background: isDone ? palette.mint : palette.white,
                  boxShadow: `4px 4px 0 ${palette.ink}`,
                  fontSize: 18,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  transform: `scale(${t})`
                }}
              >
                {isDone ? "✓" : d}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Scene E — LAUNCH EVENT · DICE BOARD · HAPPENING NOW (240-300, 2.0s)
// ---------------------------------------------------------------------------

function SceneLaunch() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big wipe in from scene D
  const wipeT = easeT(frame, 0, 14, Easing.out(Easing.cubic));
  const headlineT = springy(frame, fps, 6, { damping: 11, stiffness: 150 });
  const nowPulse = 1 + Math.sin(frame / 3) * 0.08;
  const bannerT = springy(frame, fps, 18);
  const ctaT = springy(frame, fps, 32, { damping: 11, stiffness: 130 });

  // 3D die continuous rotation
  const dieX = -22 + frame * 12;
  const dieY = -28 + frame * 16;

  return (
    <AbsoluteFill
      style={{
        background: palette.ink,
        fontFamily: fontStack,
        color: palette.paper,
        overflow: "hidden"
      }}
    >
      {/* Wipe-in layer (appears to wipe from the prior scene) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.paper,
          clipPath: `polygon(0 0, ${100 - wipeT * 100}% 0, ${100 - wipeT * 100 + 15}% 100%, 0 100%)`
        }}
      />

      {/* Rays background */}
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * 360;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 1600,
              height: 60,
              background: i % 2 === 0 ? palette.mint : palette.pink,
              border: `3px solid ${palette.ink}`,
              transformOrigin: "0 50%",
              transform: `rotate(${angle + frame * 1.8}deg) translateY(-50%)`,
              opacity: 0.16
            }}
          />
        );
      })}

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "10px 22px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 12,
            background: palette.red,
            color: palette.ink,
            fontSize: 28,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            boxShadow: `6px 6px 0 ${palette.ink}`,
            transform: `scale(${nowPulse})`,
            opacity: headlineT
          }}
        >
          · Launch Event ·
        </div>

        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            lineHeight: 0.92,
            textTransform: "uppercase",
            textAlign: "center",
            transform: `scale(${headlineT})`,
            color: palette.paper,
            letterSpacing: "-0.01em"
          }}
        >
          Dice Board<br />is live.
        </div>

        {/* Die + quick chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 44,
            marginTop: 6,
            transform: `translateY(${(1 - bannerT) * 30}px)`,
            opacity: bannerT
          }}
        >
          <div style={{ perspective: 800, width: 160, height: 160, display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: 160,
                height: 160,
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
                    border: `7px solid ${palette.ink}`,
                    borderRadius: 18,
                    background: palette.white,
                    transform: face.transform,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gridTemplateRows: "repeat(3, 1fr)",
                    padding: 18,
                    gap: 4
                  }}
                >
                  {renderPips(face.value)}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "14px 22px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 12,
              background: palette.yellow,
              color: palette.ink,
              fontSize: 28,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              boxShadow: `7px 7px 0 ${palette.ink}`,
              transform: `scale(${nowPulse})`
            }}
          >
            Happening now · 1 roll per quest · Finish loop → sticker
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "18px 30px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.mint,
            color: palette.ink,
            fontSize: 40,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            boxShadow: `10px 10px 0 ${palette.ink}`,
            transform: `scale(${ctaT})`
          }}
        >
          sidequester.us / gameboard-ltd →
        </div>
      </div>
    </AbsoluteFill>
  );
}

const dieFaces = [
  { key: "front", value: 1, transform: "translateZ(80px)" },
  { key: "back", value: 6, transform: "rotateY(180deg) translateZ(80px)" },
  { key: "top", value: 2, transform: "rotateX(90deg) translateZ(80px)" },
  { key: "bottom", value: 5, transform: "rotateX(-90deg) translateZ(80px)" },
  { key: "right", value: 3, transform: "rotateY(90deg) translateZ(80px)" },
  { key: "left", value: 4, transform: "rotateY(-90deg) translateZ(80px)" }
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
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: palette.ink,
        boxShadow: "inset -2px -2px 0 rgba(255,255,255,0.22)"
      }}
    />
  ));
}

// ---------------------------------------------------------------------------
// Root composition: 300 frames @ 30fps = 10s
// Click sounds fire at the exact global frames the cursor lands.
// ---------------------------------------------------------------------------

export function SideQuestAdReel() {
  return (
    <AbsoluteFill style={{ background: palette.paper }}>
      {/* Ambient bed across the whole reel */}
      <Audio src={staticFile("bg-pulse.wav")} volume={0.32} />

      {/* Scene clips */}
      <Sequence from={0} durationInFrames={27}>
        <SceneIntro />
      </Sequence>
      <Sequence from={27} durationInFrames={63}>
        <SceneCreate />
      </Sequence>
      <Sequence from={90} durationInFrames={72}>
        <SceneComplete />
      </Sequence>
      <Sequence from={162} durationInFrames={78}>
        <SceneFeatures />
      </Sequence>
      <Sequence from={240} durationInFrames={60}>
        <SceneLaunch />
      </Sequence>

      {/* SFX — the click/pop/ding events */}
      <Sequence from={58} durationInFrames={6}>
        <Audio src={staticFile("click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={125} durationInFrames={6}>
        <Audio src={staticFile("click.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={128} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={240} durationInFrames={30}>
        <Audio src={staticFile("ding.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
}
