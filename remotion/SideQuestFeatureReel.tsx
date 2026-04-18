import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

export type FeatureReelVariant = "create" | "party" | "rewards";

const palette = {
  ink: "#171512",
  paper: "#f8efd9",
  surface: "#fffaf0",
  red: "#ff5a3d",
  yellow: "#ffd43d",
  mint: "#44d7a8",
  sky: "#5fc7f2",
  pink: "#ff78b7",
  blue: "#4667ff"
};

const copy: Record<
  FeatureReelVariant,
  {
    label: string;
    title: string;
    detail: string;
    accent: string;
  }
> = {
  create: {
    label: "Quest Drop",
    title: "Task becomes mission.",
    detail: "Pick lane. Add steps. Send it.",
    accent: palette.red
  },
  party: {
    label: "Party Ping",
    title: "Squad sees the move.",
    detail: "Private updates. No public ranks.",
    accent: palette.sky
  },
  rewards: {
    label: "Clear Screen",
    title: "Finish with pop.",
    detail: "Stickers. Streaks. Confetti.",
    accent: palette.mint
  }
};

function cardStyle(index: number, accent: string, frame: number) {
  const y = interpolate(frame, [index * 14, index * 14 + 22], [90, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return {
    transform: `translateY(${y}px) rotate(${index === 1 ? "-3deg" : index === 2 ? "2deg" : "0deg"})`,
    opacity: interpolate(frame, [index * 12, index * 12 + 14], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    }),
    background: index === 0 ? accent : index === 1 ? palette.yellow : palette.pink
  };
}

function VariantVisual({
  accent,
  frame,
  variant
}: {
  accent: string;
  frame: number;
  variant: FeatureReelVariant;
}) {
  if (variant === "party") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 44,
            width: 390,
            height: 420,
            border: `7px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.surface,
            boxShadow: `12px 12px 0 ${palette.ink}`
          }}
        />
        {["AV", "JY", "NR", "LE"].map((initials, index) => (
          <div
            key={initials}
            style={{
              position: "absolute",
              right: 72 + index * 74,
              top: 82,
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `5px solid ${palette.ink}`,
              borderRadius: 8,
              background: [palette.red, palette.yellow, palette.mint, palette.sky][index],
              fontSize: 21,
              fontWeight: 900,
              opacity: interpolate(frame, [8 + index * 6, 20 + index * 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              })
            }}
          >
            {initials}
          </div>
        ))}
        {["Ava claimed slide 3", "Jay added cover art", "You hit 75%"].map((message, index) => (
          <div
            key={message}
            style={{
              position: "absolute",
              left: 32 + index * 38,
              top: 254 + index * 72,
              width: 330,
              padding: 18,
              border: `6px solid ${palette.ink}`,
              borderRadius: 8,
              background: index === 1 ? palette.yellow : accent,
              boxShadow: `8px 8px 0 ${palette.ink}`,
              fontSize: 25,
              fontWeight: 900,
              opacity: interpolate(frame, [18 + index * 14, 34 + index * 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }),
              transform: `translateX(${interpolate(frame, [18 + index * 14, 34 + index * 14], [80, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              })}px)`
            }}
          >
            {message}
          </div>
        ))}
      </>
    );
  }

  if (variant === "rewards") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 74,
            width: 430,
            height: 360,
            border: `7px solid ${palette.ink}`,
            borderRadius: 8,
            background:
              "linear-gradient(180deg, transparent 0 31%, #171512 31% 33%, transparent 33% 64%, #171512 64% 66%, transparent 66%), #fffaf0",
            boxShadow: `12px 12px 0 ${palette.ink}`
          }}
        />
        {["sticker-star.png", "sticker-bolt.png", "sticker-shield.png"].map((image, index) => (
          <Img
            key={image}
            src={staticFile(image)}
            style={{
              position: "absolute",
              left: 42 + index * 126,
              top: 250 + (index % 2) * 54,
              width: 112,
              filter: `drop-shadow(8px 8px 0 ${palette.ink})`,
              opacity: interpolate(frame, [24 + index * 13, 42 + index * 13], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              }),
              transform: `scale(${interpolate(frame, [24 + index * 13, 42 + index * 13], [0.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp"
              })}) rotate(${index === 1 ? "-12deg" : "10deg"})`
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 34,
            bottom: 78,
            width: 388,
            padding: 20,
            border: `6px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.yellow,
            boxShadow: `8px 8px 0 ${palette.ink}`,
            fontSize: 34,
            fontWeight: 900
          }}
        >
          QUEST CLEARED
        </div>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          right: 42,
          top: 44,
          width: 390,
          height: 390,
          padding: 26,
          border: `7px solid ${palette.ink}`,
          borderRadius: 8,
          background: palette.surface,
          boxShadow: `12px 12px 0 ${palette.ink}`,
          fontWeight: 900
        }}
      >
        <div
          style={{
            padding: "13px 16px",
            border: `5px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.yellow,
            fontSize: 28
          }}
        >
          NEW QUEST
        </div>
        <div
          style={{
            marginTop: 24,
            height: 52,
            border: `5px solid ${palette.ink}`,
            borderRadius: 8,
            background: palette.paper
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginTop: 18
          }}
        >
          {[palette.red, palette.sky, palette.mint, palette.pink].map((color) => (
            <div
              key={color}
              style={{
                height: 58,
                border: `5px solid ${palette.ink}`,
                borderRadius: 8,
                background: color
              }}
            />
          ))}
        </div>
      </div>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 20 + index * 46,
            bottom: 86 - index * 20,
            width: 235,
            minHeight: 114,
            padding: 18,
            border: `6px solid ${palette.ink}`,
            borderRadius: 8,
            boxShadow: `8px 8px 0 ${palette.ink}`,
            fontSize: 24,
            fontWeight: 900,
            ...cardStyle(index, accent, frame)
          }}
        >
          <span style={{ display: "block", fontSize: 18 }}>STEP {index + 1}</span>
          {index === 0 ? "Name it" : index === 1 ? "Pick lane" : "Drop XP"}
        </div>
      ))}
    </>
  );
}

export function SideQuestFeatureReel({
  variant = "create"
}: {
  variant?: FeatureReelVariant;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = copy[variant];
  const titleIn = spring({ frame, fps, config: { damping: 13, stiffness: 110 } });
  const progress = interpolate(frame, [36, 112], [18, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const burst = interpolate(frame, [102, 118, 142], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(90deg, rgba(23,21,18,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(23,21,18,0.08) 1px, transparent 1px), #f8efd9",
        backgroundSize: "42px 42px",
        color: palette.ink,
        fontFamily: '"Trebuchet MS", Arial, sans-serif',
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 54,
          border: `8px solid ${palette.ink}`,
          borderRadius: 8,
          background: palette.surface,
          boxShadow: `16px 16px 0 ${palette.ink}`,
          overflow: "hidden"
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 94,
          top: 88,
          width: 474,
          transform: `translateX(${interpolate(titleIn, [0, 1], [-40, 0])}px)`,
          opacity: titleIn
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "12px 18px",
            border: `6px solid ${palette.ink}`,
            borderRadius: 8,
            background: scene.accent,
            fontSize: 28,
            fontWeight: 900
          }}
        >
          {scene.label}
        </div>
        <h1
          style={{
            margin: "22px 0 16px",
            fontSize: 68,
            lineHeight: 0.96,
            fontWeight: 900,
            letterSpacing: 0
          }}
        >
          {scene.title}
        </h1>
        <p
          style={{
            width: 420,
            margin: 0,
            fontSize: 27,
            lineHeight: 1.18,
            fontWeight: 800
          }}
        >
          {scene.detail}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          right: 92,
          top: 78,
          width: 480,
          height: 500,
          transform: `rotate(${interpolate(frame, [0, 150], [-1, 1])}deg)`
        }}
      >
        <VariantVisual accent={scene.accent} frame={frame} variant={variant} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          bottom: 82,
          width: 520,
          height: 34,
          border: `6px solid ${palette.ink}`,
          borderRadius: 8,
          background: palette.paper,
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: scene.accent,
            borderRight: `6px solid ${palette.ink}`
          }}
        />
      </div>

      {Array.from({ length: 18 }, (_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: 690 + Math.cos(index) * 200,
            top: 270 + Math.sin(index * 1.7) * 160,
            width: 18,
            height: 26,
            border: `4px solid ${palette.ink}`,
            borderRadius: 4,
            background: [palette.red, palette.yellow, palette.mint, palette.sky, palette.pink][index % 5],
            opacity: burst,
            transform: `translateY(${interpolate(burst, [0, 1], [24, -80])}px) rotate(${index * 23}deg)`
          }}
        />
      ))}
    </AbsoluteFill>
  );
}
