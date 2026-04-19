import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "../lib/auth";
import { getGameboardRun } from "../lib/sidequest-db";
import {
  GAMEBOARD_EVENT_SUBTITLE,
  GAMEBOARD_EVENT_TITLE,
  GAMEBOARD_LENGTH,
  GAMEBOARD_TILES
} from "../lib/gameboard-config";
import GameboardClient from "./gameboard-client";

export const dynamic = "force-dynamic";

export default async function GameboardLtdPage() {
  const user = await requireUser();
  const run = await getGameboardRun(user.id);

  if (run.completedAt) {
    redirect("/dashboard?event=completed");
  }

  return (
    <main className="app-shell gameboard-shell">
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
          <form action="/api/logout" method="post">
            <button type="submit" className="ghost-button">Log out</button>
          </form>
        </div>
      </nav>

      <GameboardClient
        initialRun={run}
        tiles={GAMEBOARD_TILES}
        length={GAMEBOARD_LENGTH}
        eventTitle={GAMEBOARD_EVENT_TITLE}
        eventSubtitle={GAMEBOARD_EVENT_SUBTITLE}
        playerLabel={user.username?.slice(0, 3).toUpperCase() || "YOU"}
      />
    </main>
  );
}
