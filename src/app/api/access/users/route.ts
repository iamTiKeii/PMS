import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getEffectiveUserPermissions } from "@/lib/access-control";

export const dynamic = "force-dynamic";

// GET /api/access/users - Danh sách người dùng, vai trò gán, phạm vi dữ liệu và quyền hiệu lực
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const roleId = searchParams.get("roleId") || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { username: { contains: q } },
        { staff: { fullName: { contains: q } } },
        { staff: { corporateEmail: { contains: q } } },
        { staff: { staffCode: { contains: q } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (roleId && roleId !== "all") {
      where.userRoles = {
        some: {
          roleId: roleId,
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            staffCode: true,
            corporateEmail: true,
            department: true,
          },
        },
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isSystem: true,
                defaultScopeType: true,
                _count: {
                  select: { rolePermissions: true },
                },
              },
            },
          },
        },
        userScopes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Format output
    const formatted = users.map((u) => {
      const assignedRoles = u.userRoles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        isSystem: ur.role.isSystem,
        permissionCount: ur.role._count.rolePermissions,
        assignedAt: ur.createdAt,
      }));

      const scopes = u.userScopes.map((s) => ({
        id: s.id,
        scopeType: s.scopeType,
        targetId: s.targetId,
        targetName: s.targetName,
        notes: s.notes,
      }));

      // Xác định phạm vi chính
      let primaryScope = "assigned";
      if (scopes.some((s) => s.scopeType === "system") || u.role === "admin") {
        primaryScope = "system";
      } else if (scopes.some((s) => s.scopeType === "project") || u.role === "pm") {
        primaryScope = "project";
      } else if (scopes.some((s) => s.scopeType === "department")) {
        primaryScope = "department";
      } else if (scopes.length > 0) {
        primaryScope = scopes[0].scopeType;
      }

      return {
        id: u.id,
        username: u.username,
        status: u.status,
        failedAttempts: u.failedAttempts,
        lockedUntil: u.lockedUntil,
        lastLoginAt: u.lastLoginAt,
        legacyRole: u.role,
        staff: u.staff,
        roles: assignedRoles,
        roleCount: assignedRoles.length,
        scopes,
        primaryScope,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải danh sách người dùng và phân quyền" } },
      { status: 500 }
    );
  }
}
