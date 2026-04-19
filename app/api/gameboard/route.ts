import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import {
  executeGameboardRoll,
  getGameboardRun,
  grantGameboardRoll
} from "../../lib/sidequest-db";

export const runtime = "nodejs";

type PostBody = {
  action?: "grant" | "roll";
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to join the event." }, { status: 401 });
    }
    const run = await getGameboardRun(user.id);
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not load the event run.",
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
      return NextResponse.json({ error: "Sign in to join the event." }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as PostBody;

    if (body.action === "grant") {
      const run = await grantGameboardRoll(user.id);
      return NextResponse.json({ run });
    }

    if (body.action === "roll") {
      const result = await executeGameboardRoll(user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
