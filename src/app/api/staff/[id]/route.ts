import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

// PUT /api/staff/[id] - Update staff profile (Admin only)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;
    const body = await request.json();
    const { fullName, staffCode, corporateEmail, phoneNumber, department, status, joinDate } = body;

    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: {
        projectAssignments: {
          where: { unassignedAt: null },
          include: { project: true },
        },
      },
    });

    if (!existingStaff || existingStaff.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Hồ sơ nhân sự không tồn tại." } },
        { status: 404 }
      );
    }

    // Check unique email if modified
    if (corporateEmail && corporateEmail !== existingStaff.corporateEmail) {
      const emailDup = await prisma.staff.findFirst({
        where: { corporateEmail: corporateEmail.trim(), id: { not: id }, deletedAt: null },
      });
      if (emailDup) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-41", message: "Email này đã thuộc về nhân sự khác." } },
          { status: 400 }
        );
      }
    }

    // Check unique staffCode if modified
    if (staffCode && staffCode !== existingStaff.staffCode) {
      const codeDup = await prisma.staff.findFirst({
        where: { staffCode: staffCode.trim(), id: { not: id }, deletedAt: null },
      });
      if (codeDup) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-41", message: "Mã nhân viên này đã trùng với nhân sự khác." } },
          { status: 400 }
        );
      }
    }

    let warningMessage = "";
    // If status changing from working -> left (Offboarding rule)
    if (status === "left" && existingStaff.status === "working") {
      const activeProjects = existingStaff.projectAssignments.map(
        (pa) => `${pa.project.projectName} (Level ${pa.tierLevel})`
      );
      if (activeProjects.length > 0) {
        warningMessage = `Nhân sự đang phụ trách các dự án: ${activeProjects.join(", ")}. Vui lòng nhanh chóng phân công người thay thế và đổi mật khẩu các tài khoản site liên quan.`;
      }

      // Automatically flag staff site accounts to rotation_needed
      await prisma.staffAccount.updateMany({
        where: { staffId: id, status: "in_use", deletedAt: null },
        data: { status: "rotation_needed" },
      });
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        fullName: fullName ? fullName.trim() : existingStaff.fullName,
        staffCode: staffCode !== undefined ? (staffCode ? staffCode.trim() : null) : existingStaff.staffCode,
        corporateEmail: corporateEmail !== undefined ? (corporateEmail ? corporateEmail.trim() : null) : existingStaff.corporateEmail,
        phoneNumber: phoneNumber !== undefined ? (phoneNumber ? phoneNumber.trim() : null) : existingStaff.phoneNumber,
        department: department !== undefined ? (department ? department.trim() : null) : existingStaff.department,
        status: status || existingStaff.status,
        joinDate: joinDate ? new Date(joinDate) : existingStaff.joinDate,
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "STAFF_UPDATED",
      targetEntity: "staff",
      targetEntityId: updated.id,
      contextJson: { changes: body, warning: warningMessage || null },
    });

    const isLeft = updated.status === "left" && existingStaff.status !== "left";
    createSystemNotification({
      title: isLeft ? "Nhân sự nghỉ việc" : "Cập nhật hồ sơ nhân sự",
      content: isLeft
        ? `Nhân sự "${updated.fullName}" (${updated.staffCode || "N/A"}) đã chuyển sang trạng thái Nghỉ việc.`
        : `Hồ sơ nhân sự "${updated.fullName}" vừa được cập nhật thông tin.`,
      type: "staff",
      severity: isLeft ? "warning" : "info",
      objectType: "staff",
      objectId: updated.id,
      targetUrl: "/staff",
      createdById: adminSession.userId,
      actorName: adminSession.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      data: updated,
      warning: warningMessage || null,
      message: "Cập nhật hồ sơ nhân sự thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Update staff error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật hồ sơ nhân sự." } },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id] - Soft-delete staff (Admin only)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        projectAssignments: {
          where: { unassignedAt: null },
          include: { project: true },
        },
        siteAccounts: {
          where: { deletedAt: null, status: "in_use" },
        },
      },
    });

    if (!staff || staff.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Hồ sơ nhân sự không tồn tại." } },
        { status: 404 }
      );
    }

    // Check BR-10: Cannot delete staff if assigned as active Level or has in_use site accounts
    const activeProjects = staff.projectAssignments.map((pa) => `${pa.project.projectName} (Level ${pa.tierLevel})`);
    if (activeProjects.length > 0 || staff.siteAccounts.length > 0) {
      const details = [];
      if (activeProjects.length > 0) details.push(`đang phụ trách dự án: ${activeProjects.join(", ")}`);
      if (staff.siteAccounts.length > 0) details.push(`đang có ${staff.siteAccounts.length} tài khoản site đang dùng`);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-43",
            message: `Không thể xóa nhân sự: Nhân sự ${details.join(" và ")}. Vui lòng gỡ bỏ phân công và thu hồi tài khoản trước khi xóa.`,
          },
        },
        { status: 400 }
      );
    }

    await prisma.staff.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "left",
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "STAFF_DELETED_SOFT",
      targetEntity: "staff",
      targetEntityId: staff.id,
      contextJson: { fullName: staff.fullName },
    });

    createSystemNotification({
      title: "Hồ sơ nhân sự đã bị xóa",
      content: `Hồ sơ nhân sự "${staff.fullName}" (${staff.staffCode || "N/A"}) đã được xóa mềm khỏi hệ thống.`,
      type: "staff",
      severity: "warning",
      objectType: "staff",
      objectId: staff.id,
      targetUrl: "/staff",
      createdById: adminSession.userId,
      actorName: adminSession.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      message: "Xóa hồ sơ nhân sự thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Delete staff error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi khi xóa hồ sơ nhân sự." } },
      { status: 500 }
    );
  }
}
