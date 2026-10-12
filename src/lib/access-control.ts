import prisma from "./prisma";
import { getSessionUser } from "./auth";
import { UserSessionPayload } from "./crypto";
import { headers } from "next/headers";

export type ScopeType = "system" | "project" | "department" | "assigned" | "personal";

export interface EffectivePermissionInfo {
  userId: string;
  username: string;
  status: string;
  isSystemAdmin: boolean;
  roles: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  }[];
  permissions: string[]; // List of unique permission codes: ['projects.list.view', ...]
  permissionSources: Record<
    string,
    {
      roleId: string;
      roleCode: string;
      roleName: string;
    }[]
  >;
  scopes: {
    id: string;
    scopeType: ScopeType;
    targetId: string | null;
    targetName: string | null;
    notes: string | null;
  }[];
}

/**
 * Tính toán toàn bộ quyền hiệu lực (Effective Permissions) của tài khoản từ các vai trò và phạm vi dữ liệu
 */
export async function getEffectiveUserPermissions(userId: string): Promise<EffectivePermissionInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      staff: {
        select: {
          id: true,
          fullName: true,
          department: true,
        },
      },
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      userScopes: true,
    },
  });

  if (!user || user.deletedAt) {
    return null;
  }

  // Nếu tài khoản bị khóa hoặc ngừng hoạt động thì không có quyền nào
  if (user.status !== "active") {
    return {
      userId: user.id,
      username: user.username,
      status: user.status,
      isSystemAdmin: false,
      roles: [],
      permissions: [],
      permissionSources: {},
      scopes: [],
    };
  }

  const activeRoles = user.userRoles
    .map((ur) => ur.role)
    .filter((r) => r.status === "active");

  const permissionSet = new Set<string>();
  const permissionSources: Record<string, { roleId: string; roleCode: string; roleName: string }[]> = {};

  let isSystemAdmin = false;

  for (const role of activeRoles) {
    if (role.code === "admin") {
      isSystemAdmin = true;
    }

    for (const rp of role.rolePermissions) {
      const code = rp.permission.code;
      permissionSet.add(code);

      if (!permissionSources[code]) {
        permissionSources[code] = [];
      }
      permissionSources[code].push({
        roleId: role.id,
        roleCode: role.code,
        roleName: role.name,
      });
    }
  }

  // Fallback: nếu chưa gán vai trò trong access_user_roles nhưng user.role cũ là 'admin'
  if (user.role === "admin") {
    isSystemAdmin = true;
  }

  return {
    userId: user.id,
    username: user.username,
    status: user.status,
    isSystemAdmin,
    roles: activeRoles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
    })),
    permissions: Array.from(permissionSet),
    permissionSources,
    scopes: user.userScopes.map((s) => ({
      id: s.id,
      scopeType: s.scopeType as ScopeType,
      targetId: s.targetId,
      targetName: s.targetName,
      notes: s.notes,
    })),
  };
}

/**
 * Kiểm tra xem user có quyền thực hiện hành động trên dữ liệu cụ thể hay không
 */
export async function checkUserPermission(
  userId: string,
  permissionCode: string,
  context?: {
    projectId?: string;
    department?: string;
    ownerId?: string;
  }
): Promise<{ allowed: boolean; reason?: string }> {
  const effective = await getEffectiveUserPermissions(userId);
  if (!effective) {
    return { allowed: false, reason: "Tài khoản không tồn tại hoặc đã bị xóa." };
  }

  if (effective.status !== "active") {
    return { allowed: false, reason: "Tài khoản đang bị khóa hoặc ngừng hoạt động." };
  }

  // Quản trị viên hệ thống có toàn quyền
  if (effective.isSystemAdmin) {
    return { allowed: true };
  }

  // Kiểm tra mã quyền
  if (!effective.permissions.includes(permissionCode)) {
    return {
      allowed: false,
      reason: `Bạn không có quyền '${permissionCode}' để thực hiện hành động này.`,
    };
  }

  // Nếu không có yêu cầu kiểm tra phạm vi dữ liệu cụ thể
  if (!context || Object.keys(context).length === 0) {
    return { allowed: true };
  }

  // Kiểm tra phạm vi dữ liệu (Data Scope)
  const scopes = effective.scopes;

  // 1. Nếu có phạm vi toàn hệ thống
  if (scopes.some((s) => s.scopeType === "system")) {
    return { allowed: true };
  }

  // 2. Kiểm tra theo Dự án
  if (context.projectId) {
    // Scope gán trực tiếp theo project ID
    const hasProjectScope = scopes.some(
      (s) => s.scopeType === "project" && (s.targetId === context.projectId || !s.targetId)
    );
    if (hasProjectScope) return { allowed: true };

    // Kiểm tra thêm bảng phân công dự án (ProjectAssignment)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    if (user?.staffId) {
      const assignment = await prisma.projectAssignment.findFirst({
        where: {
          staffId: user.staffId,
          projectId: context.projectId,
        },
      });
      if (assignment) return { allowed: true };
    }
  }

  // 3. Kiểm tra theo Phòng ban
  if (context.department) {
    const hasDeptScope = scopes.some(
      (s) => s.scopeType === "department" && (s.targetId === context.department || !s.targetId)
    );
    if (hasDeptScope) return { allowed: true };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (user?.staff?.department === context.department) {
      return { allowed: true };
    }
  }

  // 4. Kiểm tra quyền sở hữu cá nhân / được phân công
  if (context.ownerId) {
    if (context.ownerId === userId) {
      return { allowed: true };
    }
  }

  // Mặc định từ chối nếu không thỏa mãn bất kỳ phạm vi nào
  return {
    allowed: false,
    reason: "Thao tác bị từ chối: Dữ liệu này nằm ngoài phạm vi truy cập được cấp của bạn.",
  };
}

/**
 * Yêu cầu quyền bắt buộc trong API route
 */
export async function requirePermission(
  permissionCode: string,
  context?: {
    projectId?: string;
    department?: string;
    ownerId?: string;
  }
): Promise<UserSessionPayload> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new Error("UNAUTHORIZED");
  }

  const check = await checkUserPermission(sessionUser.userId, permissionCode, context);
  if (!check.allowed) {
    throw new Error(`FORBIDDEN:${check.reason || "Không đủ quyền truy cập"}`);
  }

  return sessionUser;
}

/**
 * Làm sạch dữ liệu trước khi lưu vào Audit Log (chống lộ mật khẩu, token, PIN)
 */
function sanitizeAuditData(data: any): string | null {
  if (!data) return null;
  try {
    const cloned = JSON.parse(JSON.stringify(data));
    const SENSITIVE_KEYS = [
      "password",
      "passwordHash",
      "newPassword",
      "pin",
      "pinHash",
      "token",
      "secret",
      "jwt",
      "defaultPassword",
    ];

    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
          obj[key] = "[PROTECTED_REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(cloned);
    return JSON.stringify(cloned);
  } catch {
    return null;
  }
}

/**
 * Ghi nhật ký phân quyền (Access Audit Log)
 */
export async function recordAccessAudit(params: {
  actor?: UserSessionPayload | null;
  action: string;
  targetType: "user" | "role" | "permission" | "scope";
  targetId?: string | null;
  targetName?: string | null;
  summary: string;
  beforeData?: any;
  afterData?: any;
}) {
  try {
    let clientIp = "127.0.0.1";
    let clientUa = "unknown";

    try {
      const headerStore = await headers();
      clientIp = headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || "127.0.0.1";
      clientUa = headerStore.get("user-agent") || "unknown";
    } catch {
      // Ignored if outside request context
    }

    await prisma.accessAuditLog.create({
      data: {
        actorId: params.actor?.userId || null,
        actorUsername: params.actor?.username || "system",
        actorName: params.actor?.fullName || params.actor?.username || "Hệ thống",
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        summary: params.summary,
        beforeDataJson: sanitizeAuditData(params.beforeData),
        afterDataJson: sanitizeAuditData(params.afterData),
        ipAddress: clientIp,
        userAgent: clientUa,
      },
    });
  } catch (error) {
    console.error("Lỗi khi ghi Access Audit Log:", error);
  }
}
