/**
 * Custom admin-awardable badges. Each entry shows up in the admin
 * dashboard as an "award" button and drops into the recipient's reward
 * shelf + hall of achievements. Add new entries here; no schema change
 * required (badges are just entries in the user's `state.rewards[]`).
 */

export type AdminBadge = {
  id: string;
  title: string;
  kind: "badge" | "sticker";
  image: string;
  color: string;
  note: string;
  vibe: string;
};

export const ADMIN_BADGES: AdminBadge[] = [
  {
    id: "badge-bug-hunter",
    title: "Bug Hunter",
    kind: "badge",
    image: "/sticker-shield.svg",
    color: "#ff5a3d",
    note: "Spotted a bug and helped the team fix it. Legend status.",
    vibe: "You went on a bug hunt. We owe you one."
  },
  {
    id: "badge-early-adopter",
    title: "Early Adopter",
    kind: "badge",
    image: "/sticker-star.svg",
    color: "#ffd43d",
    note: "Showed up before the crowd. Here from day one.",
    vibe: "Thanks for being here early. You shaped this."
  },
  {
    id: "badge-beta-tester",
    title: "Beta Tester",
    kind: "badge",
    image: "/sticker-bolt.svg",
    color: "#5fc7f2",
    note: "Tested beta builds and left real feedback.",
    vibe: "You tested the rough edges smooth."
  },
  {
    id: "badge-community-hero",
    title: "Community Hero",
    kind: "badge",
    image: "/sticker-spark.svg",
    color: "#ff78b7",
    note: "Lifted the community. Helped other questers clear.",
    vibe: "Your crew is lucky you showed up."
  },
  {
    id: "badge-quest-legend",
    title: "Quest Legend",
    kind: "badge",
    image: "/sticker-leaf.svg",
    color: "#44d7a8",
    note: "Ran an absurd streak of clears. A legend move.",
    vibe: "Untouchable streak. Hall of fame stuff."
  },
  {
    id: "badge-spring-champ",
    title: "Spring Sprint Champ",
    kind: "badge",
    image: "/sticker-spring-sprint.svg",
    color: "#ffd43d",
    note: "Closed out the Spring Sprint event before anyone else.",
    vibe: "Looped it. First. Cold."
  },
  {
    id: "badge-high-roller",
    title: "High Roller",
    kind: "badge",
    image: "/sticker-high-roller.svg",
    color: "#ff5a3d",
    note: "Climbed the Coin Tower. Pure luck, pure stats.",
    vibe: "Tails be damned. Made it to rung 10."
  }
];

export function getBadgeById(id: string): AdminBadge | undefined {
  return ADMIN_BADGES.find((badge) => badge.id === id);
}
