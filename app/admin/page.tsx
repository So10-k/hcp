import Link from "next/link";
import { requireAdmin } from "../lib/auth";
import { ADMIN_BADGES } from "../lib/badge-catalog";
import {
  getMaintenanceConfig,
  getSideQuestAnalytics,
  listRecentAdminAudit,
  listUsersForAdmin
} from "../lib/sidequest-db";
import { categoryMeta } from "../seed-data";
import { SiteControls } from "../components/site-controls";
import { AdminUserPanel } from "./admin-user-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [analytics, users, audit, maintenance] = await Promise.all([
    getSideQuestAnalytics(),
    listUsersForAdmin(),
    listRecentAdminAudit(25),
    getMaintenanceConfig()
  ]);
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
          <p className="eyebrow">Admin ops</p>
          <h1 id="admin-title">Quest ops console</h1>
          <p>
            Signed in as {admin.username}. Hand out stickers, bonus die rolls, and badges — or pause a board that needs a time-out.
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
              <p className="eyebrow">Admin audit trail</p>
              <h2>Recent actions</h2>
            </div>
          </div>
          {audit.length > 0 ? (
            <ul className="audit-list">
              {audit.map((row) => (
                <li key={row.id}>
                  <strong>@{row.adminUsername ?? "admin"}</strong>
                  <span>{humaniseAction(row.action)}</span>
                  {row.targetUsername ? <em>→ @{row.targetUsername}</em> : null}
                  <small>{new Date(row.createdAt).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-empty">Nothing yet — every admin action lands here.</p>
          )}
        </div>
      </section>

      <SiteControls initialEnabled={maintenance.enabled} initialMessage={maintenance.message} />

      <AdminUserPanel initialUsers={users} badges={ADMIN_BADGES} adminId={admin.id} />
    </main>
  );
}

function humaniseAction(action: string) {
  switch (action) {
    case "suspend": return "paused an account";
    case "unsuspend": return "restored an account";
    case "award-dice": return "granted bonus die rolls";
    case "award-badge": return "awarded a badge";
    case "award-sticker": return "awarded a sticker";
    case "force-logout": return "force-logged out a user";
    case "grant-temp-admin": return "granted temporary admin";
    case "revoke-role": return "revoked role";
    case "broadcast": return "sent broadcast notification";
    case "add-note": return "added admin note";
    case "set-site-config": return "changed site config";
    default: return action;
  }
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
