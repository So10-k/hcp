import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { HIGHROLLER_EVENT_ID } from "../../lib/highroller-config";
import {
  enforceRateLimit,
  executeHighRollerFlip,
  getGameboardRun
} from "../../lib/sidequest-db";

export const runtime = "nodejs";

type PostBody = {
  action?: "grant" | "flip";
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to climb the tower." }, { status: 401 });
    }
    const run = await getGameboardRun(user.id, HIGHROLLER_EVENT_ID);
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not load the High Roller run.",
        detail: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to climb the tower." }, { status: 401 });
    }
    await enforceRateLimit(user.id, "highroller", 60);
    const body = (await request.json().catch(() => ({}))) as PostBody;

    if (body.action === "grant") {
      // Anti-exploit: same as /api/gameboard — flip-token grants are
      // server-driven from the completion ledger now. Keep this as an
      // idempotent no-op for client back-compat.
      const run = await getGameboardRun(user.id, HIGHROLLER_EVENT_ID);
      return NextResponse.json({ run });
    }

    if (body.action === "flip") {
      const result = await executeHighRollerFlip(user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
