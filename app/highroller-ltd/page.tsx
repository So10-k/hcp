import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationBell } from "../components/notification-bell";
import { requireUser } from "../lib/auth";
import { GAMEBOARD_EVENT_ID } from "../lib/gameboard-config";
import { HIGHROLLER_EVENT_ID, HIGHROLLER_RUNG_COUNT } from "../lib/highroller-config";
import { getGameboardRun } from "../lib/sidequest-db";
import HighRollerClient from "./highroller-client";

export const dynamic = "force-dynamic";

export default async function HighRollerLtdPage() {
  const user = await requireUser();
  const [springRun, run] = await Promise.all([
    getGameboardRun(user.id, GAMEBOARD_EVENT_ID),
    getGameboardRun(user.id, HIGHROLLER_EVENT_ID)
  ]);

  // Gate: this event only opens after Spring Sprint is finished.
  if (!springRun.completedAt) {
    redirect("/dashboard?event=high-roller-locked");
  }

  if (run.completedAt) {
    redirect("/dashboard?event=high-roller-completed");
  }

  return (
    <main className="app-shell hr-shell">
      <nav className="topbar" aria-label="Primary">
        <Link className="brand-lockup" href="/dashboard" aria-label="SideQuest dashboard">
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

      <HighRollerClient
        initialRun={{
          position: run.position,
          rollsEarned: run.rollsEarned,
          rollsUsed: run.rollsUsed,
          rollsAvailable: run.rollsAvailable,
          laps: run.laps,
          peakPosition: run.peakPosition,
          completedAt: run.completedAt
        }}
        rungCount={HIGHROLLER_RUNG_COUNT}
        playerLabel={user.username?.slice(0, 3).toUpperCase() || "YOU"}
      />
    </main>
  );
}
