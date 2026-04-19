import Image from "next/image";
import Link from "next/link";
import FeatureVideos from "./feature-videos";

export default function MobileLanding() {
  return (
    <main className="mobile-landing landing-mobile-only" aria-label="SideQuest (mobile)">
      <nav className="mobile-nav" aria-label="Primary">
        <Link className="mobile-brand" href="/">
          <img src="/assets/logo-primary.svg" alt="SideQuest" />
        </Link>
        <Link className="mobile-nav-login" href="/login">
          Log in
        </Link>
      </nav>

      <section className="mobile-hero" aria-labelledby="mobile-title">
        <p className="eyebrow">Horizons hackathon build</p>
        <h1 id="mobile-title">Real life. Quest mode.</h1>
        <p className="mobile-sub">
          Make a solo board. Invite a party. Clear homework, habits, clubs, and chores.
        </p>

        <div className="mobile-actions">
          <Link className="mobile-primary" href="/signup">
            Sign up
          </Link>
          <Link className="mobile-secondary" href="#mobile-how">
            How it works
          </Link>
        </div>

        <p className="mobile-safety">Private boards. No public ranks.</p>

        <div className="mobile-preview" aria-label="Board preview">
          <div className="mobile-preview-top">
            <span>SideQuest live</span>
            <strong>Solo</strong>
          </div>
          <article className="mobile-preview-card">
            <span>SCH</span>
            <h2>Finish bio packet</h2>
            <div className="mobile-preview-progress">
              <i />
            </div>
            <small>+100 XP</small>
          </article>
          <div className="mobile-preview-rewards" aria-label="Reward shelf">
            <Image src="/sticker-star.png" alt="" width={56} height={56} />
            <Image src="/sticker-bolt.png" alt="" width={56} height={56} />
            <Image src="/sticker-spark.png" alt="" width={56} height={56} />
            <strong>Confetti clear</strong>
          </div>
        </div>
      </section>

      <section className="mobile-how" id="mobile-how" aria-labelledby="mobile-how-title">
        <p className="eyebrow">How it works</p>
        <h2 id="mobile-how-title">A game loop for your week.</h2>
        <ol className="mobile-steps">
          <li>
            <span>01</span>
            <h3>Make a quest</h3>
            <p>Pick a lane. Add steps. Set XP.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Run focus mode</h3>
            <p>One quest. Full screen. Sprint.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Clear together</h3>
            <p>Stickers, streaks, confetti.</p>
          </li>
        </ol>
      </section>

      <section className="mobile-reels" id="mobile-reels">
        <FeatureVideos />
      </section>

      <section className="mobile-cta-block" aria-labelledby="mobile-cta-title">
        <Image
          className="mobile-cta-monogram"
          src="/assets/monogram-star.svg"
          alt=""
          width={72}
          height={72}
        />
        <p className="eyebrow">Ready player homework</p>
        <h2 id="mobile-cta-title">Your board is one tap away.</h2>
        <div className="mobile-actions">
          <Link className="mobile-primary" href="/dashboard">
            Enter dashboard
          </Link>
          <Link className="mobile-secondary" href="/board">
            Skip to board
          </Link>
        </div>
      </section>

      <footer className="mobile-foot">
        <img src="/assets/logo-reverse.svg" alt="SideQuest" />
        <p>Made for Horizons hackathon.</p>
      </footer>
    </main>
  );
}
