"use client";

import Link from "next/link";
import {
  GAMEBOARD_EVENT_SUBTITLE,
  GAMEBOARD_EVENT_TITLE
} from "../lib/gameboard-config";
import { t } from "../lib/preferred-mode";
import { useMode } from "./mode-provider";

type LteBannerProps = {
  rollsAvailable: number;
  position: number;
  length: number;
};

export function LteBanner({ rollsAvailable, position, length }: LteBannerProps) {
  const mode = useMode();
  const progressPct = Math.min(100, Math.round((position / length) * 100));
  const subtitle = mode === "pro" ? t("lteSubtitle", mode) : GAMEBOARD_EVENT_SUBTITLE;
  const headline = mode === "pro" ? t("lteEventTitle", mode) : `${GAMEBOARD_EVENT_TITLE} — roll the board, earn the sticker.`;
  const ctaLabel = t("lteCta", mode);
  return (
    <Link className="lte-banner" href="/gameboard-ltd" aria-label={`${GAMEBOARD_EVENT_TITLE} event board`}>
      <span className="lte-banner-badge" aria-hidden="true">★</span>
      <div className="lte-banner-body">
        <span className="lte-banner-kicker">{subtitle}</span>
        <strong className="lte-banner-title">{headline}</strong>
        <span className="lte-banner-meta">
          {rollsAvailable > 0 ? (
            <>
              <span className="lte-banner-chip is-mint">
                {rollsAvailable} roll{rollsAvailable === 1 ? "" : "s"} ready
              </span>
              <span className="lte-banner-chip is-sky">Tile {position} / {length - 1}</span>
            </>
          ) : (
            <>
              <span className="lte-banner-chip">Complete a quest to earn a roll</span>
              <span className="lte-banner-chip is-sky">Tile {position} / {length - 1}</span>
            </>
          )}
        </span>
        <span className="lte-banner-bar" aria-hidden="true">
          <span className="lte-banner-bar-fill" style={{ width: `${progressPct}%` }} />
        </span>
      </div>
      <span className="lte-banner-cta">{ctaLabel}</span>
    </Link>
  );
}
