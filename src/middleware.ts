import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// กันคนที่ยังไม่ล็อกอิน หรือบทบาทไม่ตรง ไม่ให้เข้าหน้า /admin และ /tenant
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  if (pathname.startsWith("/admin") && session.role !== "ADMIN")
    return NextResponse.redirect(new URL("/tenant", req.url));
  if (pathname.startsWith("/tenant") && session.role !== "TENANT")
    return NextResponse.redirect(new URL("/admin", req.url));

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/tenant/:path*"] };
