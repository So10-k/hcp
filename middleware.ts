import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

// Prefixes that always bypass the maintenance gate.
const ALWAYS_ALLOW = ["/maintenance", "/login", "/_next", "/api/logout", "/favicon"];
const ADMIN_PREFIXES = ["/admin", "/api/admin"];
const STATIC_RE = /\.(svg|png|jpg|jpeg|gif|ico|mp4|wav|webp|css|js|woff2?)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and admin routes are never blocked.
  if (
    STATIC_RE.test(pathname) ||
    ADMIN_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ALWAYS_ALLOW.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  if (!process.env.DATABASE_URL) return NextResponse.next();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = (await sql`
      SELECT value FROM sidequest_site_config WHERE key = 'maintenance_enabled'
    `) as Array<{ value: string }>;

    if (rows[0]?.value !== "true") return NextResponse.next();

    // Maintenance is on — let admins through, redirect everyone else.
    const token = request.cookies.get("sidequest_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }

    const hash = await sha256Base64url(token);
    const userRows = (await sql`
      SELECT u.role, u.role_expires_at
      FROM sidequest_sessions s
      JOIN sidequest_users u ON u.id = s.user_id
      WHERE s.token_hash = ${hash}
        AND s.expires_at > now()
      LIMIT 1
    `) as Array<{ role: string; role_expires_at: string | null }>;

    const u = userRows[0];
    const isAdmin =
      u?.role === "admin" &&
      (u.role_expires_at == null || new Date(u.role_expires_at) > new Date());

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  } catch {
    // DB unavailable — fail open so maintenance can't lock everyone out.
    return NextResponse.next();
  }

  return NextResponse.next();
}

async function sha256Base64url(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
