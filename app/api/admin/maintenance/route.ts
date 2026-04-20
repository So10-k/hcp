import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { getMaintenanceConfig, setSiteConfig } from "../../../lib/sidequest-db";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  void admin;
  const config = await getMaintenanceConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  let body: { enabled?: boolean; message?: string };
  try {
    body = (await request.json()) as { enabled?: boolean; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    if (typeof body.enabled === "boolean") {
      await setSiteConfig(admin.id, "maintenance_enabled", body.enabled ? "true" : "false");
    }
    if (typeof body.message === "string") {
      await setSiteConfig(admin.id, "maintenance_message", body.message.trim());
    }
    const config = await getMaintenanceConfig();
    return NextResponse.json({ ok: true, ...config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed." },
      { status: 400 }
    );
  }
}
