import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "__session";
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export type UserRole = "admin" | "user";

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
}

/**
 * Bezpečná normalizace role z claimu.
 * - `admin` → admin
 * - `user` a přechodně starší `member`/`sales` → user
 * - cokoli jiného (chybějící/neznámá role) → null = ŽÁDNÝ přístup
 *   (zabraňuje tomu, aby účet bez přiřazené role získal přístup).
 */
function normalizeRole(raw: unknown): UserRole | null {
  if (raw === "admin") return "admin";
  if (raw === "user" || raw === "member" || raw === "sales") return "user";
  return null;
}

export async function createSessionCookie(idToken: string): Promise<string> {
  const auth = getAdminAuth();
  return auth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const role = normalizeRole(decoded.role);
    if (!role) return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      role,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: required role ${roles.join(" or ")}`);
  }
  return user;
}

export { SESSION_COOKIE_NAME };
