import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead
} from "../../lib/sidequest-db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }
  const items = await listNotifications(user.id, { limit: 20 });
  const unread = items.filter((n) => !n.readAt).length;
  return NextResponse.json({ items, unread });
}

type PatchBody =
  | { action: "mark-read"; ids: number[] }
  | { action: "mark-all-read" };

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.action === "mark-read") {
    await markNotificationsRead(
      user.id,
      Array.isArray(body.ids) ? body.ids.filter((n) => Number.isFinite(n)) : []
    );
    return NextResponse.json({ ok: true });
  }
  if (body.action === "mark-all-read") {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
