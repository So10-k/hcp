import Link from "next/link";
import { requireAdmin } from "../lib/auth";
import { getSideQuestAnalytics } from "../lib/sidequest-db";
import { categoryMeta } from "../seed-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const analytics = await getSideQuestAnalytics();
  const updated = analytics.updatedAt ? new Date(analytics.updatedAt).toLocaleString() : "Waiting for DATABASE_URL";

  return (
    <main className="admin-shell">
      <nav className="admin-topbar" aria-label="Admin">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">SQ</span>
          <span>SideQuest</span>
        </Link>
        <Link className="secondary-button small" href="/dashboard">
          Back to dashboard
        </Link>
        <form action="/api/logout" method="post">
          <button type="submit" className="ghost-button small">Log out</button>
        </form>
      </nav>

      <section className="admin-hero" aria-labelledby="admin-title">
        <div>
          <p className="eyebrow">Admin analytics</p>
          <h1 id="admin-title">Quest ops</h1>
          <p>
            Signed in as {admin.username}. Track board health, category momentum, reward unlocks, and private user records.
          </p>
        </div>
        <div className="admin-source is-live">
          <span>Neon live</span>
          <strong>{updated}</strong>
        </div>
      </section>

      <section className="metric-grid" aria-label="Analytics summary">
        <Metric label="Total quests" value={analytics.totalQuests} note={`${analytics.activeQuests} still active`} />
        <Metric label="Completion" value={`${analytics.completionRate}%`} note={`${analytics.completedQuests} cleared`} />
        <Metric label="Average progress" value={`${analytics.averageProgress}%`} note="Across every quest" />
        <Metric label="Total XP" value={analytics.totalXp} note={`${analytics.rewardsUnlocked} rewards unlocked`} />
        <Metric label="Users" value={analytics.totalUsers} note={`${analytics.adminUsers} admin accounts`} />
        <Metric label="Teen members" value={analytics.teenUsers} note="Private user records" />
      </section>

      <section className="admin-grid">
        <div className="admin-panel category-analytics">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Category momentum</p>
              <h2>Quest lanes</h2>
            </div>
          </div>
          {analytics.categoryBreakdown.map((item) => (
            <div className={`analytics-row ${categoryMeta[item.category].className}`} key={item.category}>
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.completed}/{item.total} cleared · {item.xp} XP
                </span>
              </div>
              <div className="analytics-bar" aria-label={`${item.label}: ${item.averageProgress}% average progress`}>
                <span style={{ width: `${item.averageProgress}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="admin-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Week shape</p>
              <h2>Clears by day</h2>
            </div>
          </div>
          <div className="admin-week">
            {analytics.streak.map((day) => (
              <div key={day.day}>
                <strong>{day.day}</strong>
                <span>{day.completed}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel admin-activity">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Recent signals</p>
              <h2>Activity</h2>
            </div>
          </div>
          {analytics.recentActivity.map((item) => (
            <p key={item.id}>
              <strong>{item.actor}</strong> {item.text} <span>{item.time}</span>
            </p>
          ))}
        </div>

        <div className="admin-panel admin-users">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Admin only</p>
              <h2>User info</h2>
            </div>
          </div>
          {analytics.userInfo.length > 0 ? (
            analytics.userInfo.map((user) => (
              <article className="user-row" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span>@{user.username} · {user.email}</span>
                </div>
                <div>
                  <span>{user.role}</span>
                  <span>{user.favoriteCategory}</span>
                </div>
                <small>Last active {new Date(user.lastActiveAt).toLocaleDateString()}</small>
              </article>
            ))
          ) : (
            <p className="admin-empty">No signups yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, note, value }: { label: string; note: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
