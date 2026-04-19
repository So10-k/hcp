import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { getBadgeById } from "../../../lib/badge-catalog";
import {
  adminAwardBadge,
  adminAwardDice,
  adminAwardSticker,
  adminSuspendUser,
  adminUnsuspendUser
} from "../../../lib/sidequest-db";

export const runtime = "nodejs";

type ActionBody =
  | { action: "suspend"; userId: string; reason?: string }
  | { action: "unsuspend"; userId: string }
  | { action: "award-dice"; userId: string; count: number }
  | { action: "award-badge"; userId: string; badgeId: string }
  | {
      action: "award-sticker";
      userId: string;
      title: string;
      image: string;
      note: string;
      kind?: "badge" | "sticker";
    };

export async function POST(request: Request) {
  const admin = await requireAdmin();
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "suspend":
        await adminSuspendUser(admin.id, body.userId, body.reason ?? "");
        return NextResponse.json({ ok: true });
      case "unsuspend":
        await adminUnsuspendUser(admin.id, body.userId);
        return NextResponse.json({ ok: true });
      case "award-dice":
        await adminAwardDice(admin.id, body.userId, body.count);
        return NextResponse.json({ ok: true });
      case "award-badge": {
        const badge = getBadgeById(body.badgeId);
        if (!badge) {
          return NextResponse.json({ error: "Unknown badge." }, { status: 400 });
        }
        await adminAwardBadge(admin.id, body.userId, badge);
        return NextResponse.json({ ok: true });
      }
      case "award-sticker":
        await adminAwardSticker(admin.id, body.userId, {
          title: body.title,
          image: body.image,
          note: body.note,
          kind: body.kind
        });
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed." },
      { status: 400 }
    );
  }
}
