"use client";

import Link from "next/link";
import {
  HIGHROLLER_EVENT_SUBTITLE,
  HIGHROLLER_EVENT_TITLE,
  HIGHROLLER_RUNG_COUNT
} from "../lib/highroller-config";
import { t } from "../lib/preferred-mode";
import { useMode } from "./mode-provider";

type HighRollerBannerProps = {
  tokensAvailable: number;
  rung: number;
  busts: number;
};

export function HighRollerBanner({ tokensAvailable, rung, busts }: HighRollerBannerProps) {
  const mode = useMode();
  const progressPct = Math.min(100, Math.round((rung / HIGHROLLER_RUNG_COUNT) * 100));
  const subtitle = mode === "pro" ? t("hrSubtitle", mode) : HIGHROLLER_EVENT_SUBTITLE;
  const headline = mode === "pro" ? t("hrEventTitle", mode) : `${HIGHROLLER_EVENT_TITLE} — flip a coin, climb the tower.`;
  const ctaLabel = t("hrCta", mode);
  return (
    <Link className="hr-banner" href="/highroller-ltd" aria-label={`${HIGHROLLER_EVENT_TITLE} event`}>
      <span className="hr-banner-badge" aria-hidden="true">{mode === "pro" ? "◆" : "🪙"}</span>
      <div className="hr-banner-body">
        <span className="hr-banner-kicker">{subtitle}</span>
        <strong className="hr-banner-title">{headline}</strong>
        <span className="hr-banner-meta">
          {tokensAvailable > 0 ? (
            <>
              <span className="hr-banner-chip is-mint">
                {tokensAvailable} flip{tokensAvailable === 1 ? "" : "s"} ready
              </span>
              <span className="hr-banner-chip is-sky">
                Rung {rung} / {HIGHROLLER_RUNG_COUNT}
              </span>
              {busts > 0 ? (
                <span className="hr-banner-chip is-pink">
                  {busts} bust{busts === 1 ? "" : "s"}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="hr-banner-chip">Complete a quest to earn a flip</span>
              <span className="hr-banner-chip is-sky">
                Rung {rung} / {HIGHROLLER_RUNG_COUNT}
              </span>
            </>
          )}
        </span>
        <span className="hr-banner-bar" aria-hidden="true">
          <span className="hr-banner-bar-fill" style={{ width: `${progressPct}%` }} />
        </span>
      </div>
      <span className="hr-banner-cta">{ctaLabel}</span>
    </Link>
  );
}
