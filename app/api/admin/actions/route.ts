import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { getBadgeById } from "../../../lib/badge-catalog";
import { GAMEBOARD_EVENT_ID } from "../../../lib/gameboard-config";
import { HIGHROLLER_EVENT_ID } from "../../../lib/highroller-config";
import {
  adminAwardBadge,
  adminAwardDice,
  adminAwardEventTokens,
  adminAwardSticker,
  adminCompleteGameboardEvent,
  adminForceDailySpin,
  adminResetCombo,
  adminResetDailySpin,
  adminResetGameboardEvent,
  adminSuspendUser,
  adminUnsuspendUser
} from "../../../lib/sidequest-db";

export const runtime = "nodejs";

const KNOWN_EVENT_IDS = new Set<string>([GAMEBOARD_EVENT_ID, HIGHROLLER_EVENT_ID]);

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
    }
  | { action: "fast-forward-event"; userId: string; eventId: string }
  | { action: "reset-event"; userId: string; eventId: string }
  | { action: "award-event-tokens"; userId: string; eventId: string; count: number }
  | { action: "force-daily-spin"; userId: string }
  | { action: "reset-daily-spin"; userId: string }
  | { action: "reset-combo"; userId: string };

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
      case "fast-forward-event": {
        if (!KNOWN_EVENT_IDS.has(body.eventId)) {
          return NextResponse.json({ error: "Unknown event id." }, { status: 400 });
        }
        await adminCompleteGameboardEvent(admin.id, body.userId, body.eventId);
        return NextResponse.json({ ok: true });
      }
      case "reset-event": {
        if (!KNOWN_EVENT_IDS.has(body.eventId)) {
          return NextResponse.json({ error: "Unknown event id." }, { status: 400 });
        }
        await adminResetGameboardEvent(admin.id, body.userId, body.eventId);
        return NextResponse.json({ ok: true });
      }
      case "award-event-tokens": {
        if (!KNOWN_EVENT_IDS.has(body.eventId)) {
          return NextResponse.json({ error: "Unknown event id." }, { status: 400 });
        }
        await adminAwardEventTokens(admin.id, body.userId, body.eventId, body.count);
        return NextResponse.json({ ok: true });
      }
      case "force-daily-spin": {
        const result = await adminForceDailySpin(admin.id, body.userId);
        return NextResponse.json({ ok: true, prize: result });
      }
      case "reset-daily-spin": {
        await adminResetDailySpin(admin.id, body.userId);
        return NextResponse.json({ ok: true });
      }
      case "reset-combo": {
        await adminResetCombo(admin.id, body.userId);
        return NextResponse.json({ ok: true });
      }
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
