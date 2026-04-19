import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../lib/auth";
import { getSpectatorSnapshot } from "../../../lib/sidequest-db";

export const dynamic = "force-dynamic";

export default async function SpectatePage({ params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  const { userId } = await params;
  const snapshot = await getSpectatorSnapshot(userId).catch(() => null);
  if (!snapshot) {
    notFound();
  }
  const { user, state, gameboardRun, highRollerRun, notifications, updatedAt } = snapshot;
  const boards = state.boards ?? [];
  const rewards = state.rewards ?? [];
  const streak = state.streak ?? [];

  return (
    <main className="admin-shell spectate-shell">
      <nav className="admin-topbar" aria-label="Admin — spectate">
        <Link className="brand-lockup" href="/admin">
          <span className="brand-mark">SQ</span>
          <span>SideQuest</span>
        </Link>
        <Link className="secondary-button small" href="/admin">
          ← Back to admin
        </Link>
        <form action="/api/logout" method="post">
          <button type="submit" className="ghost-button small">Log out</button>
        </form>
      </nav>

      <section className="spectate-banner" aria-labelledby="spectate-title">
        <div>
          <p className="eyebrow">Spectator mode · read-only</p>
          <h1 id="spectate-title">
            {user.name} <span className="spectate-sub">@{user.username}</span>
          </h1>
          <p className="spectate-body">
            You&apos;re watching {user.name}&apos;s board as {admin.username}. Nothing you see here is
            editable — no state is written from this screen.
          </p>
          <div className="spectate-meta">
            <span className="spectate-pill">Role · {user.role}</span>
            <span className="spectate-pill">Quests · {user.questsCompleted}/{user.questsCreated}</span>
            <span className="spectate-pill">
              Last active · {new Date(user.lastActiveAt).toLocaleString()}
            </span>
            <span className="spectate-pill">
              Board synced · {new Date(updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      <section className="spectate-grid">
        <article className="spectate-card">
          <h2>Boards ({boards.length})</h2>
          {boards.length === 0 ? (
            <p className="admin-empty">No boards.</p>
          ) : (
            boards.map((board) => (
              <div key={board.id} className="spectate-board">
                <div className="spectate-board-head">
                  <strong>{board.title}</strong>
                  <span>{board.kind === "personal" ? "Personal" : `Party · ${board.inviteCode}`}</span>
                </div>
                <p className="spectate-board-line">
                  {board.quests.length} quests · {board.quests.filter((q) => q.completed).length} cleared
                  {board.kind === "party" ? ` · ${board.members.length} members` : ""}
                </p>
                {board.quests.length > 0 ? (
                  <ul className="spectate-quest-list">
                    {board.quests.slice(0, 6).map((q) => (
                      <li key={q.id}>
                        <span className={`spectate-quest-dot ${q.completed ? "is-done" : ""}`} />
                        <div>
                          <strong>{q.title}</strong>
                          <small>
                            {q.category} · {q.xp} XP · {q.progress}%
                            {q.completed ? " · cleared" : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                    {board.quests.length > 6 ? (
                      <li className="spectate-quest-more">
                        +{board.quests.length - 6} more quests…
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </article>

        <article className="spectate-card">
          <h2>Reward shelf ({rewards.length})</h2>
          {rewards.length === 0 ? (
            <p className="admin-empty">No rewards yet.</p>
          ) : (
            <ul className="spectate-reward-list">
              {rewards.slice(0, 12).map((r) => (
                <li key={r.id}>
                  <Image src={r.image} alt="" width={52} height={52} />
                  <div>
                    <strong>{r.title}</strong>
                    <small>{r.kind} · {r.note}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="spectate-card">
          <h2>Spring Sprint</h2>
          {gameboardRun ? (
            <div className="spectate-run">
              <div><strong>Tile</strong><span>{gameboardRun.position}</span></div>
              <div><strong>Rolls available</strong><span>{gameboardRun.rollsAvailable}</span></div>
              <div><strong>Rolls earned</strong><span>{gameboardRun.rollsEarned}</span></div>
              <div><strong>Rolls used</strong><span>{gameboardRun.rollsUsed}</span></div>
              <div><strong>Laps</strong><span>{gameboardRun.laps}</span></div>
              <div><strong>Completed</strong><span>{gameboardRun.completedAt ? new Date(gameboardRun.completedAt).toLocaleString() : "—"}</span></div>
            </div>
          ) : (
            <p className="admin-empty">No Spring Sprint run yet.</p>
          )}
        </article>

        <article className="spectate-card">
          <h2>High Roller</h2>
          {highRollerRun ? (
            <div className="spectate-run">
              <div><strong>Rung</strong><span>{highRollerRun.position}</span></div>
              <div><strong>Peak</strong><span>{highRollerRun.peakPosition}</span></div>
              <div><strong>Flips ready</strong><span>{highRollerRun.rollsAvailable}</span></div>
              <div><strong>Flips earned</strong><span>{highRollerRun.rollsEarned}</span></div>
              <div><strong>Flips used</strong><span>{highRollerRun.rollsUsed}</span></div>
              <div><strong>Busts</strong><span>{highRollerRun.laps}</span></div>
              <div><strong>Completed</strong><span>{highRollerRun.completedAt ? new Date(highRollerRun.completedAt).toLocaleString() : "—"}</span></div>
            </div>
          ) : (
            <p className="admin-empty">No High Roller run yet.</p>
          )}
        </article>

        <article className="spectate-card">
          <h2>Streak</h2>
          <div className="spectate-streak">
            {streak.map((day) => (
              <div
                key={day.day}
                className={day.completed >= day.target ? "is-hit" : day.completed > 0 ? "is-partial" : ""}
              >
                <strong>{day.day}</strong>
                <span>
                  {day.completed}/{day.target}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="spectate-card spectate-card-wide">
          <h2>Recent notifications ({notifications.length})</h2>
          {notifications.length === 0 ? (
            <p className="admin-empty">None yet.</p>
          ) : (
            <ul className="spectate-notif-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small>
                    {new Date(n.createdAt).toLocaleString()}
                    {n.readAt ? " · read" : " · unread"}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
