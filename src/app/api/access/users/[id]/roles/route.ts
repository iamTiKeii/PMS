import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getEffectiveUserPermissions, recordAccessAudit } from "@/lib/access-control";

export const dynamic = "force-dynamic";

// GET /api/access/users/[id]/roles - Chi tiết vai trò, nguồn cấp quyền và quyền hiệu lực của người dùng
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        staff: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        userScopes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy người dùng." } },
        { status: 404 }
      );
    }

    const effective = await getEffectiveUserPermissions(id);

    // Lấy thông tin chi tiết về từng quyền hiệu lực
    const permissionDetails = await prisma.permission.findMany({
      where: {
        code: { in: effective?.permissions || [] },
      },
      orderBy: [{ module: "asc" }, { resource: "asc" }],
    });

    const enrichedPermissions = permissionDetails.map((p) => ({
      ...p,
      sources: effective?.permissionSources[p.code] || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          status: user.status,
          staff: user.staff,
        },
        assignedRoles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          description: ur.role.description,
          isSystem: ur.role.isSystem,
          assignedAt: ur.createdAt,
        })),
        assignedRoleIds: user.userRoles.map((ur) => ur.roleId),
        effectivePermissions: enrichedPermissions,
        effectivePermissionCount: enrichedPermissions.length,
        sensitivePermissionCount: enrichedPermissions.filter((p) => p.isSensitive).length,
        scopes: user.userScopes,
        isSystemAdmin: effective?.isSystemAdmin || false,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải thông tin phân quyền người dùng" } },
      { status: 500 }
    );
  }
}

// PUT /api/access/users/[id]/roles - Gán / cập nhật danh sách vai trò cho người dùng
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true },
        },
        staff: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy người dùng." } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { roleIds } = body;

    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { success: false, error: { message: "Danh sách roleIds phải là một mảng." } },
        { status: 400 }
      );
    }

    const oldRoleNames = user.userRoles.map((ur) => ur.role.name);
    const oldRoleIds = user.userRoles.map((ur) => ur.roleId);

    // Xác thực danh sách vai trò mới
    const targetRoles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
    });

    const newRoleNames = targetRoles.map((r) => r.name);
    const hasAdminRole = targetRoles.some((r) => r.code === "admin");
    const hasPmRole = targetRoles.some((r) => r.code === "pm");

    // Xóa các vai trò cũ không còn trong danh sách
    await prisma.userRole.deleteMany({
      where: {
        userId: id,
        roleId: { notIn: roleIds },
      },
    });

    // Thêm các vai trò mới
    for (const r of targetRoles) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: id,
            roleId: r.id,
          },
        },
        update: {},
        create: {
          userId: id,
          roleId: r.id,
          assignedBy: actor.username,
        },
      });
    }

    // Đồng bộ legacy role column để đảm bảo tương thích ngược
    let primaryLegacyRole = "user";
    if (hasAdminRole) {
      primaryLegacyRole = "admin";
    } else if (hasPmRole) {
      primaryLegacyRole = "pm";
    }

    await prisma.user.update({
      where: { id },
      data: { role: primaryLegacyRole },
    });

    // Ghi nhật ký phân quyền
    await recordAccessAudit({
      actor,
      action: "assign_roles",
      targetType: "user",
      targetId: id,
      targetName: user.staff?.fullName || user.username,
      summary: `Cập nhật vai trò cho người dùng "${user.username}": [${newRoleNames.join(", ")}] (trước đó: [${oldRoleNames.join(", ")}])`,
      beforeData: {
        userId: id,
        username: user.username,
        roles: oldRoleNames,
        roleIds: oldRoleIds,
      },
      afterData: {
        userId: id,
        username: user.username,
        roles: newRoleNames,
        roleIds: targetRoles.map((r) => r.id),
        hasAdminRole,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật vai trò cho tài khoản "${user.username}" thành công.`,
      data: {
        roles: targetRoles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || "Lỗi cập nhật vai trò người dùng" } },
      { status: 500 }
    );
  }
}
