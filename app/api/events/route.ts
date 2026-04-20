import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import {
  enforceRateLimit,
  userRestartOwnEvent,
  userSetActiveEventPreference,
  type ActiveEventPreference
} from "../../lib/sidequest-db";

export const runtime = "nodejs";

type PostBody =
  | { action: "restart"; eventId: "spring-sprint" | "high-roller" }
  | { action: "set-preference"; preference: ActiveEventPreference };

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    await enforceRateLimit(user.id, "events-user", 20);
    const body = (await request.json().catch(() => ({}))) as Partial<PostBody>;

    // restart is admin-only (bypasses event progression)
    if (body.action === "restart") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Admins only." }, { status: 403 });
      }
      if (body.eventId !== "spring-sprint" && body.eventId !== "high-roller") {
        return NextResponse.json({ error: "Unknown event." }, { status: 400 });
      }
      await userRestartOwnEvent(user.id, body.eventId);
      return NextResponse.json({ ok: true });
    }

    // set-preference is user-accessible — controls which event gets tokens
    if (body.action === "set-preference") {
      const preference = await userSetActiveEventPreference(user.id, body.preference ?? "auto");
      return NextResponse.json({ ok: true, preference });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 400 }
    );
  }
}
