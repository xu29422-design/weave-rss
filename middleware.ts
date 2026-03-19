import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;

export function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const path = request.nextUrl.pathname;

  if (MOBILE_UA.test(ua) && (path === "/" || path === "/home")) {
    return NextResponse.redirect(new URL("/m", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home"],
};
