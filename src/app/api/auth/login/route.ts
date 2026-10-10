import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { computeHmacSha256 } from "@/lib/sseBroker";
import type { UserRole } from "@/lib/mockData";

export const dynamic = "force-dynamic";

const AUTH_COOKIE_NAME = "omnisync_session";
const AUTH_USER_COOKIE_NAME = "omnisync_user";
const SESSION_SECRET =
  process.env.OMNISYNC_SESSION_SECRET || "omnisync_enterprise_auth_secret_2026";

export type PortalSessionRole = "OWNER" | "STAFF" | "CUSTOMER";

export interface SessionUserPayload {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: PortalSessionRole;
  uiRole: UserRole;
  title: string;
  orderLookupId?: string;
}

function mockHashPassword(rawPassword: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`omnisync_salt_${rawPassword}`)
    .digest("hex");
  return `sha256$${digest}`;
}

const OwnerLoginSchema = z.object({
  portal: z.literal("owner").optional().default("owner"),
  email: z.string().email("Please enter a valid work email address."),
  password: z.string().min(4, "Password must be at least 4 characters."),
  rememberMe: z.boolean().optional().default(true),
  redirectTo: z.string().optional(),
});

const CustomerLoginSchema = z.object({
  portal: z.literal("customer"),
  identifier: z
    .string()
    .min(3, "Please enter your Phone Number or Order ID (e.g. ORD-2026-1003)."),
  email: z.string().email("Please enter your customer email address."),
  rememberMe: z.boolean().optional().default(true),
});

interface FallbackAccount {
  id: string;
  email: string;
  phone: string;
  password: string;
  name: string;
  role: PortalSessionRole;
  uiRole: UserRole;
  title: string;
}

const FALLBACK_ACCOUNTS: FallbackAccount[] = [
  {
    id: "usr-owner-1",
    email: "owner@omnisync.com",
    phone: "+92-300-4119823",
    password: "admin123",
    name: "Zainab Tariq (Store Owner)",
    role: "OWNER",
    uiRole: "OWNER",
    title: "Store Owner & Operations Director",
  },
  {
    id: "usr-admin-1",
    email: "admin@omnisync.com",
    phone: "+92-300-4119823",
    password: "admin123",
    name: "Zainab Tariq (Store Owner)",
    role: "OWNER",
    uiRole: "OWNER",
    title: "Store Owner & Operations Director",
  },
  {
    id: "usr-cust-ayesha",
    email: "ayesha.malik@example.com",
    phone: "+92-333-5120987",
    password: "customer123",
    name: "Ayesha Malik",
    role: "CUSTOMER",
    uiRole: "VIEWER",
    title: "Verified Storefront Customer",
  },
  {
    id: "usr-cust-sana",
    email: "sana.farooq@example.com",
    phone: "+92-301-7745210",
    password: "customer123",
    name: "Sana Farooq",
    role: "CUSTOMER",
    uiRole: "VIEWER",
    title: "Verified Storefront Customer",
  },
];

function createSessionCookies(
  response: NextResponse,
  userSession: SessionUserPayload,
  rememberMe: boolean
) {
  const issuedAt = Date.now();
  // Format: id|email|role|phone|issuedAt|signature
  const payload = `${userSession.id}|${userSession.email}|${userSession.role}|${userSession.phone || ""}|${issuedAt}`;
  const signature = computeHmacSha256(payload, SESSION_SECRET);
  const token = Buffer.from(`${payload}|${signature}`).toString("base64url");

  const maxAgeSeconds = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  response.cookies.set(AUTH_USER_COOKIE_NAME, JSON.stringify(userSession), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Branch 1: Customer Track & Order Portal Login
    if (rawBody.portal === "customer") {
      const parsed = CustomerLoginSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parsed.error.issues[0]?.message ||
              "Please enter a valid Phone Number / Order ID and Email.",
          },
          { status: 400 }
        );
      }

      const { identifier, email, rememberMe } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedId = identifier.trim();

      let resolvedUser: SessionUserPayload | null = null;

      try {
        // 1. Check Prisma User table by email or phone
        const dbUser = await db.user.findFirst({
          where: {
            OR: [{ email: normalizedEmail }, { phone: trimmedId }],
          },
        });

        if (dbUser) {
          resolvedUser = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email || normalizedEmail,
            phone: dbUser.phone || trimmedId,
            role: "CUSTOMER",
            uiRole: "VIEWER",
            title: "Verified Customer",
            orderLookupId: trimmedId.toUpperCase().startsWith("ORD-")
              ? trimmedId.toUpperCase()
              : undefined,
          };
        } else {
          // 2. Or check Prisma Order table by orderNumber or customerPhone
          const dbOrder = await db.order.findFirst({
            where: {
              OR: [
                { orderNumber: trimmedId.toUpperCase() },
                { customerPhone: { contains: trimmedId } },
              ],
            },
            include: { customer: true },
          });

          if (dbOrder) {
            resolvedUser = {
              id: dbOrder.customerId || `cust-${dbOrder.id}`,
              name: dbOrder.customer?.name || dbOrder.customerName,
              email: dbOrder.customer?.email || normalizedEmail,
              phone: dbOrder.customerPhone,
              role: "CUSTOMER",
              uiRole: "VIEWER",
              title: "Verified Customer",
              orderLookupId: dbOrder.orderNumber,
            };
          }
        }
      } catch {
        // Ignore DB read issues and use fallback below
      }

      if (!resolvedUser) {
        const fallbackCust = FALLBACK_ACCOUNTS.find(
          (a) =>
            a.role === "CUSTOMER" &&
            (a.email.toLowerCase() === normalizedEmail ||
              a.phone.includes(trimmedId))
        );

        resolvedUser = fallbackCust
          ? {
              id: fallbackCust.id,
              name: fallbackCust.name,
              email: fallbackCust.email,
              phone: fallbackCust.phone,
              role: "CUSTOMER",
              uiRole: "VIEWER",
              title: fallbackCust.title,
              orderLookupId: trimmedId.toUpperCase().startsWith("ORD-")
                ? trimmedId.toUpperCase()
                : undefined,
            }
          : {
              id: "usr-cust-ayesha",
              name:
                normalizedEmail === "sana.farooq@example.com"
                  ? "Sana Farooq"
                  : "Ayesha Malik",
              email: normalizedEmail,
              phone: trimmedId.startsWith("+")
                ? trimmedId
                : "+92-333-5120987",
              role: "CUSTOMER",
              uiRole: "VIEWER",
              title: "Verified Storefront Customer",
              orderLookupId: trimmedId.toUpperCase().startsWith("ORD-")
                ? trimmedId.toUpperCase()
                : undefined,
            };
      }

      const response = NextResponse.json(
        {
          success: true,
          user: resolvedUser,
          redirectTo: "/customer/orders",
        },
        { status: 200 }
      );

      createSessionCookies(response, resolvedUser, rememberMe);
      return response;
    }

    // Branch 2: Business Owner / Staff Login
    const parsed = OwnerLoginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || "Invalid login credentials.",
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe, redirectTo } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const hashedInput = mockHashPassword(password);

    let ownerSession: SessionUserPayload | null = null;

    // 1. Check Prisma User table first
    try {
      const dbUser = await db.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (
        dbUser &&
        (dbUser.password === hashedInput || dbUser.password === password)
      ) {
        const mappedPortalRole: PortalSessionRole =
          dbUser.role === "CUSTOMER" ? "CUSTOMER" : "OWNER";
        ownerSession = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email || normalizedEmail,
          phone: dbUser.phone || "+92-300-4119823",
          role: mappedPortalRole,
          uiRole: mappedPortalRole === "CUSTOMER" ? "VIEWER" : "OWNER",
          title:
            mappedPortalRole === "OWNER"
              ? "Store Owner & Operations Director"
              : "Customer Account",
        };
      }
    } catch {
      // Fallback to in-memory accounts if SQLite is still migrating
    }

    // 2. Fallback to seeded Owner/Admin accounts
    if (!ownerSession) {
      const matchedFallback = FALLBACK_ACCOUNTS.find(
        (acc) =>
          acc.email.toLowerCase() === normalizedEmail &&
          acc.password === password
      );

      const isDomainDemoMatch =
        !matchedFallback &&
        (normalizedEmail.endsWith("@omnisync.com") ||
          normalizedEmail.endsWith("@omnisync.io")) &&
        password === "admin123";

      if (!matchedFallback && !isDomainDemoMatch) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid owner credentials. Use owner@omnisync.com / admin123",
          },
          { status: 401 }
        );
      }

      ownerSession = matchedFallback
        ? {
            id: matchedFallback.id,
            name: matchedFallback.name,
            email: matchedFallback.email,
            phone: matchedFallback.phone,
            role: matchedFallback.role,
            uiRole: matchedFallback.uiRole,
            title: matchedFallback.title,
          }
        : {
            id: "usr-owner-1",
            name: "Zainab Tariq (Store Owner)",
            email: normalizedEmail,
            phone: "+92-300-4119823",
            role: "OWNER",
            uiRole: "OWNER",
            title: "Store Owner & Operations Director",
          };
    }

    const defaultTarget =
      ownerSession.role === "CUSTOMER" ? "/customer/orders" : "/orders";
    const targetRedirect =
      redirectTo &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("/login") &&
      ownerSession.role === "OWNER"
        ? redirectTo
        : defaultTarget;

    const response = NextResponse.json(
      {
        success: true,
        user: ownerSession,
        redirectTo: targetRedirect,
      },
      { status: 200 }
    );

    createSessionCookies(response, ownerSession, rememberMe);
    return response;
  } catch (error) {
    console.error("[POST /api/auth/login] Authentication error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected authentication error occurred.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    {
      success: true,
      message: "Signed out of OmniSync session.",
      redirectTo: "/login",
    },
    { status: 200 }
  );

  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(AUTH_USER_COOKIE_NAME);

  return response;
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const userCookie = request.cookies.get(AUTH_USER_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }

  let parsedUser: SessionUserPayload | null = null;
  if (userCookie) {
    try {
      parsedUser = JSON.parse(userCookie) as SessionUserPayload;
    } catch {
      parsedUser = null;
    }
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: parsedUser ?? {
        id: "usr-owner-1",
        email: "owner@omnisync.com",
        name: "Zainab Tariq (Store Owner)",
        role: "OWNER",
        uiRole: "OWNER",
        title: "Store Owner",
      },
    },
    { status: 200 }
  );
}
