/**
 * High Roller — the follow-up event that auto-activates the moment a user's
 * Spring Sprint run is `completedAt`-set. Pure-luck Coin Tower mechanic.
 *
 * The event reuses the `sidequest_gameboard_runs` table with
 * `event_id = "high-roller"`. Column repurposing:
 *   position       → current rung (0..HIGHROLLER_RUNG_COUNT)
 *   rolls_earned   → total flip tokens earned
 *   rolls_used     → total flips used
 *   laps           → bust counter (tails-resets so far)
 *   peak_position  → highest rung the user has ever reached
 *   completed_at   → first time the user reached the top
 */

export const HIGHROLLER_EVENT_ID = "high-roller";
export const HIGHROLLER_EVENT_TITLE = "High Roller";
export const HIGHROLLER_EVENT_SUBTITLE = "Coin Tower · post-sprint event";

export const HIGHROLLER_RUNG_COUNT = 10;

/**
 * Below this rung a tails flip resets the player to rung 0.
 * At or above this rung the soft-bust kicks in and they only fall
 * `HIGHROLLER_SOFT_BUST_DROP` rungs instead. Calibrated so expected
 * flips-to-clear is in the tens, not the thousands.
 */
export const HIGHROLLER_SOFT_BUST_THRESHOLD = 5;
export const HIGHROLLER_SOFT_BUST_DROP = 3;

export const HIGHROLLER_REWARD_ID = `reward-lte-${HIGHROLLER_EVENT_ID}`;
export const HIGHROLLER_REWARD_TITLE = "High Roller Badge";
export const HIGHROLLER_REWARD_IMAGE = "/sticker-high-roller.svg";
export const HIGHROLLER_REWARD_NOTE =
  "Climbed the Coin Tower. Pure luck, pure stats.";

export const HIGHROLLER_BADGE_ID = "badge-high-roller";
