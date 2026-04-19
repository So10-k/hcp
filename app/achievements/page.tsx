import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "../components/notification-bell";
import { requireUser } from "../lib/auth";
import { getGameboardRun, loadSideQuestBoard } from "../lib/sidequest-db";
import { GAMEBOARD_EVENT_TITLE, GAMEBOARD_REWARD_IMAGE, GAMEBOARD_REWARD_TITLE } from "../lib/gameboard-config";
import {
  HIGHROLLER_EVENT_ID,
  HIGHROLLER_EVENT_TITLE,
  HIGHROLLER_REWARD_ID,
  HIGHROLLER_REWARD_IMAGE,
  HIGHROLLER_REWARD_TITLE
} from "../lib/highroller-config";
import type { Reward } from "../seed-data";

export const dynamic = "force-dynamic";

type MasterSlot = {
  id: string;
  title: string;
  lane: string;
  note: string;
  image: string;
  category: "school" | "health" | "social" | "creative" | "life" | "event";
  color: string;
};

const MASTER_SLOTS: MasterSlot[] = [
  {
    id: "slot-school",
    title: "Brain Star",
    lane: "School",
    note: "Clear a school quest — homework, study, tests.",
    image: "/sticker-star.svg",
    category: "school",
    color: "#ffd43d"
  },
  {
    id: "slot-health",
    title: "Fresh Leaf",
    lane: "Health",
    note: "Clear a health quest — movement, sleep, food, reset.",
    image: "/sticker-leaf.svg",
    category: "health",
    color: "#44d7a8"
  },
  {
    id: "slot-social",
    title: "Squad Spark",
    lane: "Social",
    note: "Clear a social quest — clubs, hangouts, plans.",
    image: "/sticker-bolt.svg",
    category: "social",
    color: "#5fc7f2"
  },
  {
    id: "slot-creative",
    title: "Paint Flare",
    lane: "Creative",
    note: "Clear a creative quest — art, music, builds.",
    image: "/sticker-spark.svg",
    category: "creative",
    color: "#ff78b7"
  },
  {
    id: "slot-life",
    title: "Done Shield",
    lane: "Life admin",
    note: "Clear a life-admin quest — chores, errands, inbox.",
    image: "/sticker-shield.svg",
    category: "life",
    color: "#ff5a3d"
  },
  {
    id: "slot-spring",
    title: GAMEBOARD_REWARD_TITLE,
    lane: "Event",
    note: `Loop the ${GAMEBOARD_EVENT_TITLE} dice board.`,
    image: GAMEBOARD_REWARD_IMAGE,
    category: "event",
    color: "#ffd43d"
  },
  {
    id: "slot-high-roller",
    title: HIGHROLLER_REWARD_TITLE,
    lane: "Event · Coin Tower",
    note: `Climb to rung 10 of the ${HIGHROLLER_EVENT_TITLE} tower. Pure luck.`,
    image: HIGHROLLER_REWARD_IMAGE,
    category: "event",
    color: "#ff5a3d"
  }
];

function isUnlocked(slot: MasterSlot, rewards: Reward[]): boolean {
  // Match by image first (works for the lane stickers and the unique
  // HR/SS images). Then fall back to slot-specific id checks for events.
  return rewards.some((r) => {
    if (!r.unlocked) return false;
    if (r.image === slot.image) return true;
    if (slot.id === "slot-high-roller") {
      return r.id === HIGHROLLER_REWARD_ID;
    }
    if (slot.id === "slot-spring") {
      return r.id.startsWith("reward-lte-spring-sprint");
    }
    return false;
  });
}

export default async function AchievementsPage() {
  const user = await requireUser();
  const [board, run] = await Promise.all([
    loadSideQuestBoard(user.id),
    getGameboardRun(user.id).catch(() => null)
  ]);
  const rewards = board.state.rewards ?? [];
  const earned = rewards.filter((r) => r.unlocked);
  const unlockedSlots = MASTER_SLOTS.filter((s) => isUnlocked(s, rewards));

  const stats = [
    { label: "Stickers earned", value: earned.length, bg: "primary-panel" },
    { label: "Lanes unlocked", value: `${unlockedSlots.length} / ${MASTER_SLOTS.length}`, bg: "mint-panel" },
    { label: "Framed awards", value: earned.length, bg: "sky-panel" },
    { label: "Event sticker", value: run?.completedAt ? "Earned" : "Pending", bg: "pink-panel" }
  ];

  return (
    <main className="app-shell hall-shell">
      <nav className="topbar" aria-label="Hall of achievements">
        <Link className="brand-lockup" href="/dashboard">
          <span className="brand-mark">SQ</span>
          <span>SideQuest</span>
        </Link>
        <div className="nav-actions">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/board">My board</Link>
          <Link href="/achievements">Hall</Link>
          {user.role === "admin" ? <Link href="/admin">Admin</Link> : null}
          <NotificationBell />
          <form action="/api/logout" method="post">
            <button type="submit" className="ghost-button">Log out</button>
          </form>
        </div>
      </nav>

      <section className="hall-hero" aria-labelledby="hall-title">
        <div>
          <p className="eyebrow">Hall of achievements</p>
          <h1 id="hall-title">Every clear, on the wall.</h1>
          <p className="hall-hero-sub">
            Finish a quest, earn a sticker. Finish an event, frame it. Your private trophy
            room — no public ranks, just your run.
          </p>
        </div>
        <Image src="/sticker-spring-sprint.svg" alt="" width={190} height={190} priority />
      </section>

      <section className="hall-stats" aria-label="Collection stats">
        {stats.map((s) => (
          <article key={s.label} className={`personal-card ${s.bg}`}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </article>
        ))}
      </section>

      <section className="sticker-book" aria-labelledby="book-title">
        <div className="sticker-book-head">
          <p className="eyebrow">Sticker book</p>
          <h2 id="book-title">Collect all six.</h2>
        </div>
        <div className="sticker-book-spread">
          <div className="sticker-book-page sticker-book-page-left">
            <p className="sticker-book-page-label">Page 01 · Lanes</p>
            <div className="sticker-book-grid">
              {MASTER_SLOTS.slice(0, 3).map((slot) => (
                <StickerSlot key={slot.id} slot={slot} unlocked={isUnlocked(slot, rewards)} />
              ))}
            </div>
          </div>
          <div className="sticker-book-spine" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="sticker-book-page sticker-book-page-right">
            <p className="sticker-book-page-label">Page 02 · Lanes + events</p>
            <div className="sticker-book-grid">
              {MASTER_SLOTS.slice(3).map((slot) => (
                <StickerSlot key={slot.id} slot={slot} unlocked={isUnlocked(slot, rewards)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="trophy-wall" aria-labelledby="trophies-title">
        <div className="trophy-wall-head">
          <p className="eyebrow">Trophy shelf</p>
          <h2 id="trophies-title">Framed awards</h2>
          <p className="trophy-wall-sub">
            Every individual quest you&apos;ve cleared, framed and mounted. This grows as your
            week goes.
          </p>
        </div>
        {earned.length > 0 ? (
          <div className="trophy-shelves">
            {chunkBy(earned, 4).map((row, rowIndex) => (
              <div key={rowIndex} className="trophy-shelf">
                <div className="trophy-shelf-row">
                  {row.map((reward) => (
                    <TrophyFrame key={reward.id} reward={reward} />
                  ))}
                </div>
                <div className="trophy-shelf-plank" aria-hidden="true" />
              </div>
            ))}
          </div>
        ) : (
          <div className="trophy-empty">
            <p>No framed awards yet. Clear a quest on your board and it&apos;ll land here.</p>
            <Link className="not-found-primary" href="/board">
              Open my board →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function StickerSlot({ slot, unlocked }: { slot: MasterSlot; unlocked: boolean }) {
  return (
    <article className={`sticker-slot${unlocked ? " is-unlocked" : " is-locked"}`}>
      <div className="sticker-slot-art" style={{ background: unlocked ? slot.color : undefined }}>
        {unlocked ? (
          <Image src={slot.image} alt={slot.title} width={124} height={124} />
        ) : (
          <span className="sticker-slot-question" aria-hidden="true">?</span>
        )}
      </div>
      <div className="sticker-slot-body">
        <span className="sticker-slot-lane">{slot.lane}</span>
        <strong className="sticker-slot-title">{unlocked ? slot.title : "Locked"}</strong>
        <small className="sticker-slot-note">{slot.note}</small>
      </div>
    </article>
  );
}

function TrophyFrame({ reward }: { reward: Reward }) {
  return (
    <article className="trophy-frame" title={reward.title}>
      <div className="trophy-frame-mat">
        <Image src={reward.image} alt={reward.title} width={120} height={120} />
      </div>
      <div className="trophy-plaque">
        <strong>{reward.title}</strong>
        <small>{reward.kind === "badge" ? "Badge" : "Sticker"}</small>
      </div>
    </article>
  );
}

function chunkBy<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
