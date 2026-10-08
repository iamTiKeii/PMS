import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import { isValidUrl } from "@/lib/url-parser";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

// GET /api/projects/[id] - Get project details
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                staffCode: true,
                corporateEmail: true,
                phoneNumber: true,
                department: true,
                status: true,
              },
            },
          },
          orderBy: { tierLevel: "asc" },
        },
        siteAccounts: {
          where: { deletedAt: null },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                staffCode: true,
                corporateEmail: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    const isMember =
      session.role === "admin" ||
      (session.staffId &&
        project.assignments.some((a) => a.staffId === session.staffId));

    // Mask passwords in siteAccounts
    const maskedAccounts = project.siteAccounts.map((acc) => ({
      id: acc.id,
      accountLabel: acc.accountLabel,
      siteLoginUsername: acc.siteLoginUsername,
      status: acc.status,
      notes: acc.notes,
      staff: acc.staff,
      lastRotatedAt: acc.lastRotatedAt,
      createdAt: acc.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: project.id,
        projectCode: project.projectCode,
        projectName: project.projectName,
        systemHisUrl: project.systemHisUrl,
        defaultPassword: project.defaultPassword,
        status: project.status,
        description: project.description,
        assignments: project.assignments,
        siteAccounts: maskedAccounts,
        isMember,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get project detail error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin dự án." } },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project (Admin or PM)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const { id } = await props.params;
    const body = await request.json();
    const {
      projectName,
      projectCode,
      systemHisUrl,
      defaultPassword,
      status,
      description,
      level1StaffId,
      level2StaffId,
      level3StaffId,
    } = body;

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        assignments: { where: { unassignedAt: null } },
      },
    });

    if (!existingProject || existingProject.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    if (projectName && projectName.trim() !== existingProject.projectName) {
      const dup = await prisma.project.findFirst({
        where: { projectName: projectName.trim(), id: { not: id }, deletedAt: null },
      });
      if (dup) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-61", message: "Tên dự án này đã tồn tại." } },
          { status: 400 }
        );
      }
    }

    if (systemHisUrl && !isValidUrl(systemHisUrl)) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-32", message: "Link hệ thống không hợp lệ." } },
        { status: 400 }
      );
    }

    // Check levels if updating assignments
    if (level1StaffId) {
      const selectedLevels = [
        { level: 1, staffId: level1StaffId },
        level2StaffId ? { level: 2, staffId: level2StaffId } : null,
        level3StaffId ? { level: 3, staffId: level3StaffId } : null,
      ].filter(Boolean) as { level: number; staffId: string }[];

      const staffIds = selectedLevels.map((l) => l.staffId);
      const uniqueIds = new Set(staffIds);
      if (uniqueIds.size !== staffIds.length) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-62",
              message: "Một nhân sự không thể đồng thời đảm nhận nhiều Level trong cùng một dự án.",
            },
          },
          { status: 400 }
        );
      }

      // Re-assign levels
      await prisma.projectAssignment.deleteMany({
        where: { projectId: id },
      });

      await prisma.projectAssignment.createMany({
        data: selectedLevels.map((l) => ({
          projectId: id,
          staffId: l.staffId,
          tierLevel: l.level,
          isPrimary: true,
        })),
      });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        projectName: projectName ? projectName.trim() : existingProject.projectName,
        projectCode: projectCode !== undefined ? (projectCode ? projectCode.trim() : null) : existingProject.projectCode,
        systemHisUrl: systemHisUrl ? systemHisUrl.trim() : existingProject.systemHisUrl,
        defaultPassword: defaultPassword !== undefined ? (defaultPassword ? defaultPassword.trim() : null) : existingProject.defaultPassword,
        status: status || existingProject.status,
        description: description !== undefined ? (description ? description.trim() : null) : existingProject.description,
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "PROJECT_UPDATED",
      targetEntity: "project",
      targetEntityId: updated.id,
      contextJson: { projectName: updated.projectName, changes: body },
    });

    createSystemNotification({
      title: "Cập nhật dự án",
      content: `Dự án "${updated.projectName}" vừa được cập nhật thông tin và ma trận nhân sự phụ trách.`,
      type: "project",
      severity: "info",
      objectType: "project",
      objectId: updated.id,
      targetUrl: "/projects",
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Cập nhật dự án thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Update project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật dự án." } },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Soft-delete project (Admin only)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await props.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    // Soft delete project
    await prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "closed",
      },
    });

    // BR-17: Automatically set linked accounts to 'stopped'
    await prisma.staffAccount.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { status: "stopped" },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "PROJECT_DELETED_SOFT",
      targetEntity: "project",
      targetEntityId: project.id,
      contextJson: { projectName: project.projectName },
    });

    createSystemNotification({
      title: "Dự án đã bị xóa",
      content: `Dự án "${project.projectName}" đã được chuyển sang trạng thái đã đóng/xóa mềm.`,
      type: "project",
      severity: "warning",
      objectType: "project",
      objectId: project.id,
      targetUrl: "/projects",
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      message: "Xóa dự án thành công. Các tài khoản site liên quan đã được chuyển sang trạng thái Ngừng hoạt động.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Delete project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa dự án." } },
      { status: 500 }
    );
  }
}
