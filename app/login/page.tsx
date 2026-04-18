import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/auth";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <main className="app-shell auth-shell">
      <Link className="brand-lockup" href="/">
        <span className="brand-mark">SQ</span>
        <span>SideQuest</span>
      </Link>

      <section className="auth-panel" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 id="login-title">Log in</h1>
          <p>Your board, party, streaks, and admin access stay tied to your account.</p>
        </div>

        {params.error ? <p className="auth-error">{params.error}</p> : null}

        <form className="auth-form" action="/api/login" method="post">
          <label>
            Username or email
            <input name="usernameOrEmail" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="primary-button">
            Enter dashboard
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
