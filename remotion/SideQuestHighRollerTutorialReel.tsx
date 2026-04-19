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
 * 25s first-visit tutorial for /highroller-ltd. Hook → 3 steps → outro.
 *
 * Scene map (750 frames @ 30fps):
 *   0   -  90  Hook
 *   90  - 270  Step 01 — Earn a flip token
 *   270 - 450  Step 02 — Press your luck
 *   450 - 630  Step 03 — Climb to rung 10
 *   630 - 750  Outro — radial collapse + badge bloom (the player container
 *              fades + scales out in sync over the same 1.2s window)
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

function Backdrop() {
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
      <Drift x={-140} y={200} color={palette.red} glyph="🪙" rot={-8} size={170} phase={0} />
      <Drift x={1700} y={280} color={palette.yellow} glyph="✺" rot={10} size={160} phase={1} />
      <Drift x={120} y={780} color={palette.mint} glyph="★" rot={-6} size={150} phase={2} />
      <Drift x={1640} y={840} color={palette.pink} glyph="◆" rot={6} size={150} phase={3} />
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
        opacity: 0.5
      }}
    >
      {glyph}
    </div>
  );
}

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
// Hook
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
          New event · High Roller
        </div>

        <div
          style={{
            fontSize: 172,
            fontWeight: 900,
            textTransform: "uppercase",
            lineHeight: 0.9,
            textAlign: "center",
            letterSpacing: "-0.01em",
            textShadow: `7px 7px 0 ${palette.yellow}`,
            transform: `scale(${titleT})`
          }}
        >
          Coin Tower.
        </div>

        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: subT,
            transform: `translateY(${(1 - subT) * 24}px)`,
            textAlign: "center",
            maxWidth: "70%"
          }}
        >
          Pure luck · 10 rungs · 1 badge
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Step 01 — Earn a flip
// ---------------------------------------------------------------------------

function SceneStep1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const cardT = springy(frame, fps, 30, { damping: 12 });
  const progress = interpolate(frame, [52, 100], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const checkT = springy(frame, fps, 100, { damping: 8, stiffness: 140 });
  const tokenT = springy(frame, fps, 116, { damping: 9, stiffness: 130 });
  const captionT = easeT(frame, 130, 150);

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="01" title="Earn a flip token." tint={palette.mint} />

      <div
        style={{
          position: "absolute",
          left: 120,
          top: 480,
          width: 980,
          padding: "30px 36px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 20,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `translateY(${(1 - cardT) * 50}px) scale(${cardT})`,
          opacity: cardT
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
            letterSpacing: "0.08em"
          }}
        >
          ANY QUEST
        </div>
        <div style={{ marginTop: 16, fontSize: 56, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Clear it. Earn 1 flip.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 28 }}>
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
          <div style={{ minWidth: 110, textAlign: "right", fontSize: 40, fontWeight: 900, fontFamily: "ui-monospace, Menlo, monospace" }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Mint check stamp */}
      {frame > 96 ? (
        <div
          style={{
            position: "absolute",
            right: 600,
            top: 460,
            width: 180,
            height: 180,
            display: "grid",
            placeItems: "center",
            border: `8px solid ${palette.ink}`,
            borderRadius: "50%",
            background: palette.mint,
            color: palette.ink,
            boxShadow: `10px 10px 0 ${palette.ink}`,
            fontSize: 130,
            lineHeight: 1,
            transform: `scale(${checkT}) rotate(${(1 - checkT) * -30 + (checkT - 1) * 12}deg)`
          }}
        >
          ✓
        </div>
      ) : null}

      {/* Flip token coin pops out */}
      {frame > 112 ? (
        <div
          style={{
            position: "absolute",
            right: 220,
            top: 460,
            width: 200,
            height: 200,
            display: "grid",
            placeItems: "center",
            border: `8px solid ${palette.ink}`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, #fff5c2, ${palette.yellow} 70%)`,
            color: palette.ink,
            boxShadow: `12px 12px 0 ${palette.ink}`,
            fontSize: 110,
            fontWeight: 900,
            fontFamily: "ui-monospace, Menlo, monospace",
            transform: `scale(${tokenT}) rotate(${(1 - tokenT) * 40}deg)`,
            opacity: tokenT
          }}
        >
          🪙
        </div>
      ) : null}

      {/* Connecting arrow → token */}
      {frame > 110 ? (
        <div
          style={{
            position: "absolute",
            right: 420,
            top: 530,
            fontSize: 90,
            fontWeight: 900,
            color: palette.ink,
            opacity: easeT(frame, 110, 124)
          }}
        >
          →
        </div>
      ) : null}

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
        1 quest = 1 flip token.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Step 02 — Press your luck
// ---------------------------------------------------------------------------

function SceneStep2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  // Coin spin: every ~30 frames a new flip happens. After ~120f land on tails
  // briefly, then flip again to heads to set up the climb in step 3.
  const coinAppear = springy(frame, fps, 16, { damping: 10, stiffness: 140 });
  const baseRot = -22;
  // Continuous rotation while spinning, slows around frame 130 to land.
  const spinRot = frame < 132 ? baseRot + frame * 22 : baseRot + 132 * 22 + (frame - 132) * 2;
  const finalFace = frame >= 132 ? "tails" : "spinning";

  // Faces appear/disappear based on rotation parity (cheap fake 3D)
  const showHeads = Math.floor(spinRot / 180) % 2 === 0;

  const captionT = easeT(frame, 130, 150);
  const verdictT = springy(frame, fps, 132, { damping: 10 });

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="02" title="Press your luck." tint={palette.yellow} />

      {/* Coin */}
      <div
        style={{
          position: "absolute",
          left: 960 - 160,
          top: 460,
          width: 320,
          height: 320,
          perspective: 900,
          display: "grid",
          placeItems: "center",
          opacity: coinAppear,
          transform: `scale(${coinAppear})`
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            transformStyle: "preserve-3d",
            transform: `rotateY(${spinRot}deg)`
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              border: `9px solid ${palette.ink}`,
              borderRadius: "50%",
              background: `radial-gradient(circle at 32% 28%, #fff5c2, ${palette.yellow} 70%)`,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 9 * 16,
              fontWeight: 900,
              color: palette.ink,
              backfaceVisibility: "hidden",
              boxShadow: `0 0 0 0 ${palette.ink}`,
              opacity: showHeads ? 1 : 0
            }}
          >
            H
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              border: `9px solid ${palette.ink}`,
              borderRadius: "50%",
              background: `radial-gradient(circle at 32% 28%, #ffd09a, ${palette.red} 70%)`,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 9 * 16,
              fontWeight: 900,
              color: palette.paper,
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              opacity: !showHeads ? 1 : 0
            }}
          >
            T
          </div>
        </div>
      </div>

      {/* Verdict pill on tails */}
      {finalFace === "tails" ? (
        <div
          style={{
            position: "absolute",
            left: 960 - 180,
            top: 800,
            width: 360,
            padding: "16px 18px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 14,
            background: palette.pink,
            color: palette.ink,
            boxShadow: `7px 7px 0 ${palette.ink}`,
            textAlign: "center",
            fontSize: 28,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            transform: `scale(${verdictT})`,
            opacity: verdictT
          }}
        >
          Tails — bust.
        </div>
      ) : null}

      {/* Right side: rules card */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 460,
          width: 460,
          padding: "26px 30px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          transform: `translateY(${(1 - coinAppear) * 50}px)`,
          opacity: coinAppear
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
          Coin rules
        </div>
        <ul style={{ margin: "16px 0 0", padding: 0, display: "grid", gap: 14, listStyle: "none" }}>
          <li
            style={{
              padding: "12px 14px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.mint,
              fontSize: 22,
              fontWeight: 900,
              textTransform: "uppercase"
            }}
          >
            Heads → climb +1
          </li>
          <li
            style={{
              padding: "12px 14px",
              border: `5px solid ${palette.ink}`,
              borderRadius: 10,
              background: palette.pink,
              fontSize: 22,
              fontWeight: 900,
              textTransform: "uppercase"
            }}
          >
            Tails → reset to 0
          </li>
        </ul>
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
          opacity: captionT
        }}
      >
        1 token, 50/50.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Step 03 — Climb to rung 10
// ---------------------------------------------------------------------------

function SceneStep3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = easeT(frame, 160, 180, Easing.in(Easing.cubic));

  const towerT = springy(frame, fps, 24, { damping: 12 });
  // Pawn climbs from rung 0 to rung 10 across the visible window
  const climbStart = 56;
  const climbEnd = 152;
  const pawnRung = interpolate(frame, [climbStart, climbEnd], [0, 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic)
  });
  const captionT = easeT(frame, 132, 152);

  // Tower geometry: stack of 11 rung tiles (0..10), pawn position interpolated
  // Tile height ~46px, gap 6px → row height 52, total ~570px
  const ROW = 52;
  const towerHeight = ROW * 11;
  const pawnY = (10 - pawnRung) * ROW; // top is rung 10

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        transform: `scale(${1 - exit * 0.08})`,
        opacity: 1 - exit
      }}
    >
      <StepHeader number="03" title="Climb to rung 10." tint={palette.sky} />

      <div
        style={{
          position: "absolute",
          left: 200,
          top: 460,
          width: 380,
          padding: 20,
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.paperDeep,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `scale(${towerT})`,
          opacity: towerT
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gap: 6,
            padding: 14,
            border: `4px solid ${palette.ink}`,
            borderRadius: 12,
            background: palette.paper,
            height: towerHeight + 28
          }}
        >
          {Array.from({ length: 11 }, (_, i) => 10 - i).map((r) => (
            <div
              key={r}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.45rem 0.7rem",
                height: ROW - 6,
                border: `3px solid ${palette.ink}`,
                borderRadius: 8,
                background: r === 10 ? `linear-gradient(135deg, ${palette.yellow}, #ff8a3d)` : palette.surface,
                boxShadow: `3px 3px 0 ${palette.ink}`,
                fontWeight: 900
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 32,
                  height: 32,
                  border: `3px solid ${palette.ink}`,
                  borderRadius: 6,
                  background: palette.white,
                  fontFamily: "ui-monospace, Menlo, monospace"
                }}
              >
                {r}
              </span>
              {r === 10 ? <span style={{ marginLeft: "auto", fontSize: 22 }}>🏆</span> : null}
            </div>
          ))}

          {/* Pawn */}
          <div
            style={{
              position: "absolute",
              left: 18,
              top: 14 + pawnY,
              width: 64,
              height: 36,
              display: "grid",
              placeItems: "center",
              border: `4px solid ${palette.ink}`,
              borderRadius: 999,
              background: palette.red,
              color: palette.white,
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              boxShadow: `4px 4px 0 ${palette.ink}`,
              transition: "none"
            }}
          >
            YOU
          </div>
        </div>
      </div>

      {/* Right side: climb animation explainer */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 460,
          width: 720,
          padding: "26px 30px",
          border: `7px solid ${palette.ink}`,
          borderRadius: 18,
          background: palette.surface,
          boxShadow: `11px 11px 0 ${palette.ink}`,
          opacity: easeT(frame, 30, 60),
          transform: `translateX(${(1 - easeT(frame, 30, 60)) * 60}px)`
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.7 }}>
          The climb
        </div>
        <div style={{ marginTop: 10, fontSize: 64, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95 }}>
          Heads stacks the wins.
        </div>
        <p style={{ marginTop: 18, fontSize: 22, fontWeight: 800, lineHeight: 1.4, maxWidth: "32ch" }}>
          Above rung 5, a tails only drops you 3 rungs — not back to the floor.
          Soft bust gives the upper half a fighting chance.
        </p>
        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            gap: 10,
            padding: "10px 14px",
            border: `4px solid ${palette.ink}`,
            borderRadius: 10,
            background: palette.yellow,
            boxShadow: `5px 5px 0 ${palette.ink}`,
            fontSize: 22,
            fontWeight: 900,
            textTransform: "uppercase"
          }}
        >
          <span>Rung {Math.round(pawnRung)}</span>
          <span>·</span>
          <span>peak {Math.max(0, Math.floor(pawnRung))}</span>
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
          opacity: captionT
        }}
      >
        Top the tower · win the badge.
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Outro — radial collapse + badge bloom
// ---------------------------------------------------------------------------

function SceneOutro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeT = springy(frame, fps, 4, { damping: 9, stiffness: 130 });
  const headT = springy(frame, fps, 22, { damping: 11 });
  const subT = easeT(frame, 38, 60);

  const collapse = easeT(frame, 84, 120, Easing.in(Easing.cubic));
  const scale = 1 - collapse;
  const radialRadius = (1 - collapse) * 120;

  return (
    <AbsoluteFill
      style={{
        fontFamily: fontStack,
        color: palette.ink,
        WebkitMask: `radial-gradient(circle at 50% 50%, #000 ${radialRadius}%, transparent ${radialRadius + 8}%)`,
        mask: `radial-gradient(circle at 50% 50%, #000 ${radialRadius}%, transparent ${radialRadius + 8}%)`
      }}
    >
      {/* Radiating rays — gambling slot-machine vibe */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * 360;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 1500,
              height: 64,
              background: i % 2 === 0 ? palette.red : palette.yellow,
              border: `3px solid ${palette.ink}`,
              transformOrigin: "0 50%",
              transform: `rotate(${a + frame * 1.6}deg) translateY(-50%)`,
              opacity: 0.18 * (1 - collapse)
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
          opacity: 1 - collapse
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            display: "grid",
            placeItems: "center",
            border: `10px solid ${palette.ink}`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 32% 28%, #ffe17a 0 22%, ${palette.red} 70% 100%)`,
            boxShadow: `14px 14px 0 ${palette.ink}`,
            fontSize: 200,
            transform: `scale(${badgeT}) rotate(${Math.sin(frame / 8) * 4}deg)`
          }}
        >
          🪙
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 0.92,
            textShadow: `6px 6px 0 ${palette.yellow}`,
            transform: `scale(${headT})`
          }}
        >
          Tails be damned.
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
          Make it to rung 10.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function SideQuestHighRollerTutorialReel() {
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

      {/* S1: header whoosh, check stamp thud, token ding */}
      <Sequence from={96} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={196} durationInFrames={12}>
        <Audio src={staticFile("thud.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={210} durationInFrames={20}>
        <Audio src={staticFile("ding.wav")} volume={0.55} />
      </Sequence>

      {/* S2: header whoosh, coin clicks during spin, thud on tails landing */}
      <Sequence from={276} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 1, 2, 3, 4].map((i) => (
        <Sequence key={i} from={290 + i * 12} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={402} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.7} />
      </Sequence>

      {/* S3: header whoosh, climbing footsteps, ding on rung 10 */}
      <Sequence from={456} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.5} />
      </Sequence>
      {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((i) => (
        <Sequence key={i} from={510 + i * 5} durationInFrames={5}>
          <Audio src={staticFile("click.wav")} volume={0.28} />
        </Sequence>
      ))}
      <Sequence from={595} durationInFrames={26}>
        <Audio src={staticFile("ding.wav")} volume={0.5} />
      </Sequence>

      {/* Outro */}
      <Sequence from={636} durationInFrames={28}>
        <Audio src={staticFile("ding.wav")} volume={0.85} />
      </Sequence>
      <Sequence from={714} durationInFrames={30}>
        <Audio src={staticFile("whoosh.wav")} volume={0.45} />
      </Sequence>
    </AbsoluteFill>
  );
}
