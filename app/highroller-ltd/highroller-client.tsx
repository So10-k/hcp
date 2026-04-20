"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { TutorialPlayer } from "../components/tutorial-player";
import {
  HIGHROLLER_EVENT_TITLE,
  HIGHROLLER_REWARD_IMAGE,
  HIGHROLLER_REWARD_TITLE,
  HIGHROLLER_SOFT_BUST_DROP,
  HIGHROLLER_SOFT_BUST_THRESHOLD
} from "../lib/highroller-config";

const HIGHROLLER_TUTORIAL_SEEN_KEY = "sidequest_highroller_tutorial_seen_v1";

type FlipCommitment = { outcome: "heads" | "tails"; nonce: string; hash: string };

type Run = {
  position: number;
  rollsEarned: number;
  rollsUsed: number;
  rollsAvailable: number;
  laps: number;
  peakPosition: number;
  completedAt: string | null;
  nextFlipHash: string | null;
  lastFlip: FlipCommitment | null;
};

type FlipResponse = {
  run: Run;
  outcome: "heads" | "tails";
  fromRung: number;
  toRung: number;
  busted: boolean;
  softBust: boolean;
  reachedTop: boolean;
  newlyCompleted: boolean;
  rewardId: string | null;
};

/**
 * Browser-side sha256 so users can verify the reveal matches the hash
 * they saw before flipping. If SubtleCrypto is unavailable (unsupported
 * context) we just display "unverified" — the server commitment still
 * stands on its own.
 */
async function sha256Hex(input: string): Promise<string | null> {
  try {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

type Props = {
  initialRun: Run;
  rungCount: number;
  playerLabel: string;
};

const FLIP_MS = 1100;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function HighRollerClient({ initialRun, rungCount, playerLabel }: Props) {
  const [run, setRun] = useState<Run>(initialRun);
  const [flipping, setFlipping] = useState(false);
  const [coinFace, setCoinFace] = useState<"heads" | "tails">("heads");
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [note, setNote] = useState<React.ReactNode>(
    initialRun.rollsAvailable > 0 ? (
      <>You&apos;ve got <strong>{initialRun.rollsAvailable}</strong> flip token{initialRun.rollsAvailable === 1 ? "" : "s"}. Press the coin to gamble.</>
    ) : (
      <>Complete a quest on <a href="/board">your board</a> to earn a flip token.</>
    )
  );

  const coinRotRef = useRef(0);
  const coinRef = useRef<HTMLDivElement | null>(null);

  const [verify, setVerify] = useState<"idle" | "verified" | "mismatch" | "unsupported">("idle");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(HIGHROLLER_TUTORIAL_SEEN_KEY);
      if (!seen) {
        setTutorialOpen(true);
        window.localStorage.setItem(HIGHROLLER_TUTORIAL_SEEN_KEY, new Date().toISOString());
      }
    } catch {
      setTutorialOpen(true);
    }
  }, []);

  const canFlip = !flipping && !run.completedAt && run.rollsAvailable > 0;

  const flip = useCallback(async () => {
    if (!canFlip) return;
    setError(null);
    setFlipping(true);
    setNote(<>Flipping…</>);

    let result: FlipResponse;
    try {
      const res = await fetch("/api/highroller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flip" })
      });
      const data = (await res.json()) as FlipResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Flip failed.");
      }
      result = data as FlipResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Flip failed.";
      setError(message);
      setNote(<>{message}</>);
      setFlipping(false);
      return;
    }

    // 3D coin spin: at least 4 full rotations + the half-turn that lands on
    // tails (so the back is showing) when the outcome is tails.
    const tumble = (4 + Math.floor(Math.random() * 2)) * 360;
    const landing = result.outcome === "tails" ? 180 : 0;
    const target = coinRotRef.current + tumble + landing;
    coinRotRef.current = target;
    if (coinRef.current) {
      coinRef.current.style.transform = `rotateY(${target}deg)`;
    }

    await sleep(FLIP_MS);

    setCoinFace(result.outcome);
    setRun(result.run);

    // Verify the reveal: sha256(outcome:nonce) must equal the hash the
    // server published BEFORE this flip. If it doesn't, the server
    // cheated — flag it loudly so the user sees the mismatch.
    const revealed = result.run.lastFlip;
    if (revealed) {
      const expected = await sha256Hex(`${revealed.outcome}:${revealed.nonce}`);
      if (expected === null) setVerify("unsupported");
      else if (expected === revealed.hash) setVerify("verified");
      else setVerify("mismatch");
    }

    if (result.reachedTop) {
      setCelebrate(true);
      setNote(<><strong>Heads!</strong> Rung 10. Tower cleared.</>);
    } else if (result.busted) {
      setNote(
        result.softBust ? (
          <><strong>Tails.</strong> Soft bust — dropped to rung {result.toRung}.</>
        ) : (
          <><strong>Tails.</strong> Bust — back to the bottom.</>
        )
      );
    } else {
      setNote(
        <><strong>Heads.</strong> Climbed to rung {result.toRung}.</>
      );
    }

    setFlipping(false);
  }, [canFlip]);

  // Keyboard: Space flips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        void flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip]);

  const rungs = Array.from({ length: rungCount + 1 }, (_, i) => rungCount - i);
  const completionOdds = (Math.pow(0.5, rungCount) * 100).toFixed(2);

  return (
    <>
      <section className="hr-masthead">
        <p className="hr-eyebrow">Coin Tower · post-sprint event</p>
        <h1>{HIGHROLLER_EVENT_TITLE}</h1>
        <p>
          Each flip is a coin toss. Heads = climb one rung. Tails = bust.
          Below rung {HIGHROLLER_SOFT_BUST_THRESHOLD} a tails sends you to the floor;
          rung {HIGHROLLER_SOFT_BUST_THRESHOLD} and up you only fall {HIGHROLLER_SOFT_BUST_DROP}.
          Reach rung {rungCount} to lock in the {HIGHROLLER_REWARD_TITLE.toLowerCase()}.
        </p>
      </section>

      <div className="hr-layout">
        <section className="hr-tower-card">
          <div className="hr-tower" aria-label={`Coin tower — currently rung ${run.position} of ${rungCount}`}>
            {rungs.map((r) => {
              const reached = r <= run.peakPosition;
              const current = r === run.position;
              const top = r === rungCount;
              return (
                <div
                  key={r}
                  className={`hr-rung${current ? " is-current" : ""}${reached ? " is-reached" : ""}${top ? " is-top" : ""}`}
                >
                  <span className="hr-rung-num">{r}</span>
                  {top ? (
                    <span className="hr-rung-glyph" aria-hidden="true">🏆</span>
                  ) : r === HIGHROLLER_SOFT_BUST_THRESHOLD ? (
                    <span className="hr-rung-marker" aria-label="Soft-bust threshold">soft bust ↑</span>
                  ) : null}
                  {current ? (
                    <span className="hr-pawn" aria-label="Your position">{playerLabel}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="hr-side">
          <section className="hr-panel">
            <h3>Your run</h3>
            <p>Each completed quest grants one flip token. Spend them at the coin.</p>
            <div className="hr-status-row">
              <span className="hr-chip is-sun">Rung {run.position} / {rungCount}</span>
              <span className="hr-chip is-mint">Flips ready · {run.rollsAvailable}</span>
              <span className="hr-chip is-sky">Peak · {run.peakPosition}</span>
              {run.laps > 0 ? (
                <span className="hr-chip is-pink">Busts · {run.laps}</span>
              ) : null}
            </div>
            <p className="hr-odds">Clean-run odds: {completionOdds}% per attempt. The soft bust above rung {HIGHROLLER_SOFT_BUST_THRESHOLD} is what makes it possible.</p>
            <button
              type="button"
              className="tutorial-rewatch"
              onClick={() => setTutorialOpen(true)}
              aria-label="Rewatch tutorial"
            >
              Rewatch tutorial
            </button>
          </section>

          <section className="hr-panel hr-fairness" aria-labelledby="hr-fair-title">
            <h3 id="hr-fair-title">Provably fair · next flip sealed</h3>
            <p className="hr-fair-explain">
              The server picked the next outcome before you saw this page and published the SHA-256 of it below.
              After you flip, it reveals the value + nonce so you can verify nothing was swapped.
            </p>
            <div className="hr-fair-row">
              <span className="hr-fair-label">Sealed hash</span>
              <code className="hr-fair-hash" title={run.nextFlipHash ?? ""}>
                {run.nextFlipHash ? `${run.nextFlipHash.slice(0, 16)}…${run.nextFlipHash.slice(-8)}` : "—"}
              </code>
            </div>
            {run.lastFlip ? (
              <>
                <div className="hr-fair-row">
                  <span className="hr-fair-label">Last reveal</span>
                  <span className="hr-fair-reveal">
                    <strong>{run.lastFlip.outcome.toUpperCase()}</strong> · nonce{" "}
                    <code title={run.lastFlip.nonce}>{run.lastFlip.nonce.slice(0, 12)}…</code>
                  </span>
                </div>
                <div className="hr-fair-row">
                  <span className="hr-fair-label">Verify</span>
                  <span
                    className={`hr-fair-verify hr-fair-${verify}`}
                    title="sha256(outcome:nonce) == sealed hash?"
                  >
                    {verify === "verified"
                      ? "✓ sha256 matches"
                      : verify === "mismatch"
                        ? "✕ MISMATCH — server cheated"
                        : verify === "unsupported"
                          ? "⟳ browser can't verify"
                          : "… pending"}
                  </span>
                </div>
              </>
            ) : (
              <p className="hr-fair-explain">No reveal yet — your first flip will unlock the audit trail.</p>
            )}
          </section>

          <section className="hr-panel">
            <h3>Your turn</h3>
            <div className="hr-coin-stage">
              <div className="hr-coin-perspective">
                <div
                  className={`hr-coin${flipping ? " is-flipping" : ""}`}
                  ref={coinRef}
                  role="img"
                  aria-label={`Coin showing ${coinFace}`}
                >
                  <div className="hr-coin-face hr-coin-heads">
                    <span aria-hidden="true">H</span>
                  </div>
                  <div className="hr-coin-face hr-coin-tails">
                    <span aria-hidden="true">T</span>
                  </div>
                </div>
              </div>
              <button
                className="hr-flip-button"
                type="button"
                onClick={flip}
                disabled={!canFlip}
              >
                {flipping ? "Flipping…" : run.rollsAvailable > 0 ? "Flip the coin" : "No flips yet"}
              </button>
            </div>
            <p className="hr-note">{note}</p>
            {error ? <p className="hr-error">{error}</p> : null}
          </section>

          <section className="hr-panel">
            <h3>Rules</h3>
            <ul className="hr-rules">
              <li><strong>Heads:</strong> climb one rung.</li>
              <li><strong>Tails (rung 0–{HIGHROLLER_SOFT_BUST_THRESHOLD - 1}):</strong> reset to rung 0.</li>
              <li><strong>Tails (rung {HIGHROLLER_SOFT_BUST_THRESHOLD}–{rungCount - 1}):</strong> drop {HIGHROLLER_SOFT_BUST_DROP} rungs.</li>
              <li><strong>Reach rung {rungCount}:</strong> badge unlocked, tower locks.</li>
            </ul>
          </section>
        </aside>
      </div>

      {celebrate ? (
        <div className="hr-badge-overlay" role="dialog" aria-modal="true" aria-labelledby="hr-badge-title">
          <div className="hr-badge-card">
            <span className="hr-eyebrow">Badge unlocked</span>
            <div className="hr-badge-medal" aria-hidden="true">
              <Image src={HIGHROLLER_REWARD_IMAGE} alt="" width={120} height={120} />
            </div>
            <h2 id="hr-badge-title">{HIGHROLLER_REWARD_TITLE}</h2>
            <p>
              You climbed the Coin Tower clean. The badge is pinned to your reward shelf
              and the event is now closed for your account.
            </p>
            <div className="hr-badge-actions">
              <a className="hr-flip-button" style={{ background: "var(--mint)" }} href="/board">
                Back to board
              </a>
              <a className="hr-reset-button" href="/achievements">
                See it in the hall
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <TutorialPlayer
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        src="/sidequest-highroller-tutorial.mp4"
      />
    </>
  );
}
