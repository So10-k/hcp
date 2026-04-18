import { redirect } from "next/navigation";
import { clearSessionCookie } from "../../lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  redirect("/");
}
