import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { getSideQuestAnalytics } from "../../../lib/sidequest-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to view admin analytics." }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    const analytics = await getSideQuestAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      {
        error: "SideQuest analytics could not load.",
        detail: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 500 }
    );
  }
}
