import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { enforceRateLimit, recordCombo } from "../../lib/sidequest-db";

export const runtime = "nodejs";

type PostBody = { combo?: number };

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    await enforceRateLimit(user.id, "combo", 30);
    const body = (await request.json().catch(() => ({}))) as PostBody;
    const combo = Math.max(1, Math.min(100, Math.floor(body.combo ?? 0)));
    if (combo < 2) {
      return NextResponse.json({ error: "Combo must be ≥ 2." }, { status: 400 });
    }
    // recordCombo clamps `combo` to the count of completions in the
    // last 90s from sidequest_quest_completions, so a client claiming
    // a fake combo can never unlock a badge they didn't earn.
    const report = await recordCombo(user.id, combo);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Combo record failed." },
      { status: 400 }
    );
  }
}
