import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { recordAccessAudit } from "@/lib/access-control";

export const dynamic = "force-dynamic";

// GET /api/access/roles/[id] - Chi tiết vai trò với 4 nhóm thông tin
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
                createdAt: true,
                staff: {
                  select: {
                    fullName: true,
                    department: true,
                    corporateEmail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy vai trò." } },
        { status: 404 }
      );
    }

    const assignedUsers = role.userRoles.map((ur) => ({
      id: ur.user.id,
      username: ur.user.username,
      fullName: ur.user.staff?.fullName || ur.user.username,
      department: ur.user.staff?.department || "Chưa phân bổ",
      email: ur.user.staff?.corporateEmail || "—",
      status: ur.user.status,
      assignedAt: ur.createdAt,
    }));

    const permissions = role.rolePermissions.map((rp) => rp.permission);

    return NextResponse.json({
      success: true,
      data: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        status: role.status,
        defaultScopeType: role.defaultScopeType,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        permissions,
        permissionCodes: permissions.map((p) => p.code),
        assignedUsers,
        assignedUserCount: assignedUsers.length,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải thông tin chi tiết vai trò" } },
      { status: 500 }
    );
  }
}

// PUT /api/access/roles/[id] - Cập nhật thông tin và quyền hạn vai trò
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        userRoles: true,
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy vai trò." } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, status, defaultScopeType, permissionCodes } = body;

    const oldPermissionCodes = existingRole.rolePermissions.map((rp) => rp.permission.code);
    const newPermissionCodes: string[] = Array.isArray(permissionCodes) ? permissionCodes : oldPermissionCodes;

    // Không cho phép đổi mã code nếu là system role
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status) updateData.status = status;
    if (defaultScopeType) updateData.defaultScopeType = defaultScopeType;

    // Cập nhật thông tin role
    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // Nếu có gửi danh sách quyền mới, tính toán diff và cập nhật
    if (Array.isArray(permissionCodes)) {
      const addedPerms = newPermissionCodes.filter((c) => !oldPermissionCodes.includes(c));
      const removedPerms = oldPermissionCodes.filter((c) => !newPermissionCodes.includes(c));

      // Xóa các quyền bị bỏ
      if (removedPerms.length > 0) {
        const permsToRemove = await prisma.permission.findMany({
          where: { code: { in: removedPerms } },
          select: { id: true },
        });
        await prisma.rolePermission.deleteMany({
          where: {
            roleId: id,
            permissionId: { in: permsToRemove.map((p) => p.id) },
          },
        });
      }

      // Thêm các quyền mới
      if (addedPerms.length > 0) {
        const permsToAdd = await prisma.permission.findMany({
          where: { code: { in: addedPerms } },
          select: { id: true },
        });
        for (const p of permsToAdd) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: id,
              permissionId: p.id,
            },
          });
        }
      }

      // Ghi audit log
      const affectedUserCount = existingRole.userRoles.length;
      await recordAccessAudit({
        actor,
        action: "update_role_permissions",
        targetType: "role",
        targetId: id,
        targetName: updatedRole.name,
        summary: `Cập nhật quyền vai trò "${updatedRole.name}": thêm ${addedPerms.length} quyền, gỡ ${removedPerms.length} quyền. Ảnh hưởng trực tiếp đến ${affectedUserCount} tài khoản.`,
        beforeData: {
          name: existingRole.name,
          permissions: oldPermissionCodes,
        },
        afterData: {
          name: updatedRole.name,
          permissions: newPermissionCodes,
          added: addedPerms,
          removed: removedPerms,
          affectedUsers: affectedUserCount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: `Cập nhật vai trò "${updatedRole.name}" thành công.`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || "Lỗi cập nhật vai trò" } },
      { status: 500 }
    );
  }
}

// DELETE /api/access/roles/[id] - Xóa vai trò (chặn xóa nếu là system role hoặc còn người dùng đang gán)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy vai trò." } },
        { status: 404 }
      );
    }

    // 1. Kiểm tra vai trò hệ thống
    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Không thể xóa vai trò hệ thống cốt lõi "${role.name}" (${role.code}). Bạn chỉ có thể chỉnh sửa mô tả hoặc quyền chức năng.`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Kiểm tra người dùng đang gán vai trò này
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Không thể xóa vai trò "${role.name}" vì đang có ${role._count.userRoles} người dùng áp dụng vai trò này. Vui lòng chuyển vai trò cho các tài khoản trước khi xóa.`,
          },
        },
        { status: 400 }
      );
    }

    // Tiến hành xóa vai trò và các quan hệ
    await prisma.role.delete({
      where: { id },
    });

    await recordAccessAudit({
      actor,
      action: "delete_role",
      targetType: "role",
      targetId: id,
      targetName: role.name,
      summary: `Xóa vai trò: "${role.name}" (${role.code})`,
      beforeData: {
        id: role.id,
        code: role.code,
        name: role.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa vai trò "${role.name}" thành công.`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || "Lỗi xóa vai trò" } },
      { status: 500 }
    );
  }
}
