"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WedgePrize = {
  id: string;
  label: string;
  kind: "xp" | "dice" | "flips" | "sticker" | "jackpot";
  amount: number;
  color: string;
  textColor: string;
  short: string;
  weight: number;
};

type Status = {
  todayKey: string;
  available: boolean;
  prize: {
    id: string;
    label: string;
    kind: WedgePrize["kind"];
    amount: number;
    spunAt: string;
    short: string;
  } | null;
  recent: Array<{ dateKey: string; prizeId: string; spunAt: string }>;
  prizes: WedgePrize[];
};

type SpinResponse = {
  status: Status;
  prize: WedgePrize;
  prizeIndex: number;
  rewardId: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional callback fired after a successful spin so the parent can refresh banner state. */
  onSpun?: () => void;
};

/**
 * Eight-wedge wheel of fortune. Server picks the prize; this component
 * just animates the wheel landing on whatever wedge index the server
 * returned. Wheel is built from CSS conic-gradient + absolutely-positioned
 * wedge labels so it renders crisply at any size.
 */
export function DailySpinModal({ open, onClose, onSpun }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<SpinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/spin", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { status: Status };
      setStatus(data.status);
      if (data.status.prize) {
        // If they spun earlier today (e.g. on another device), show a
        // collapsed-state hero with their prize instead of the live wheel.
        setRevealed({
          status: data.status,
          prize: {
            ...data.status.prizes.find((p) => p.id === data.status.prize!.id)!
          },
          prizeIndex: data.status.prizes.findIndex((p) => p.id === data.status.prize!.id),
          rewardId: null
        });
      } else {
        setRevealed(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    void fetchStatus().finally(() => setLoading(false));
  }, [open, fetchStatus]);

  const wedgeAngle = useMemo(() => {
    if (!status) return 45;
    return 360 / status.prizes.length;
  }, [status]);

  const conicGradient = useMemo(() => {
    if (!status) return "";
    const stops: string[] = [];
    let acc = 0;
    for (const prize of status.prizes) {
      const next = acc + wedgeAngle;
      stops.push(`${prize.color} ${acc}deg ${next}deg`);
      acc = next;
    }
    return `conic-gradient(from -${wedgeAngle / 2}deg, ${stops.join(", ")})`;
  }, [status, wedgeAngle]);

  const spin = useCallback(async () => {
    if (!status || !status.available || spinning) return;
    setSpinning(true);
    setError(null);

    let result: SpinResponse;
    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spin" })
      });
      const data = (await res.json()) as SpinResponse | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Spin failed.");
      }
      result = data as SpinResponse;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spin failed.");
      setSpinning(false);
      return;
    }

    // Land the wheel on the correct wedge: rotate by full turns + the angle
    // of the prize's wedge center, with a tiny random offset for variance.
    const wedgeCenter = result.prizeIndex * wedgeAngle + wedgeAngle / 2;
    const offset = (Math.random() - 0.5) * (wedgeAngle * 0.5);
    const target = -wedgeCenter + offset; // negative because we want the wedge to land at the top
    const tumble = (5 + Math.floor(Math.random() * 3)) * 360;
    const finalRot = rotationRef.current + tumble + (target - (rotationRef.current % 360));
    rotationRef.current = finalRot;
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${finalRot}deg)`;
    }

    // Wait for the CSS transition to complete (3.5s in the stylesheet),
    // then surface the result panel and notify parent.
    window.setTimeout(() => {
      setRevealed(result);
      setStatus(result.status);
      setSpinning(false);
      onSpun?.();
    }, 3700);
  }, [status, spinning, wedgeAngle, onSpun]);

  if (!open) return null;

  return (
    <div className="spin-overlay" role="dialog" aria-modal="true" aria-labelledby="spin-title">
      <div className="spin-card">
        <header className="spin-head">
          <div>
            <span className="spin-eyebrow">Daily Spin</span>
            <h2 id="spin-title">Take your free spin.</h2>
          </div>
          <button type="button" className="spin-close" onClick={onClose} aria-label="Close daily spin">
            ✕
          </button>
        </header>

        {loading && !status ? (
          <p className="spin-loading">Loading…</p>
        ) : status ? (
          <div className="spin-stage">
            <div className="spin-wheel-wrap" aria-hidden="true">
              <div
                className={`spin-wheel${spinning ? " is-spinning" : ""}`}
                ref={wheelRef}
                style={{ background: conicGradient }}
              >
                {status.prizes.map((prize, index) => {
                  const angle = index * wedgeAngle + wedgeAngle / 2;
                  return (
                    <span
                      key={prize.id}
                      className="spin-wedge-label"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-44%)`,
                        color: prize.textColor
                      }}
                    >
                      {prize.short}
                    </span>
                  );
                })}
              </div>
              <div className="spin-pointer" aria-hidden="true">▼</div>
              <div className="spin-hub" aria-hidden="true">
                <span>SQ</span>
              </div>
            </div>

            <div className="spin-side">
              {revealed ? (
                <SpinReveal prize={revealed.prize} alreadySpun={!status.available && !spinning} />
              ) : (
                <p className="spin-pitch">
                  Eight wedges. Eight chances. Most spins drop XP, dice, or flip tokens.
                  A rare spin drops a sticker. A very rare spin drops a one-of-one badge.
                </p>
              )}
              {error ? <p className="spin-error">{error}</p> : null}
              <button
                type="button"
                className="spin-go"
                onClick={() => void spin()}
                disabled={!status.available || spinning}
              >
                {spinning ? "Spinning…" : status.available ? "Spin the wheel" : "Already spun today"}
              </button>
              {!status.available ? (
                <p className="spin-meta">Comes back tomorrow at 00:00 UTC.</p>
              ) : null}
              <ul className="spin-prize-list">
                {status.prizes.map((prize) => {
                  const pct = Math.round((prize.weight / status.prizes.reduce((s, p) => s + p.weight, 0)) * 100);
                  return (
                    <li key={prize.id}>
                      <span className="spin-prize-dot" style={{ background: prize.color }} />
                      <span className="spin-prize-label">{prize.short}</span>
                      <span className="spin-prize-pct">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpinReveal({ prize, alreadySpun }: { prize: WedgePrize; alreadySpun: boolean }) {
  return (
    <div className="spin-reveal" style={{ background: prize.color, color: prize.textColor }}>
      <span className="spin-reveal-kicker">
        {alreadySpun ? "Today's spin" : "You won"}
      </span>
      <strong className="spin-reveal-title">{prize.label}</strong>
      {prize.kind === "jackpot" ? (
        <p>The Jackpot Spinner badge is pinned to your shelf.</p>
      ) : prize.kind === "sticker" ? (
        <p>A random sticker dropped — check your hall.</p>
      ) : prize.kind === "xp" ? (
        <p>+{prize.amount} XP boost added.</p>
      ) : prize.kind === "dice" ? (
        <p>+{prize.amount} dice rolls on Spring Sprint.</p>
      ) : (
        <p>+{prize.amount} flip tokens on the Coin Tower.</p>
      )}
    </div>
  );
}
