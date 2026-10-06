import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "__session";
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

// Auth je sdílený s klientskou zónou (spx-hub, role 'client'). Do SPX Core
// smí jen tým — účet s jinou nebo žádnou rolí se bere jako nepřihlášený.
export const TEAM_ROLES = ["admin", "member", "sales"] as const;

export type UserRole = (typeof TEAM_ROLES)[number];

export function isTeamRole(role: unknown): role is UserRole {
  return TEAM_ROLES.includes(role as UserRole);
}

export interface SessionUser {
  uid: string;
  email: string;
  role: UserRole;
}

export class ForbiddenRoleError extends Error {}

export async function createSessionCookie(idToken: string): Promise<string> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (!isTeamRole(decoded.role)) {
    throw new ForbiddenRoleError("Account has no team role");
  }
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
    if (!isTeamRole(decoded.role)) return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      role: decoded.role,
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
