import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSideQuestSession,
  deleteSideQuestSession,
  getUserBySessionToken,
  type AuthUser
} from "./sidequest-db";

export const SESSION_COOKIE = "sidequest_session";

export async function setSessionCookie(userId: string) {
  const session = await createSideQuestSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  await deleteSideQuestSession(token);
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return getUserBySessionToken(token);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.suspendedAt) {
    redirect("/suspended");
  }

  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard?admin=required");
  }

  return user;
}
