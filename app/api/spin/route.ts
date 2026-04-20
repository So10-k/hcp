import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import {
  enforceRateLimit,
  executeDailySpin,
  getDailySpinStatus
} from "../../lib/sidequest-db";

export const runtime = "nodejs";

type PostBody = { action?: "spin" };

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to spin." }, { status: 401 });
    }
    const status = await getDailySpinStatus(user.id);
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load spin." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to spin." }, { status: 401 });
    }
    await enforceRateLimit(user.id, "spin", 20);
    const body = (await request.json().catch(() => ({}))) as PostBody;
    if (body.action !== "spin") {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    const result = await executeDailySpin(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Spin failed." },
      { status: 400 }
    );
  }
}
