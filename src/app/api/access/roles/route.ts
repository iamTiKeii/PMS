import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { recordAccessAudit } from "@/lib/access-control";

export const dynamic = "force-dynamic";

// GET /api/access/roles - Danh sách vai trò kèm thống kê số người dùng và quyền
export async function GET() {
  try {
    await requireAuth();

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
        rolePermissions: {
          select: {
            permissionId: true,
            permission: {
              select: {
                code: true,
                name: true,
                module: true,
                isSensitive: true,
              },
            },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    const formatted = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      status: r.status,
      defaultScopeType: r.defaultScopeType,
      userCount: r._count.userRoles,
      permissionCount: r._count.rolePermissions,
      sensitivePermissionCount: r.rolePermissions.filter((rp) => rp.permission.isSensitive).length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    console.error("GET /api/access/roles error:", error);
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải danh sách vai trò", detail: error?.message || String(error) } },
      { status: 500 }
    );
  }
}

// POST /api/access/roles - Tạo vai trò mới
export async function POST(request: Request) {
  try {
    const actor = await requireAuth();

    const body = await request.json();
    const { name, code, description, defaultScopeType, permissionCodes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: "Tên vai trò không được để trống." } },
        { status: 400 }
      );
    }

    const cleanCode = (code || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: { message: "Mã vai trò không hợp lệ." } },
        { status: 400 }
      );
    }

    // Kiểm tra trùng mã
    const existing = await prisma.role.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: `Mã vai trò '${cleanCode}' đã tồn tại.` } },
        { status: 400 }
      );
    }

    // Tạo role
    const newRole = await prisma.role.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description?.trim() || null,
        defaultScopeType: defaultScopeType || "system",
        isSystem: false,
        status: "active",
      },
    });

    // Gán danh sách quyền nếu có
    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true, code: true },
      });

      for (const p of perms) {
        await prisma.rolePermission.create({
          data: {
            roleId: newRole.id,
            permissionId: p.id,
          },
        });
      }
    }

    await recordAccessAudit({
      actor,
      action: "create_role",
      targetType: "role",
      targetId: newRole.id,
      targetName: newRole.name,
      summary: `Tạo vai trò mới: "${newRole.name}" (${newRole.code}) với ${permissionCodes?.length || 0} quyền`,
      afterData: {
        id: newRole.id,
        code: newRole.code,
        name: newRole.name,
        permissionCount: permissionCodes?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: newRole,
      message: "Tạo vai trò mới thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || "Lỗi tạo vai trò mới" } },
      { status: 500 }
    );
  }
}
