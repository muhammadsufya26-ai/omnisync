import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "omnisync_session";
const AUTH_USER_COOKIE_NAME = "omnisync_user";

const ADMIN_ROUTE_PREFIXES = [
  "/dashboard",
  "/orders",
  "/inventory",
  "/reconciliation",
  "/customers",
  "/integrations",
  "/settings",
];

function isAdminProtectedRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isCustomerPortalRoute(pathname: string): boolean {
  return pathname === "/customer" || pathname.startsWith("/customer/");
}

function extractSessionRole(
  sessionToken?: string,
  userCookieRaw?: string
): { authenticated: boolean; role: "OWNER" | "STAFF" | "CUSTOMER" | null } {
  if (!sessionToken || sessionToken.length < 10) {
    return { authenticated: false, role: null };
  }

  // 1. Check omnisync_user JSON cookie
  if (userCookieRaw) {
    try {
      const decodedJson = decodeURIComponent(userCookieRaw);
      const parsed = JSON.parse(decodedJson) as { role?: string };
      if (
        parsed.role === "OWNER" ||
        parsed.role === "STAFF" ||
        parsed.role === "CUSTOMER"
      ) {
        return { authenticated: true, role: parsed.role };
      }
    } catch {
      try {
        const parsed = JSON.parse(userCookieRaw) as { role?: string };
        if (
          parsed.role === "OWNER" ||
          parsed.role === "STAFF" ||
          parsed.role === "CUSTOMER"
        ) {
          return { authenticated: true, role: parsed.role };
        }
      } catch {
        // Fallback to decoding base64url token below
      }
    }
  }

  // 2. Decode base64url token format: id|email|role|phone|issuedAt|signature
  try {
    const base64 = sessionToken.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const decoded = atob(padded);
    const parts = decoded.split("|");
    // Format is either id|email|role|... or email|role|...
    for (const part of parts) {
      if (part === "OWNER" || part === "STAFF" || part === "CUSTOMER") {
        return { authenticated: true, role: part };
      }
    }
  } catch {
    // Ignore decode errors
  }

  return { authenticated: true, role: "OWNER" };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass API routes, Next.js internals, static assets, and public tracking (/track/[orderId])
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/track") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const userCookieRaw = request.cookies.get(AUTH_USER_COOKIE_NAME)?.value;
  const { authenticated, role } = extractSessionRole(
    sessionToken,
    userCookieRaw
  );

  // 1. Handle /login route: allow /login to render so users can switch between Owner and Customer portals
  if (pathname === "/login") {
    if (
      authenticated &&
      request.nextUrl.searchParams.get("autoRedirect") === "1"
    ) {
      const target = role === "CUSTOMER" ? "/customer/orders" : "/orders";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 2. Protect /customer/* routes: require authentication
  if (isCustomerPortalRoute(pathname)) {
    if (!authenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("tab", "customer");
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Protect Admin / Owner routes (/, /dashboard, /orders, /inventory, /reconciliation, etc.)
  if (isAdminProtectedRoute(pathname)) {
    if (!authenticated) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/" && pathname !== "/orders") {
        loginUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // If a CUSTOMER tries to access admin routes, redirect them to /customer/orders with an alert trigger
    if (role === "CUSTOMER") {
      const customerRedirectUrl = new URL("/customer/orders", request.url);
      customerRedirectUrl.searchParams.set("restricted", "1");
      customerRedirectUrl.searchParams.set("attempted", pathname);
      return NextResponse.redirect(customerRedirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
