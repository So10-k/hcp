"use client";

import { useEffect, useRef, useState } from "react";

const COMBO_WINDOW_MS = 90_000;

type Props = {
  /**
   * Bumps when a quest is cleared. The overlay reads this counter and
   * decides whether the clear extends the current combo (within window)
   * or starts a new one (after window expired).
   */
  pulse: number;
  /**
   * Optional reset signal — bump to force the combo back to 0 (e.g. when
   * the user navigates away or an admin reset hits).
   */
  resetSignal?: number;
};

type ComboState = {
  count: number;
  flash: number;     // bumped on every increment so CSS replays the keyframes
  lastAt: number;
};

function tier(count: number) {
  if (count >= 8) return { label: "BLAZING", multiplier: "×3", color: "var(--red)", glow: "0 0 60px rgba(255,90,61,0.65)" };
  if (count >= 5) return { label: "ON FIRE", multiplier: "×2", color: "var(--yellow)", glow: "0 0 48px rgba(255,212,61,0.65)" };
  if (count >= 2) return { label: "COMBO", multiplier: "×1.5", color: "var(--mint)", glow: "0 0 36px rgba(68,215,168,0.55)" };
  return null;
}

export function ComboOverlay({ pulse, resetSignal = 0 }: Props) {
  const [state, setState] = useState<ComboState>({ count: 0, flash: 0, lastAt: 0 });
  const timerRef = useRef<number | null>(null);
  const lastReportedRef = useRef(0);
  const lastPulseRef = useRef(0);
  const lastResetRef = useRef(0);

  // Fire-and-forget POST so the server can record peak combo and unlock badges.
  const reportCombo = (count: number) => {
    if (count < 2) return;
    if (count <= lastReportedRef.current) return;
    lastReportedRef.current = count;
    fetch("/api/combo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ combo: count })
    }).catch(() => {});
  };

  // Bump combo when the parent's pulse counter ticks.
  useEffect(() => {
    if (pulse === 0 || pulse === lastPulseRef.current) return;
    lastPulseRef.current = pulse;
    setState((prev) => {
      const now = Date.now();
      const within = now - prev.lastAt <= COMBO_WINDOW_MS;
      const next = within ? prev.count + 1 : 1;
      const flash = prev.flash + 1;
      // Side-effect outside React state-update: report after commit.
      window.setTimeout(() => reportCombo(next), 0);
      return { count: next, flash, lastAt: now };
    });
  }, [pulse]);

  // Reset signal nukes the overlay.
  useEffect(() => {
    if (resetSignal === lastResetRef.current) return;
    lastResetRef.current = resetSignal;
    lastReportedRef.current = 0;
    setState({ count: 0, flash: 0, lastAt: 0 });
  }, [resetSignal]);

  // Auto-decay: when the combo window expires we fade the overlay back out.
  useEffect(() => {
    if (state.count === 0) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setState({ count: 0, flash: state.flash, lastAt: 0 });
    }, COMBO_WINDOW_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [state.count, state.flash]);

  if (state.count < 2) return null;

  const t = tier(state.count)!;
  return (
    <div
      key={state.flash}
      className="combo-overlay"
      role="status"
      aria-live="polite"
      style={
        {
          "--combo-color": t.color,
          "--combo-glow": t.glow
        } as React.CSSProperties
      }
    >
      <div className="combo-card">
        <span className="combo-kicker">{t.label}</span>
        <span className="combo-count">{state.count}×</span>
        <span className="combo-mult">{t.multiplier} XP</span>
      </div>
      <ComboTimerBar key={`${state.flash}-bar`} ms={COMBO_WINDOW_MS} />
    </div>
  );
}

function ComboTimerBar({ ms }: { ms: number }) {
  return (
    <div className="combo-timer" aria-hidden="true">
      <div className="combo-timer-fill" style={{ animationDuration: `${ms}ms` }} />
    </div>
  );
}
