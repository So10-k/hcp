import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignupPage({ searchParams }: AuthPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="app-shell auth-shell signup-shell">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark">SQ</span>
        <span>SideQuest</span>
      </Link>

      <section className="auth-panel" aria-labelledby="signup-title">
        <div>
          <p className="eyebrow">Claim your board</p>
          <h1 id="signup-title">Sign up</h1>
          <p>Make a private SideQuest account with a username, password, and favorite quest lane.</p>
        </div>

        {params.error ? <p className="auth-error">{params.error}</p> : null}

        <form className="auth-form" action="/api/signup" method="post">
          <label>
            Display name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Username
            <input name="username" autoComplete="username" minLength={3} required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Favorite lane
            <select name="favoriteCategory" defaultValue="school">
              <option value="school">School</option>
              <option value="creative">Creative</option>
              <option value="health">Health</option>
              <option value="social">Social</option>
              <option value="life admin">Life admin</option>
            </select>
          </label>
          <label className="auth-checkbox">
            <input
              type="checkbox"
              name="preferredMode"
              value="pro"
            />
            <span>
              <strong>Pro mode.</strong> Prefer a calmer, less cartoon-y interface
              — fewer animations, muted decoration, grown-up vocabulary. You can
              switch back any time.
            </span>
          </label>
          <button type="submit" className="primary-button">
            Create account
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
