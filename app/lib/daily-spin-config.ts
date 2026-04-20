/**
 * Daily Spin — once per day per user. The wheel has 8 wedges; each spin
 * the server picks a wedge by weight, applies the prize, and records the
 * spin so the user can't double-claim.
 *
 * Wedge order is the visual order on the wheel (clockwise from the
 * 12 o'clock position). Weights are in arbitrary units; the server
 * normalizes by sum.
 */

export type SpinPrizeKind = "xp" | "dice" | "flips" | "sticker" | "jackpot";

export type SpinPrize = {
  id: string;
  label: string;
  kind: SpinPrizeKind;
  amount: number;          // payload amount (XP / dice / flip count); 0 for sticker/jackpot
  weight: number;          // higher = more likely
  color: string;           // wheel wedge color
  textColor: string;       // wedge label text color
  short: string;           // ultra-short label (banner/admin/legend)
  icon: string;            // single emoji shown big on the wedge
  amountText: string;      // bold prize value shown below the icon
  kindLabel: string;       // tiny label shown below the value
};

export const SPIN_PRIZES: SpinPrize[] = [
  { id: "xp-25",   label: "+25 XP boost",          kind: "xp",      amount: 25, weight: 18, color: "#5fc7f2", textColor: "#171512", short: "+25 XP",   icon: "⚡", amountText: "+25",      kindLabel: "XP" },
  { id: "dice-2",  label: "+2 dice rolls",         kind: "dice",    amount: 2,  weight: 16, color: "#ffd43d", textColor: "#171512", short: "+2 🎲",    icon: "🎲", amountText: "+2",       kindLabel: "Dice" },
  { id: "dice-3",  label: "+3 dice rolls",         kind: "dice",    amount: 3,  weight: 11, color: "#ffd43d", textColor: "#171512", short: "+3 🎲",    icon: "🎲", amountText: "+3",       kindLabel: "Dice" },
  { id: "flips-2", label: "+2 flip tokens",        kind: "flips",   amount: 2,  weight: 16, color: "#ff5a3d", textColor: "#171512", short: "+2 🪙",    icon: "🪙", amountText: "+2",       kindLabel: "Flips" },
  { id: "xp-75",   label: "+75 XP boost",          kind: "xp",      amount: 75, weight: 12, color: "#44d7a8", textColor: "#171512", short: "+75 XP",   icon: "💫", amountText: "+75",      kindLabel: "XP" },
  { id: "dice-5",  label: "+5 dice rolls",         kind: "dice",    amount: 5,  weight: 10, color: "#ff8a3d", textColor: "#171512", short: "+5 🎲",    icon: "🎲", amountText: "+5",       kindLabel: "Dice" },
  { id: "flips-5", label: "+5 flip tokens",        kind: "flips",   amount: 5,  weight: 10, color: "#b8392b", textColor: "#fffaf0", short: "+5 🪙",    icon: "🪙", amountText: "+5",       kindLabel: "Flips" },
  { id: "sticker", label: "Random sticker drop",   kind: "sticker", amount: 0,  weight: 14, color: "#ff78b7", textColor: "#171512", short: "✨ STKR",  icon: "✨", amountText: "Sticker",  kindLabel: "Random" },
  { id: "jackpot", label: "Jackpot Spinner badge", kind: "jackpot", amount: 0,  weight: 4,  color: "#171512", textColor: "#ffd43d", short: "★ JCKPT",  icon: "💎", amountText: "JACKPOT",  kindLabel: "Badge" }
];

export const SPIN_TOTAL_WEIGHT = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);

export function getSpinPrizeById(id: string): SpinPrize | undefined {
  return SPIN_PRIZES.find((p) => p.id === id);
}

/**
 * Server-side weighted pick. Uses Math.random() — fine for a daily-spin
 * cosmetic feature (we don't need cryptographic randomness).
 */
export function pickSpinPrize(): SpinPrize {
  const roll = Math.random() * SPIN_TOTAL_WEIGHT;
  let acc = 0;
  for (const prize of SPIN_PRIZES) {
    acc += prize.weight;
    if (roll < acc) return prize;
  }
  return SPIN_PRIZES[SPIN_PRIZES.length - 1];
}

/**
 * Stable date key (YYYY-MM-DD) in UTC. We bucket spins by UTC day so a
 * user gets exactly one spin per global day, regardless of timezone.
 */
export function todayKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const SPIN_BADGE_JACKPOT = {
  id: "badge-spin-jackpot",
  title: "Jackpot Spinner",
  image: "/sticker-spring-sprint.svg",
  note: "Hit the jackpot wedge on the daily spin.",
  vibe: "House loses. Every once in a while."
} as const;

export const SPIN_STICKER_POOL = [
  { id: "spin-sticker-star",  title: "Lucky Star",  image: "/sticker-star.svg" },
  { id: "spin-sticker-bolt",  title: "Lucky Bolt",  image: "/sticker-bolt.svg" },
  { id: "spin-sticker-leaf",  title: "Lucky Leaf",  image: "/sticker-leaf.svg" },
  { id: "spin-sticker-spark", title: "Lucky Spark", image: "/sticker-spark.svg" },
  { id: "spin-sticker-shield",title: "Lucky Shield",image: "/sticker-shield.svg" }
] as const;

export function pickRandomSpinSticker() {
  return SPIN_STICKER_POOL[Math.floor(Math.random() * SPIN_STICKER_POOL.length)];
}

// Combo multiplier config (lives here for proximity to the other
// addictive-loop tunables).
export const COMBO_WINDOW_MS = 90_000;
export const COMBO_BADGE_THRESHOLDS = [5, 10] as const;
