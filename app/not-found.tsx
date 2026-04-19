import Link from "next/link";

export const metadata = {
  title: "404 · SideQuest took a side quest",
  description: "This page wandered off the board. Head back to your dashboard."
};

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <div className="not-found-stage">
        <div className="not-found-scene">
          <video
            className="not-found-video"
            src="/sidequest-morph.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        </div>

        <div className="not-found-copy">
          <span className="not-found-code">404</span>
          <h1 className="not-found-title">This page took a side quest.</h1>
          <p className="not-found-body">
            We couldn&apos;t find the thing you were looking for — it wandered off the
            board. Try one of these instead:
          </p>
          <div className="not-found-actions">
            <Link className="not-found-primary" href="/dashboard">
              ← Back to dashboard
            </Link>
            <Link className="not-found-secondary" href="/board">
              Open my board
            </Link>
            <Link className="not-found-ghost" href="/">
              Landing page
            </Link>
          </div>
          <p className="not-found-footnote">Error code · 404 · page not found</p>
        </div>
      </div>
    </main>
  );
}
