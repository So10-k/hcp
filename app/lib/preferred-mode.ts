/**
 * Preferred-mode toggle. `playful` is the default — the colorful, neo-brutalist
 * everything-pops experience for the original target audience. `pro` is for
 * users who want a calmer, less cluttered interface (older users, anyone
 * who finds the kid energy distracting). Set on signup, per-user toggleable
 * by an admin, and reflected globally via `<html data-mode>` so CSS can
 * tune rotations / shadows / animations / typography.
 */

export type PreferredMode = "playful" | "pro";

export const PREFERRED_MODES: PreferredMode[] = ["playful", "pro"];

export function isPreferredMode(value: unknown): value is PreferredMode {
  return value === "playful" || value === "pro";
}

export function normalizeMode(value: unknown): PreferredMode {
  return isPreferredMode(value) ? value : "playful";
}

/**
 * Mode-aware copy. Most of the app is shared between modes — this only
 * covers strings where the playful tone is loud enough to be worth a
 * grown-up alternative. Add entries as needed; new keys default to
 * the playful copy if the pro variant is missing.
 */
export const COPY: Record<string, { playful: string; pro: string }> = {
  // Topbar / nav
  navBoard:           { playful: "My board",                                pro: "Tasks" },
  navHall:            { playful: "Hall",                                    pro: "Achievements" },
  navAdmin:           { playful: "Admin",                                   pro: "Admin" },
  navTutorial:        { playful: "▶ Tutorial",                              pro: "Tutorial" },
  navRefresh:         { playful: "Refresh",                                 pro: "Sync" },

  // Dashboard hero
  dashboardEyebrow:   { playful: "Your personal dashboard",                 pro: "Overview" },
  dashboardWelcome:   { playful: "Welcome back,",                           pro: "Welcome back," },
  dashboardLede:      {
    playful: "Check your week, jump into your board, or peek at admin analytics if your account has access.",
    pro:     "Your tasks, achievements, and recent activity at a glance."
  },
  dashboardCtaPrimary:{ playful: "Open my board",                           pro: "Open tasks" },
  dashboardCtaHall:   { playful: "Hall of achievements",                    pro: "View achievements" },
  dashboardCtaAdmin:  { playful: "Admin console",                           pro: "Admin console" },

  // Daily spin
  dailySpinKicker:    { playful: "Daily spin",                              pro: "Daily reward" },
  dailySpinReady:     { playful: "Your free spin is waiting.",              pro: "A daily reward is available." },
  dailySpinClaimed:   { playful: "Today's spin: claimed — come back tomorrow.", pro: "Today's reward already claimed." },
  dailySpinCtaReady:  { playful: "Spin →",                                  pro: "Open →" },
  dailySpinCtaDone:   { playful: "View →",                                  pro: "View →" },
  dailySpinPillReady: { playful: "Daily spin ready",                        pro: "Reward available" },
  dailySpinPillClaim: { playful: "Spun today",                              pro: "Claimed" },
  dailySpinModalTitle:{ playful: "Take your free spin.",                    pro: "Daily reward" },

  // Spring Sprint banner
  lteEventTitle:      { playful: "Spring Sprint — roll the board, earn the sticker.", pro: "Spring Challenge — limited-time event." },
  lteSubtitle:        { playful: "Limited time event",                      pro: "Limited-time event" },
  lteCta:             { playful: "Open board →",                            pro: "Open →" },

  // High Roller banner
  hrEventTitle:       { playful: "High Roller — flip a coin, climb the tower.", pro: "Bonus event — climb the ladder." },
  hrSubtitle:         { playful: "Coin Tower · post-sprint event",          pro: "Bonus event" },
  hrCta:              { playful: "Open tower →",                            pro: "Open →" },

  // Combo overlay tiers (labels)
  comboTier2:         { playful: "COMBO",                                   pro: "STREAK" },
  comboTier5:         { playful: "ON FIRE",                                 pro: "STREAK ×2" },
  comboTier8:         { playful: "BLAZING",                                 pro: "STREAK ×3" },

  // Notification kickers
  notifKickerSpin:    { playful: "Daily spin",                              pro: "Daily reward" },
  notifKickerSticker: { playful: "Sticker dropped",                         pro: "Achievement granted" },
  notifKickerBadge:   { playful: "Badge dropped",                           pro: "Recognition granted" },
  notifKickerCombo:   { playful: "Combo unlocked",                          pro: "Streak milestone" },
  notifKickerTower:   { playful: "Tower cleared",                           pro: "Bonus event complete" },
  notifKickerBust:    { playful: "Bust",                                    pro: "Reset" },

  // Signup
  signupModeLabel:    {
    playful: "I prefer a calmer, less cartoon-y interface (you can change this any time).",
    pro:     "I prefer a calmer, less cartoon-y interface (you can change this any time)."
  }
};

export type CopyKey = keyof typeof COPY;

export function t(key: CopyKey, mode: PreferredMode): string {
  const entry = COPY[key];
  if (!entry) return "";
  return mode === "pro" ? entry.pro : entry.playful;
}
