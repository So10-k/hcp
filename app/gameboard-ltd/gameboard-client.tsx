"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAMEBOARD_REWARD_IMAGE,
  GAMEBOARD_REWARD_TITLE,
  type GameboardTile
} from "../lib/gameboard-config";

type Run = {
  userId: string;
  eventId: string;
  position: number;
  rollsEarned: number;
  rollsUsed: number;
  rollsAvailable: number;
  laps: number;
  completedAt: string | null;
};

type RollResponse = {
  run: Run;
  value: number;
  steps: number[];
  effect: "forward" | "back" | null;
  reachedFinish: boolean;
  newlyCompleted: boolean;
  rewardId: string | null;
};

type Props = {
  initialRun: Run;
  tiles: GameboardTile[];
  length: number;
  eventTitle: string;
  eventSubtitle: string;
  playerLabel: string;
};

const ROLL_MS = 1000;
const STEP_MS = 320;
const EFFECT_DELAY_MS = 380;

const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 }
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function DieFace({ value, position }: { value: number; position: string }) {
  return (
    <div className={`gb-face gb-face-${position}`} data-pips={value}>
      {["tl", "tm", "tr", "ml", "c", "mr", "bl", "bm", "br"].map((p) => (
        <span key={p} className={`gb-pip ${p}`} />
      ))}
    </div>
  );
}

export default function GameboardClient({
  initialRun,
  tiles,
  length,
  eventTitle,
  eventSubtitle,
  playerLabel
}: Props) {
  const [run, setRun] = useState<Run>(initialRun);
  const [rolling, setRolling] = useState(false);
  const [dieFace, setDieFace] = useState(1);
  const [note, setNote] = useState<React.ReactNode>(
    initialRun.rollsAvailable > 0 ? (
      <>You have <strong>{initialRun.rollsAvailable}</strong> roll{initialRun.rollsAvailable === 1 ? "" : "s"} ready. Press <strong>Roll Die</strong>.</>
    ) : (
      <>Complete a quest on <a href="/board">your board</a> to earn a die roll.</>
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const pawnRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cubeRef = useRef<HTMLDivElement | null>(null);
  const cubeRotRef = useRef({ x: 0, y: 0 });
  const displayPosRef = useRef(initialRun.position);

  const placePawn = useCallback((idx: number, bump = false) => {
    const board = boardRef.current;
    const pawn = pawnRef.current;
    const tile = tileRefs.current[idx];
    if (!board || !pawn || !tile) return;
    const bRect = board.getBoundingClientRect();
    const tRect = tile.getBoundingClientRect();
    const x = tRect.left - bRect.left + (tRect.width - pawn.offsetWidth) / 2;
    const y = tRect.top - bRect.top + (tRect.height - pawn.offsetHeight) / 2;
    const transform = `translate(${x}px, ${y}px)`;
    pawn.style.setProperty("--gb-to", transform);
    pawn.style.transform = transform;
    if (bump) {
      pawn.classList.remove("is-bump");
      void pawn.offsetWidth;
      pawn.classList.add("is-bump");
    }
  }, []);

  const animateSteps = useCallback(
    async (steps: number[], value: number, effect: "forward" | "back" | null) => {
      // Primary dice steps: first `value` entries. Anything after is an effect step.
      for (let i = 0; i < value; i += 1) {
        const target = steps[i];
        displayPosRef.current = target;
        placePawn(target, true);
        await sleep(STEP_MS);
      }
      if (effect && steps.length > value) {
        const label = effect === "forward" ? "Jump" : "Slip";
        setNote(
          <>Landed on <strong>{label}</strong>. {effect === "forward" ? "Boosting" : "Slipping"} one tile {effect === "forward" ? "forward" : "back"}.</>
        );
        await sleep(EFFECT_DELAY_MS);
        const target = steps[steps.length - 1];
        displayPosRef.current = target;
        placePawn(target, true);
        await sleep(STEP_MS);
      }
    },
    [placePawn]
  );

  const rollDie = useCallback(async () => {
    if (rolling) return;
    setError(null);
    setRolling(true);
    setNote(<>Rolling…</>);

    let result: RollResponse;
    try {
      const res = await fetch("/api/gameboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "roll" })
      });
      const data = (await res.json()) as RollResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Roll failed.");
      }
      result = data as RollResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Roll failed.";
      setError(message);
      setNote(<>{message}</>);
      setRolling(false);
      return;
    }

    const target = FACE_ROT[result.value];
    const tumbleX = (3 + Math.floor(Math.random() * 2)) * 360;
    const tumbleY = (3 + Math.floor(Math.random() * 2)) * 360;
    const endX = cubeRotRef.current.x + tumbleX + target.x;
    const endY = cubeRotRef.current.y + tumbleY + target.y;
    cubeRotRef.current = { x: endX, y: endY };
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateX(${endX}deg) rotateY(${endY}deg)`;
    }
    setDieFace(result.value);

    await sleep(ROLL_MS);
    setNote(
      <>Rolled a <strong>{result.value}</strong>. Moving {result.value} tile{result.value === 1 ? "" : "s"}.</>
    );

    await animateSteps(result.steps, result.value, result.effect);
    setRun(result.run);

    if (result.reachedFinish) {
      setCelebrate(true);
      setNote(<><strong>Loop complete!</strong> Badge unlocked.</>);
    } else if (result.run.rollsAvailable > 0) {
      setNote(
        <>Landed on tile <strong>{result.run.position}</strong>. {result.run.rollsAvailable} roll{result.run.rollsAvailable === 1 ? "" : "s"} left.</>
      );
    } else {
      setNote(
        <>Landed on tile <strong>{result.run.position}</strong>. Complete another quest to earn your next roll.</>
      );
    }

    setRolling(false);
  }, [animateSteps, rolling]);

  // Initial pawn placement + resize handler.
  useEffect(() => {
    placePawn(initialRun.position);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const pawn = pawnRef.current;
        if (!pawn) return;
        const prev = pawn.style.transition;
        pawn.style.transition = "none";
        placePawn(displayPosRef.current);
        requestAnimationFrame(() => {
          pawn.style.transition = prev;
        });
      }, 80);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) clearTimeout(timer);
    };
  }, [initialRun.position, placePawn]);

  const canRoll = !rolling && !run.completedAt && run.rollsAvailable > 0;
  const currentTile = tiles[run.position] ?? tiles[0];

  return (
    <>
      <section className="gb-masthead">
        <p className="gb-eyebrow">{eventSubtitle} · Board event</p>
        <h1>{eventTitle}</h1>
        <p>
          Every completed quest earns a die roll on this board. Land on green to jump ahead, pink to
          slip back, and loop the <strong>Start · Finish</strong> banner to earn the sticker.
        </p>
      </section>

      <div className="gb-layout">
        <section className="gb-board-card">
          <div className="gb-board" ref={boardRef} aria-label="Event board">
            {tiles.map((tile, i) => {
              const isStart = tile.kind === "start";
              const isPlain = tile.kind === "plain";
              return (
                <div
                  key={i}
                  className={`gb-tile is-${tile.kind}${i === run.position ? " is-current" : ""}`}
                  style={{
                    gridRow: tile.row,
                    gridColumn: typeof tile.col === "string" ? tile.col : tile.col
                  }}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                >
                  {isStart ? (
                    <div className="gb-start-inner">
                      <span className="gb-start-badge">{eventTitle}</span>
                      <div className="gb-start-headline">
                        <span className="gb-start-word">Start</span>
                        <span className="gb-start-glyph" aria-hidden="true">🏁</span>
                        <span className="gb-start-word">Finish</span>
                      </div>
                      <span className="gb-start-prize">Sticker drop</span>
                    </div>
                  ) : isPlain ? (
                    <span className="gb-plain-num">{i}</span>
                  ) : (
                    <>
                      <span className="gb-num">{i}</span>
                      <span className="gb-glyph">{tile.glyph}</span>
                      <span className="gb-label">{tile.label}</span>
                    </>
                  )}
                </div>
              );
            })}

            <div className="gb-board-center">
              <span className="gb-kicker">{eventSubtitle}</span>
              <h2>Complete the Loop</h2>
              <p>
                Roll to move. Green jumps you +1, pink slips you −1. Make it back to the
                top banner to earn the sticker.
              </p>
            </div>

            <div className="gb-pawn" ref={pawnRef} aria-label="Your avatar" title={playerLabel}>
              {playerLabel}
            </div>
          </div>
        </section>

        <aside className="gb-side">
          <section className="gb-panel">
            <h3>Your run</h3>
            <p>Earn rolls by completing quests. Every completed quest grants one die roll.</p>
            <div className="gb-status-row">
              <span className="gb-chip gb-chip-sun">
                Tile {run.position} · {currentTile.kind === "plain" ? "Step" : currentTile.label}
              </span>
              <span className="gb-chip gb-chip-lime">
                Rolls ready · {run.rollsAvailable}
              </span>
              <span className="gb-chip gb-chip-sky">
                Laps {run.laps}
              </span>
            </div>
          </section>

          <section className="gb-panel">
            <h3>Your turn</h3>
            <div className="gb-die-stage">
              <div className="gb-die-tilt">
                <div
                  className={`gb-die-cube${rolling ? " is-rolling" : ""}`}
                  ref={cubeRef}
                  role="img"
                  aria-label={`Die showing ${dieFace}`}
                >
                  <DieFace value={1} position="front" />
                  <DieFace value={6} position="back" />
                  <DieFace value={2} position="top" />
                  <DieFace value={5} position="bottom" />
                  <DieFace value={3} position="right" />
                  <DieFace value={4} position="left" />
                </div>
              </div>
              <button
                className="gb-roll-button"
                type="button"
                onClick={rollDie}
                disabled={!canRoll}
              >
                {rolling ? "Rolling…" : run.rollsAvailable > 0 ? "Roll Die" : "No rolls yet"}
              </button>
            </div>
            <p className="gb-note">{note}</p>
            {error ? <p className="gb-error">{error}</p> : null}
          </section>

          <section className="gb-panel">
            <h3>Legend</h3>
            <div className="gb-legend">
              <div className="gb-legend-row"><span className="gb-legend-swatch is-yellow">★</span> Start &amp; Finish · sticker drop</div>
              <div className="gb-legend-row"><span className="gb-legend-swatch is-sky">◆</span> Checkpoint corner</div>
              <div className="gb-legend-row"><span className="gb-legend-swatch is-mint">→</span> Jump +1 tile</div>
              <div className="gb-legend-row"><span className="gb-legend-swatch is-pink">←</span> Slip −1 tile</div>
            </div>
          </section>
        </aside>
      </div>

      {celebrate ? (
        <div
          className="gb-badge-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gb-badge-title"
        >
          <div className="gb-badge-card">
            <span className="gb-eyebrow">Sticker unlocked</span>
            <div className="gb-badge-medal" aria-hidden="true">
              <Image src={GAMEBOARD_REWARD_IMAGE} alt="" width={96} height={96} />
            </div>
            <h2 id="gb-badge-title">{GAMEBOARD_REWARD_TITLE}</h2>
            <p>
              You looped the {eventTitle} board. The sticker is pinned to your reward shelf and the
              event is complete.
            </p>
            <div className="gb-badge-actions">
              <a
                className="gb-roll-button"
                style={{ background: "var(--mint)" }}
                href="/board"
              >
                Back to board
              </a>
              <a className="gb-reset-button" href="/dashboard">
                Dashboard
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
