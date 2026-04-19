import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { listUsersForAdmin } from "../../../lib/sidequest-db";

export const runtime = "nodejs";

export async function GET() {
  await requireAdmin();
  const users = await listUsersForAdmin();
  return NextResponse.json({ users });
}
