import { redirect } from "next/navigation";
import { setSessionCookie } from "../../lib/auth";
import { signUpSideQuestUser } from "../../lib/sidequest-db";
import { categoryOptions, type Category } from "../../seed-data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  let error: string | null = null;

  try {
    const favoriteCategory = String(formData.get("favoriteCategory") ?? "school") as Category;
    const wantsProMode = formData.get("preferredMode") === "pro";
    const user = await signUpSideQuestUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      favoriteCategory: categoryOptions.includes(favoriteCategory) ? favoriteCategory : "school",
      preferredMode: wantsProMode ? "pro" : "playful"
    });

    await setSessionCookie(user.id);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not create account.";
  }

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error)}`);
  }

  redirect("/dashboard");
}
