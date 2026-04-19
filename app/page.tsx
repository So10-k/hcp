import Image from "next/image";
import Link from "next/link";
import FeatureVideos from "./components/feature-videos";
import { IntroTrigger } from "./components/intro-trigger";
import MobileLanding from "./components/mobile-landing";

export default function Home() {
  return (
    <>
      <MobileLanding />
      <main className="app-shell landing-shell landing-desktop-only">
      <nav className="topbar landing-topbar" aria-label="Primary">
        <Link className="brand-lockup" href="/">
          <img src="/assets/logo-primary.svg" alt="SideQuest" width={100} height={100} />
        </Link>
        <div className="nav-actions">
          <a href="#how">How it works</a>
          <a href="#reels">Feature reels</a>
          <Link href="/login">Log in</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy landing-copy-v2">
          <p className="eyebrow">Horizons hackathon build</p>
          <h1 id="landing-title">Real life. Quest mode.</h1>
          <p>Make a solo board. Invite a party. Clear homework, habits, clubs, and chores.</p>
          <div className="hero-actions">
            <Link className="primary-button" href="/signup">
              Sign up
            </Link>
            <IntroTrigger />
            <Link className="secondary-button" href="#reels">
              Watch reels
            </Link>
          </div>
          <p className="landing-safety">Private boards. No public ranks. No follower counts.</p>
        </div>

        <div className="hero-game-scene" aria-label="Animated SideQuest board preview">
          <div className="hero-scene-top">
            <span>SideQuest live</span>
            <strong>Press N</strong>
          </div>
          <div className="hero-board-menu">
            <div className="hero-board-tab active">
              <span>Solo</span>
              <strong>Personal board</strong>
            </div>
            <div className="hero-board-tab">
              <span>Party</span>
              <strong>Bio squad</strong>
            </div>
            <div className="hero-board-tab">
              <span>Join</span>
              <strong>SQ-CLUB</strong>
            </div>
          </div>
          <div className="hero-quest-stage">
            <article className="hero-quest-card hero-school-card">
              <span>SCH</span>
              <h2>Finish bio packet</h2>
              <div className="hero-progress">
                <i />
              </div>
              <small>+100 XP</small>
            </article>
            <article className="hero-quest-card hero-social-card">
              <span>SOC</span>
              <h2>Club pitch</h2>
              <div className="hero-progress">
                <i />
              </div>
              <small>Party clear</small>
            </article>
            <div className="hero-token-path" aria-hidden="true">
              <b />
              <b />
              <b />
              <b />
            </div>
          </div>
          <div className="hero-reward-shelf" aria-label="Reward shelf preview">
            <Image src="/sticker-star.svg" alt="" width={86} height={86} priority />
            <Image src="/sticker-bolt.svg" alt="" width={86} height={86} priority />
            <Image src="/sticker-spark.svg" alt="" width={86} height={86} priority />
            <strong>Confetti clear</strong>
          </div>
        </div>
      </section>

      <section className="landing-proof" id="how" aria-labelledby="how-title">
        <div>
          <p className="eyebrow">How SideQuest works</p>
          <h2 id="how-title">A game loop for your week.</h2>
        </div>
        <div className="how-grid">
          <article>
            <span>01</span>
            <h3>Make a quest</h3>
            <p>Pick a lane. Add steps. Set XP.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Run focus mode</h3>
            <p>One quest. Full screen. Sprint.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Clear together</h3>
            <p>Stickers, streaks, confetti.</p>
          </article>
        </div>
      </section>

      <section id="reels">
        <FeatureVideos />
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <p className="eyebrow">Ready player homework</p>
        <h2 id="cta-title">Your board is one click away.</h2>
        <div className="hero-actions">
          <Link className="primary-button" href="/dashboard">
            Enter dashboard
          </Link>
          <Link className="secondary-button" href="/board">
            Skip to board
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}
