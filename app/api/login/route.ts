import { redirect } from "next/navigation";
import { setSessionCookie } from "../../lib/auth";
import { loginSideQuestUser } from "../../lib/sidequest-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  let error: string | null = null;

  try {
    const user = await loginSideQuestUser({
      usernameOrEmail: String(formData.get("usernameOrEmail") ?? ""),
      password: String(formData.get("password") ?? "")
    });

    await setSessionCookie(user.id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not sign in.";
  }

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  redirect("/dashboard");
}
