import { getCurrentUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const user = await getCurrentUser();
  const reason = user?.suspendedReason || "An admin paused your account.";

  return (
    <main className="suspended-shell">
      <div className="suspended-card">
        <span className="suspended-tag">Account paused</span>
        <h1>Your board is on hold.</h1>
        <p>{reason}</p>
        <p className="suspended-footnote">
          Questions? Reach out to an admin and we&apos;ll sort it out.
        </p>
        <form action="/api/logout" method="post">
          <button type="submit" className="suspended-logout">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
