import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";
import { createPartyForUser } from "../../../lib/sidequest-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to create a party." }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const board = await createPartyForUser(user.id, body.title ?? "");
    return NextResponse.json({ board });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create party.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
