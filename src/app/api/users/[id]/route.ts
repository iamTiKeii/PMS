import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// PUT /api/users/[id] - Update user (Admin only)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;
    const body = await request.json();
    const { role, status, staffId, newPassword } = body;

    const userToUpdate = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToUpdate || userToUpdate.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Người dùng không tồn tại." } },
        { status: 404 }
      );
    }

    // BR-06: Check if modifying Admin
    if (userToUpdate.role === "admin" && (role !== "admin" || status === "locked" || status === "inactive")) {
      // Cannot lock or demote yourself
      if (userToUpdate.id === adminSession.userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-24",
              message: "Không thể tự hạ vai trò hoặc tự khóa tài khoản của chính mình.",
            },
          },
          { status: 400 }
        );
      }

      // Check how many active admins remain
      const activeAdminCount = await prisma.user.count({
        where: {
          role: "admin",
          status: "active",
          deletedAt: null,
          id: { not: userToUpdate.id },
        },
      });

      if (activeAdminCount < 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-24",
              message: "Hệ thống bắt buộc phải duy trì ít nhất một tài khoản Super Admin hoạt động.",
            },
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) {
      updateData.status = status;
      if (status === "active") {
        updateData.failedAttempts = 0;
        updateData.lockedUntil = null;
      }
    }
    if (staffId !== undefined) updateData.staffId = staffId || null;

    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
      updateData.mustChangePassword = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        staffId: true,
        updatedAt: true,
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: newPassword ? "USER_PASSWORD_RESET" : "USER_UPDATED",
      targetEntity: "user",
      targetEntityId: updatedUser.id,
      contextJson: { changes: updateData },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Cập nhật thông tin người dùng thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật người dùng." } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Soft-delete user (Admin only)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;

    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete || userToDelete.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Người dùng không tồn tại." } },
        { status: 404 }
      );
    }

    // BR-06: Cannot delete self
    if (userToDelete.id === adminSession.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-24",
            message: "Bạn không thể tự xóa tài khoản của chính mình.",
          },
        },
        { status: 400 }
      );
    }

    // If deleting an admin, ensure another active admin exists
    if (userToDelete.role === "admin") {
      const activeAdminCount = await prisma.user.count({
        where: {
          role: "admin",
          status: "active",
          deletedAt: null,
          id: { not: userToDelete.id },
        },
      });

      if (activeAdminCount < 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-24",
              message: "Hệ thống phải còn ít nhất một Super Admin hoạt động.",
            },
          },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "inactive",
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "USER_DELETED_SOFT",
      targetEntity: "user",
      targetEntityId: userToDelete.id,
      contextJson: { username: userToDelete.username },
    });

    return NextResponse.json({
      success: true,
      message: "Xóa người dùng thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi khi xóa người dùng." } },
      { status: 500 }
    );
  }
}
