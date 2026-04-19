import Image from "next/image";
import Link from "next/link";
import { LteBanner } from "../components/lte-banner";
import { requireUser } from "../lib/auth";
import { GAMEBOARD_LENGTH } from "../lib/gameboard-config";
import { getGameboardRun, getSideQuestAnalytics } from "../lib/sidequest-db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [analytics, run] = await Promise.all([
    getSideQuestAnalytics(),
    getGameboardRun(user.id)
  ]);
  const showLteBanner = !run.completedAt;

  return (
    <main className="app-shell personal-shell">
      <nav className="topbar" aria-label="Dashboard">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">SQ</span>
          <span>SideQuest</span>
        </Link>
        <div className="nav-actions">
          <Link href="/board">My board</Link>
          <Link href="/achievements">Hall</Link>
          <Link href="/admin">Admin</Link>
          <form action="/api/logout" method="post">
            <button type="submit" className="ghost-button">Log out</button>
          </form>
        </div>
      </nav>

      {showLteBanner ? (
        <LteBanner
          rollsAvailable={run.rollsAvailable}
          position={run.position}
          length={GAMEBOARD_LENGTH}
        />
      ) : null}

      <section className="personal-hero" aria-labelledby="personal-title">
        <div>
          <p className="eyebrow">Your personal dashboard</p>
          <h1 id="personal-title">Welcome back, {user.name}.</h1>
          <p>
            Check your week, jump into your board, or peek at admin analytics if your account has access.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/board">
              Open my board
            </Link>
            <Link className="secondary-button" href="/admin">
              View admin
            </Link>
          </div>
        </div>
        <Image src="/sticker-shield.svg" alt="" width={180} height={180} priority />
      </section>

      <section className="personal-grid" aria-label="Personal dashboard">
        <article className="personal-card primary-panel">
          <span>Active quests</span>
          <strong>{analytics.activeQuests}</strong>
          <p>Open the board when you are ready to move one forward.</p>
        </article>
        <article className="personal-card mint-panel">
          <span>Completion rate</span>
          <strong>{analytics.completionRate}%</strong>
          <p>Private progress for you and your party, not a global scoreboard.</p>
        </article>
        <article className="personal-card sky-panel">
          <span>Weekly clears</span>
          <strong>{analytics.weeklyClears}</strong>
          <p>The streak view tracks momentum without turning it into pressure.</p>
        </article>
        <article className="personal-card pink-panel">
          <span>Rewards</span>
          <strong>{analytics.rewardsUnlocked}</strong>
          <p>Badges and stickers wake up when quests get cleared.</p>
        </article>
      </section>

      <section className="personal-tutorial" aria-labelledby="personal-tutorial-title">
        <div>
          <p className="eyebrow">Board tutorial</p>
          <h2 id="personal-tutorial-title">Your first SideQuest run</h2>
        </div>
        <ol>
          <li>Start on your board and press N to create a quest.</li>
          <li>Choose a category lane so the card gets its own color and reward style.</li>
          <li>Use Focus mode for one sprint, then complete the quest for a clear moment.</li>
        </ol>
        <Link className="primary-button small" href="/board">
          Try it now
        </Link>
      </section>
    </main>
  );
}
