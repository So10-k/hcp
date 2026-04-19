import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

/**
 * 5s seamless loop — the primary ticket logo and the star monogram fade
 * into each other via a sinusoidal crossfade (so frame 0 and frame 150
 * are identical). Plays behind the 404 page.
 */

const palette = {
  ink: "#171512",
  paper: "#f8efd9",
  yellow: "#ffd43d",
  red: "#ff5a3d",
  mint: "#44d7a8",
  sky: "#5fc7f2",
  pink: "#ff78b7"
} as const;

function Spark({
  x, y, color, delay, spin = 1
}: { x: number; y: number; color: string; delay: number; spin?: number }) {
  const frame = useCurrentFrame();
  const size = 42;
  const bob = Math.sin((frame + delay) / 18) * 14;
  return (
    <div
      style={{
        position: "absolute",
        left: `calc(${x * 100}% - ${size / 2}px)`,
        top: `calc(${y * 100}% - ${size / 2}px + ${bob}px)`,
        width: size,
        height: size,
        background: color,
        border: `4px solid ${palette.ink}`,
        borderRadius: 10,
        boxShadow: `4px 4px 0 ${palette.ink}`,
        transform: `rotate(${(frame + delay) * 2.2 * spin}deg)`
      }}
    />
  );
}

export function SideQuestMorphLoop() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Smooth crossfade: cos wave peaks at frame 0 and frame durationInFrames
  // → frame 0 === frame durationInFrames so the loop is seamless.
  const phase = (frame % durationInFrames) / durationInFrames;
  const ticketOpacity = 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
  const starOpacity = 1 - ticketOpacity;

  // Crossover is strongest at phase 0.25 and 0.75 (exactly between the two
  // shapes). Use it to squish scale and counter-rotate to sell the morph.
  const crossover = Math.abs(Math.sin(Math.PI * phase * 2)); // 0 at 0/½/1, 1 at ¼/¾
  const baseScale = 1 - crossover * 0.18;
  const rotateTicket = Math.sin(phase * 2 * Math.PI) * 10;
  const rotateStar = -Math.sin(phase * 2 * Math.PI) * 16;

  return (
    <AbsoluteFill style={{ background: palette.paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(23,21,18,0.06) 1px, transparent 1px),
            linear-gradient(180deg, rgba(23,21,18,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Floating sparks — these just drift on their own, independent of the morph */}
      <Spark x={0.18} y={0.22} color={palette.red} delay={0} />
      <Spark x={0.82} y={0.24} color={palette.mint} delay={10} spin={-1} />
      <Spark x={0.14} y={0.78} color={palette.sky} delay={20} spin={-1} />
      <Spark x={0.86} y={0.78} color={palette.pink} delay={30} />
      <Spark x={0.50} y={0.12} color={palette.yellow} delay={5} />
      <Spark x={0.50} y={0.88} color={palette.yellow} delay={25} spin={-1} />

      {/* Ticket */}
      <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: 540,
            opacity: ticketOpacity,
            transform: `scale(${baseScale * (0.92 + 0.08 * ticketOpacity)}) rotate(${rotateTicket}deg)`,
            filter: `drop-shadow(9px 9px 0 ${palette.ink})`
          }}
        >
          <Img src={staticFile("assets/logo-primary.svg")} style={{ width: "100%", height: "auto" }} />
        </div>
      </AbsoluteFill>

      {/* Star */}
      <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: 320,
            opacity: starOpacity,
            transform: `scale(${baseScale * (0.6 + 0.45 * starOpacity)}) rotate(${rotateStar}deg)`,
            filter: `drop-shadow(9px 9px 0 ${palette.ink})`
          }}
        >
          <Img src={staticFile("assets/monogram-star.svg")} style={{ width: "100%", height: "auto" }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
