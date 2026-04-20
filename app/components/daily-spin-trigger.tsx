"use client";

import { useCallback, useEffect, useState } from "react";
import { t } from "../lib/preferred-mode";
import { DailySpinModal } from "./daily-spin-modal";
import { useMode } from "./mode-provider";

type Props = {
  /** When true, render as a full-width banner; otherwise as a compact pill button. */
  variant?: "banner" | "pill";
  initialAvailable?: boolean;
  initialPrizeShort?: string | null;
};

/**
 * Headline for the dashboard. Polls /api/spin once on mount and again
 * after a successful spin so the banner state goes from "ready" → "spun".
 */
export function DailySpinTrigger({ variant = "banner", initialAvailable = true, initialPrizeShort = null }: Props) {
  const mode = useMode();
  const [available, setAvailable] = useState(initialAvailable);
  const [prizeShort, setPrizeShort] = useState<string | null>(initialPrizeShort);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/spin", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        status: { available: boolean; prize: { short: string } | null };
      };
      setAvailable(data.status.available);
      setPrizeShort(data.status.prize?.short ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (variant === "pill") {
    return (
      <>
        <button
          type="button"
          className={`spin-pill${available ? " is-ready" : ""}`}
          onClick={() => setOpen(true)}
          aria-label={available ? "Take your daily spin" : `Today's spin: ${prizeShort ?? "claimed"}`}
        >
          <span aria-hidden="true">{mode === "pro" ? "★" : "🎡"}</span>
          {available ? t("dailySpinPillReady", mode) : prizeShort ?? t("dailySpinPillClaim", mode)}
        </button>
        <DailySpinModal open={open} onClose={() => setOpen(false)} onSpun={refresh} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`spin-banner${available ? " is-ready" : " is-claimed"}`}
        onClick={() => setOpen(true)}
        aria-label={available ? "Take your daily spin" : "View today's spin result"}
      >
        <span className="spin-banner-icon" aria-hidden="true">{mode === "pro" ? "★" : "🎡"}</span>
        <span className="spin-banner-body">
          <span className="spin-banner-kicker">{t("dailySpinKicker", mode)}</span>
          <strong className="spin-banner-title">
            {available
              ? t("dailySpinReady", mode)
              : prizeShort
                ? `${mode === "pro" ? "Today's reward" : "Today's spin"}: ${prizeShort} — back tomorrow.`
                : t("dailySpinClaimed", mode)}
          </strong>
          <span className="spin-banner-meta">
            <span className={`spin-banner-chip${available ? " is-ready" : ""}`}>
              {available ? "Ready" : "Claimed"}
            </span>
            {mode === "pro" ? null : (
              <span className="spin-banner-chip is-quiet">Wheel of fortune · 8 wedges</span>
            )}
          </span>
        </span>
        <span className="spin-banner-cta">
          {available ? t("dailySpinCtaReady", mode) : t("dailySpinCtaDone", mode)}
        </span>
      </button>
      <DailySpinModal open={open} onClose={() => setOpen(false)} onSpun={refresh} />
    </>
  );
}
