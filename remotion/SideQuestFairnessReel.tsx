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
 * 20s explainer for the High Roller commit-reveal fairness system.
 *
 * Scene map (600 frames @ 30fps):
 *   0   -  90  Hook — "PROVABLY FAIR · how we prove we can't cheat"
 *   90  - 240  Commit — server picks outcome + nonce, sha256s them
 *   240 - 390  Seal — hash ships to your browser; outcome stays locked
 *   390 - 510  Reveal — you flip, server reveals outcome + nonce
 *   510 - 600  Verify — browser recomputes sha256, match → ✓; outro
 *
 * Closes with a 1.2s radial collapse so the TutorialPlayer's sync-dismiss
 * overlay can pair with it (syncTail = 1.2 on the client).
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
  blue: "#4667ff",
  gold: "#f1b42b"
} as const;

const fontStack = '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';
const monoStack = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace';

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
  const drift = frame * 0.6;
  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        ...bgGrid(0.055, 64),
        backgroundPosition: `${drift}px ${drift * 0.3}px`,
        fontFamily: fontStack,
        color: palette.ink
      }}
    />
  );
}

// =============================================================================
// Shared UI pieces
// =============================================================================

function SceneHeader({ num, kicker, title, frame }: { num: string; kicker: string; title: string; frame: number }) {
  const slide = easeT(frame, 0, 18, Easing.out(Easing.cubic));
  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 100,
        transform: `translateX(${(1 - slide) * -80}px)`,
        opacity: slide,
        display: "flex",
        alignItems: "center",
        gap: 28
      }}
    >
      <span
        style={{
          width: 96,
          height: 96,
          background: palette.ink,
          color: palette.yellow,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 52,
          fontWeight: 900,
          boxShadow: `10px 10px 0 ${palette.red}`
        }}
      >
        {num}
      </span>
      <div>
        <div
          style={{
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.32em",
            opacity: 0.7,
            marginBottom: 6
          }}
        >
          {kicker}
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
    </div>
  );
}

function Chip({
  x,
  y,
  bg = palette.yellow,
  children,
  tilt = -3,
  opacity = 1,
  scale = 1,
  big = false
}: {
  x: number;
  y: number;
  bg?: string;
  children: React.ReactNode;
  tilt?: number;
  opacity?: number;
  scale?: number;
  big?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: big ? "20px 34px" : "12px 22px",
        fontSize: big ? 32 : 22,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        background: bg,
        border: `4px solid ${palette.ink}`,
        borderRadius: 14,
        boxShadow: `6px 6px 0 ${palette.ink}`,
        transform: `rotate(${tilt}deg) scale(${scale})`,
        transformOrigin: "center",
        opacity
      }}
    >
      {children}
    </div>
  );
}

function HashString({
  value,
  fontSize = 26,
  color = palette.yellow,
  bg = palette.ink,
  revealProgress = 1
}: {
  value: string;
  fontSize?: number;
  color?: string;
  bg?: string;
  revealProgress?: number;
}) {
  const shown = Math.max(0, Math.min(value.length, Math.round(value.length * revealProgress)));
  const display = value.slice(0, shown).padEnd(value.length, "·");
  return (
    <code
      style={{
        fontFamily: monoStack,
        fontSize,
        letterSpacing: "0.08em",
        background: bg,
        color,
        padding: "10px 16px",
        borderRadius: 8,
        display: "inline-block",
        fontWeight: 700
      }}
    >
      {display}
    </code>
  );
}

// =============================================================================
// Scene 1 — Hook (0-90)
// =============================================================================

function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = easeT(frame, 4, 30, Easing.out(Easing.cubic));
  const subIn = easeT(frame, 22, 46);
  const coinT = springy(frame, fps, 8, { mass: 0.5, stiffness: 120, damping: 12 });

  const spinDeg = frame * 10;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 28
      }}
    >
      <Chip
        x={70}
        y={60}
        bg={palette.red}
        tilt={-3}
        opacity={titleIn}
      >
        <span style={{ color: palette.white }}>★ High Roller · Fairness</span>
      </Chip>

      {/* Coin with rotation */}
      <div
        style={{
          width: 260,
          height: 260,
          perspective: 900,
          transform: `scale(${coinT}) translateY(${(1 - coinT) * -40}px)`,
          marginBottom: 30
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${spinDeg}deg)`
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${palette.yellow}, ${palette.gold})`,
              border: `8px solid ${palette.ink}`,
              boxShadow: `12px 12px 0 ${palette.ink}`,
              backfaceVisibility: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 900,
              color: palette.ink
            }}
          >
            H
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 70% 30%, ${palette.paper}, ${palette.paperDeep})`,
              border: `8px solid ${palette.ink}`,
              boxShadow: `12px 12px 0 ${palette.ink}`,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 900,
              color: palette.ink
            }}
          >
            T
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          textAlign: "center",
          lineHeight: 0.95,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 30}px)`,
          textShadow: `8px 8px 0 ${palette.yellow}`
        }}
      >
        IS THIS COIN
        <br />
        RIGGED?
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: subIn,
          transform: `translateY(${(1 - subIn) * 20}px)`,
          background: palette.mint,
          padding: "14px 26px",
          border: `4px solid ${palette.ink}`,
          borderRadius: 999,
          boxShadow: `6px 6px 0 ${palette.ink}`
        }}
      >
        Here&apos;s how to be sure it isn&apos;t.
      </div>
    </AbsoluteFill>
  );
}

// =============================================================================
// Scene 2 — The Commitment (90-240)
// =============================================================================

function SceneCommit() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Server panel slides in; coin picks an outcome; nonce appears; sha256 runs.
  const panelT = easeT(frame, 0, 20);
  const coinDropT = springy(frame, fps, 16);
  const outcomeStampT = springy(frame, fps, 44, { damping: 10 });
  const nonceT = easeT(frame, 60, 88);

  // Hash characters reveal in sequence from frame 90 → 130
  const hashReveal = easeT(frame, 88, 130, Easing.inOut(Easing.cubic));

  // Lock swings shut around the hash at frame 130-148
  const lockT = springy(frame, fps, 130, { stiffness: 200, damping: 14 });

  return (
    <AbsoluteFill>
      <SceneHeader num="01" kicker="The Commit" title="Pick first. Lock it." frame={frame} />

      {/* Server panel */}
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 130,
          width: 620,
          padding: 32,
          background: palette.surface,
          border: `6px solid ${palette.ink}`,
          borderRadius: 20,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          transform: `translateX(${(1 - panelT) * -120}px)`,
          opacity: panelT
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <span style={{ fontSize: 32 }}>🖥️</span> SERVER
        </div>

        {/* Coin "drops" */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 20 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${palette.yellow}, ${palette.gold})`,
              border: `6px solid ${palette.ink}`,
              boxShadow: `6px 6px 0 ${palette.ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 900,
              transform: `translateY(${(1 - coinDropT) * -80}px) scale(${coinDropT})`
            }}
          >
            H
          </div>
          <div style={{ fontSize: 38, fontWeight: 900 }}>
            Picks:{" "}
            <span
              style={{
                background: palette.yellow,
                padding: "4px 16px",
                border: `4px solid ${palette.ink}`,
                borderRadius: 10,
                display: "inline-block",
                transform: `scale(${outcomeStampT})`,
                transformOrigin: "left center"
              }}
            >
              HEADS
            </span>
          </div>
        </div>

        {/* Nonce */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              opacity: nonceT,
              marginBottom: 6
            }}
          >
            + Random nonce
          </div>
          <div style={{ opacity: nonceT, transform: `translateX(${(1 - nonceT) * -20}px)` }}>
            <HashString value="a3f91c4b28d6e017" fontSize={24} bg={palette.ink} color={palette.sky} />
          </div>
        </div>

        {/* SHA256 arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "0.1em",
            opacity: hashReveal
          }}
        >
          <span style={{ color: palette.red }}>sha256 ⟶</span>
          <HashString
            value="7f4c8e91a3d2b0f6e8c4a7b9d1f2e3c5"
            fontSize={20}
            revealProgress={hashReveal}
            color={palette.yellow}
          />
        </div>
      </div>

      {/* Lock/seal on the right */}
      <div
        style={{
          position: "absolute",
          top: 320,
          right: 140,
          width: 360,
          height: 420,
          opacity: panelT
        }}
      >
        {/* Safe body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: palette.ink,
            border: `6px solid ${palette.ink}`,
            borderRadius: 24,
            boxShadow: `12px 12px 0 ${palette.red}`
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 30,
            right: 30,
            bottom: 80,
            background: palette.paper,
            border: `4px solid ${palette.yellow}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 12
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.7
            }}
          >
            Sealed commitment
          </div>
          <HashString
            value="7f4c8e91a3d2b0f6"
            fontSize={18}
            revealProgress={hashReveal}
            color={palette.ink}
            bg={palette.yellow}
          />
          <HashString
            value="e8c4a7b9d1f2e3c5"
            fontSize={18}
            revealProgress={hashReveal}
            color={palette.ink}
            bg={palette.yellow}
          />
        </div>
        {/* Padlock */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: `translateX(-50%) rotate(${(1 - lockT) * -25}deg) scale(${0.7 + lockT * 0.3})`,
            transformOrigin: "50% 0%",
            fontSize: 80
          }}
        >
          🔒
        </div>
      </div>
    </AbsoluteFill>
  );
}

// =============================================================================
// Scene 3 — Seal delivery (240-390)
// =============================================================================

function SceneSeal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The sealed hash package flies from server → browser
  const slideT = easeT(frame, 12, 80, Easing.inOut(Easing.cubic));
  const browserT = springy(frame, fps, 0);

  // The browser panel highlights that only the hash is visible
  const revealT = easeT(frame, 80, 112);
  const strikeT = easeT(frame, 98, 118);

  const packageX = interpolate(slideT, [0, 1], [0, 1000]);

  return (
    <AbsoluteFill>
      <SceneHeader num="02" kicker="Delivery" title="You see only the seal." frame={frame} />

      {/* Server on left (small) */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 110,
          width: 180,
          height: 180,
          background: palette.ink,
          border: `6px solid ${palette.ink}`,
          borderRadius: 20,
          boxShadow: `8px 8px 0 ${palette.red}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 90,
          opacity: 0.85
        }}
      >
        🖥️
      </div>

      {/* Package in motion */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 320 + packageX * 0.6,
          width: 160,
          height: 160,
          background: palette.yellow,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          boxShadow: `8px 8px 0 ${palette.ink}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transform: `rotate(${slideT * 360}deg)`
        }}
      >
        <div style={{ fontSize: 56 }}>📨</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: monoStack
          }}
        >
          7f4c…e3c5
        </div>
      </div>

      {/* Browser on right */}
      <div
        style={{
          position: "absolute",
          top: 240,
          right: 130,
          width: 620,
          height: 440,
          background: palette.white,
          border: `6px solid ${palette.ink}`,
          borderRadius: 20,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          transform: `scale(${browserT})`,
          transformOrigin: "center"
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "16px 22px",
            borderBottom: `4px solid ${palette.ink}`
          }}
        >
          {[palette.red, palette.yellow, palette.mint].map((c) => (
            <span
              key={c}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: c,
                border: `2px solid ${palette.ink}`
              }}
            />
          ))}
          <div
            style={{
              marginLeft: 16,
              fontFamily: monoStack,
              fontSize: 16,
              fontWeight: 700,
              opacity: 0.75
            }}
          >
            sidequest.app / highroller
          </div>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Provably fair · next flip sealed</div>
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                opacity: 0.7,
                marginBottom: 4
              }}
            >
              Sealed hash
            </div>
            <HashString value="7f4c8e91a3d2b0f6e8c4a7b9d1f2e3c5" fontSize={22} revealProgress={revealT} />
          </div>

          {/* "Outcome: ???" crossed out */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              padding: "12px 20px",
              background: palette.paperDeep,
              border: `4px dashed ${palette.ink}`,
              borderRadius: 10,
              fontSize: 24,
              fontWeight: 900
            }}
          >
            Outcome: <span style={{ opacity: 0.35 }}>???</span>
            {strikeT > 0 ? (
              <span
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  top: "50%",
                  height: 6,
                  background: palette.red,
                  transformOrigin: "left",
                  transform: `translateY(-50%) scaleX(${strikeT})`
                }}
              />
            ) : null}
          </div>

          <div style={{ marginTop: 26, fontSize: 18, fontWeight: 700, opacity: 0.75, lineHeight: 1.4 }}>
            The hash is locked. You can&apos;t reverse it to learn the outcome — that would take billions of years.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// =============================================================================
// Scene 4 — The Reveal (390-510)
// =============================================================================

function SceneReveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Button press → coin spins → lands → padlock unlocks → reveal pops
  const buttonT = springy(frame, fps, 2);
  const pressT = frame >= 22 && frame < 34 ? 1 : 0;
  const flipRot = interpolate(frame, [30, 80], [0, 1800], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });
  const unlockT = springy(frame, fps, 72, { damping: 12 });
  const revealPopT = springy(frame, fps, 82, { damping: 9 });

  return (
    <AbsoluteFill>
      <SceneHeader num="03" kicker="Reveal" title="You flip. It opens." frame={frame} />

      {/* Flip button */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 360,
          transform: `scale(${buttonT - pressT * 0.08})`,
          background: palette.yellow,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          padding: "26px 48px",
          fontSize: 40,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          boxShadow: pressT ? `3px 3px 0 ${palette.ink}` : `10px 10px 0 ${palette.ink}`
        }}
      >
        FLIP →
      </div>

      {/* Coin spinning at center */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: "50%",
          transform: "translateX(-50%)",
          width: 240,
          height: 240,
          perspective: 900
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${flipRot}deg)`
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${palette.yellow}, ${palette.gold})`,
              border: `8px solid ${palette.ink}`,
              boxShadow: `10px 10px 0 ${palette.ink}`,
              backfaceVisibility: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 900
            }}
          >
            H
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 70% 30%, ${palette.paper}, ${palette.paperDeep})`,
              border: `8px solid ${palette.ink}`,
              boxShadow: `10px 10px 0 ${palette.ink}`,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 900
            }}
          >
            T
          </div>
        </div>
      </div>

      {/* Reveal card on right */}
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 280,
          width: 500,
          padding: 26,
          background: palette.mint,
          border: `6px solid ${palette.ink}`,
          borderRadius: 18,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          transform: `scale(${revealPopT}) rotate(${(1 - revealPopT) * 5}deg)`,
          transformOrigin: "top right"
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            opacity: 0.7,
            marginBottom: 10
          }}
        >
          REVEAL
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 18 }}>
          Outcome: <span style={{ background: palette.yellow, padding: "2px 12px", border: `4px solid ${palette.ink}`, borderRadius: 8 }}>HEADS</span>
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            opacity: 0.75,
            marginBottom: 6
          }}
        >
          Nonce
        </div>
        <HashString value="a3f91c4b28d6e017" fontSize={20} bg={palette.ink} color={palette.sky} />
      </div>

      {/* Unlocked padlock at bottom right */}
      <div
        style={{
          position: "absolute",
          right: 200,
          bottom: 60,
          fontSize: 90,
          transform: `rotate(${unlockT * 20}deg) scale(${unlockT})`,
          opacity: unlockT
        }}
      >
        🔓
      </div>
    </AbsoluteFill>
  );
}

// =============================================================================
// Scene 5 — Verify + Outro (510-600)
// =============================================================================

function SceneVerify() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Recompute sha256 on the client
  const computeT = easeT(frame, 4, 36);
  const matchT = springy(frame, fps, 32, { damping: 10 });
  const outroT = easeT(frame, 50, 78);

  // Outro radial collapse (matches client syncTail = 1.2s, 36 frames)
  const collapse = easeT(frame, 54, 90, Easing.inOut(Easing.cubic));
  const radius = interpolate(collapse, [0, 1], [180, 0]);
  const dim = interpolate(collapse, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <SceneHeader num="04" kicker="Verify" title="Math does the rest." frame={frame} />

      {/* Left: recomputed sha */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 120,
          width: 680,
          padding: 30,
          background: palette.surface,
          border: `6px solid ${palette.ink}`,
          borderRadius: 20,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          opacity: computeT
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.7, marginBottom: 12 }}>
          Browser recomputes
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 18 }}>
          sha256(<span style={{ color: palette.red }}>HEADS</span>:<span style={{ color: palette.sky }}>a3f91c4b…</span>)
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.65, marginBottom: 6 }}>
          Result
        </div>
        <HashString value="7f4c8e91a3d2b0f6e8c4a7b9d1f2e3c5" fontSize={22} revealProgress={computeT} />
        <div style={{ marginTop: 14, fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.65, marginBottom: 6 }}>
          Sealed hash
        </div>
        <HashString value="7f4c8e91a3d2b0f6e8c4a7b9d1f2e3c5" fontSize={22} revealProgress={1} color={palette.ink} bg={palette.yellow} />
      </div>

      {/* Right: big green check */}
      <div
        style={{
          position: "absolute",
          right: 140,
          top: 300,
          width: 360,
          height: 360,
          background: palette.mint,
          border: `8px solid ${palette.ink}`,
          borderRadius: 24,
          boxShadow: `14px 14px 0 ${palette.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          transform: `scale(${matchT}) rotate(${(1 - matchT) * -6}deg)`
        }}
      >
        <div style={{ fontSize: 180, lineHeight: 1 }}>✓</div>
        <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "0.04em" }}>MATCH</div>
      </div>

      {/* Outro strip */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 80,
          transform: `translateX(-50%) translateY(${(1 - outroT) * 40}px)`,
          opacity: outroT,
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: palette.ink,
          color: palette.yellow,
          padding: "18px 44px",
          border: `6px solid ${palette.ink}`,
          borderRadius: 999,
          boxShadow: `10px 10px 0 ${palette.red}`
        }}
      >
        Provably fair. Every flip.
      </div>

      {/* Radial collapse outro (last 36 frames) */}
      {collapse > 0 ? (
        <AbsoluteFill
          style={{
            background: palette.ink,
            clipPath: `circle(${radius}% at 50% 55%)`,
            opacity: 1
          }}
        />
      ) : null}
      {dim > 0 ? (
        <AbsoluteFill
          style={{
            background: palette.ink,
            opacity: dim * 0.25
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
}

// =============================================================================
// Root
// =============================================================================

export function SideQuestFairnessReel() {
  return (
    <AbsoluteFill>
      <Backdrop />

      <Audio src={staticFile("tutorial-bed.wav")} volume={0.65} />

      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>
      <Sequence from={90} durationInFrames={150}>
        <SceneCommit />
      </Sequence>
      <Sequence from={240} durationInFrames={150}>
        <SceneSeal />
      </Sequence>
      <Sequence from={390} durationInFrames={120}>
        <SceneReveal />
      </Sequence>
      <Sequence from={510} durationInFrames={90}>
        <SceneVerify />
      </Sequence>

      {/* SFX layering */}
      <Sequence from={6} durationInFrames={14}>
        <Audio src={staticFile("whoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={24} durationInFrames={16}>
        <Audio src={staticFile("pop.wav")} volume={0.6} />
      </Sequence>

      {/* Commit: coin thud + typewriter clicks for hash */}
      <Sequence from={108} durationInFrames={14}>
        <Audio src={staticFile("thud.wav")} volume={0.55} />
      </Sequence>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Sequence key={`c-${i}`} from={178 + i * 5} durationInFrames={5}>
          <Audio src={staticFile("click.wav")} volume={0.32} />
        </Sequence>
      ))}
      {/* Padlock click */}
      <Sequence from={220} durationInFrames={12}>
        <Audio src={staticFile("thud.wav")} volume={0.7} />
      </Sequence>

      {/* Seal: whoosh on delivery */}
      <Sequence from={250} durationInFrames={18}>
        <Audio src={staticFile("whoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={330} durationInFrames={14}>
        <Audio src={staticFile("pop.wav")} volume={0.45} />
      </Sequence>

      {/* Reveal: click button, flip clicks, ding on reveal */}
      <Sequence from={412} durationInFrames={10}>
        <Audio src={staticFile("click.wav")} volume={0.6} />
      </Sequence>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Sequence key={`f-${i}`} from={420 + i * 8} durationInFrames={6}>
          <Audio src={staticFile("click.wav")} volume={0.4} />
        </Sequence>
      ))}
      <Sequence from={472} durationInFrames={18}>
        <Audio src={staticFile("ding.wav")} volume={0.55} />
      </Sequence>

      {/* Verify: ding on match + whoosh on outro */}
      <Sequence from={542} durationInFrames={22}>
        <Audio src={staticFile("ding.wav")} volume={0.75} />
      </Sequence>
      <Sequence from={564} durationInFrames={28}>
        <Audio src={staticFile("whoosh.wav")} volume={0.45} />
      </Sequence>
    </AbsoluteFill>
  );
}
