import { NextResponse } from "next/server";
import { getCurrentUser } from "../../lib/auth";
import { enforceRateLimit, loadSideQuestBoard, saveSideQuestBoard } from "../../lib/sidequest-db";
import { mergeWithStarterState, type SideQuestState } from "../../seed-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to sync your board." }, { status: 401 });
    }

    const board = await loadSideQuestBoard(user.id);
    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      {
        error: "SideQuest could not load the Neon board.",
        detail: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to save your board." }, { status: 401 });
    }

    await enforceRateLimit(user.id, "sidequest-save", 60);

    const body = (await request.json()) as { state?: Partial<SideQuestState>; eventType?: string };
    const state = mergeWithStarterState(body.state ?? {});
    // Untrusted save: rewards get scrubbed against prior state + the
    // completion ledger, and any newly-completed quests are recorded
    // and credited with one event token apiece. See saveSideQuestBoard.
    const board = await saveSideQuestBoard(user.id, state, body.eventType ?? "save");

    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      {
        error: "SideQuest could not save the Neon board.",
        detail: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 500 }
    );
  }
}
