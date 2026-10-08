import { cookies, headers } from "next/headers";
import { verifySessionToken, UserSessionPayload } from "./crypto";
import prisma from "./prisma";

export const SESSION_COOKIE_NAME = "pms_session";

/**
 * Extract authenticated user session from request cookies or Authorization header
 */
export async function getSessionUser(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const payload = verifySessionToken(token);
      if (payload) return payload;
    }

    // Fallback to Authorization Bearer header
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.substring(7);
      return verifySessionToken(bearerToken);
    }

    return null;
  } catch (error) {
    console.error("Error reading session:", error);
    return null;
  }
}

/**
 * Require valid session or throw 401 response
 */
export async function requireAuth(): Promise<UserSessionPayload> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Require specific role or throw 403 response
 */
export async function requireRole(allowedRoles: string[]): Promise<UserSessionPayload> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Helper to record immutable Audit Log
 */
export async function recordAuditLog(params: {
  userId?: string | null;
  actionCode: string;
  targetEntity: string;
  targetEntityId?: string | null;
  contextJson?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    let clientIp = params.ipAddress;
    let clientUa = params.userAgent;

    if (!clientIp || !clientUa) {
      try {
        const headerStore = await headers();
        clientIp = clientIp || headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || "127.0.0.1";
        clientUa = clientUa || headerStore.get("user-agent") || "unknown";
      } catch {
        clientIp = clientIp || "127.0.0.1";
        clientUa = clientUa || "unknown";
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        actionCode: params.actionCode,
        targetEntity: params.targetEntity,
        targetEntityId: params.targetEntityId || null,
        contextJson: params.contextJson ? JSON.stringify(params.contextJson) : null,
        ipAddress: clientIp,
        userAgent: clientUa,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
