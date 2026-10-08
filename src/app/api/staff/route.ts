import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/staff - List staff members
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q } },
        { staffCode: { contains: q } },
        { corporateEmail: { contains: q } },
        { department: { contains: q } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const staffList = await prisma.staff.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, role: true, status: true },
        },
        projectAssignments: {
          where: { unassignedAt: null },
          include: {
            project: {
              select: { id: true, projectName: true, projectCode: true, systemHisUrl: true },
            },
          },
        },
        _count: {
          select: {
            siteAccounts: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập." } },
        { status: 401 }
      );
    }
    console.error("List staff error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách nhân sự." } },
      { status: 500 }
    );
  }
}

// POST /api/staff - Create new staff (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await requireRole(["admin"]);
    const body = await request.json();
    const { fullName, staffCode, corporateEmail, phoneNumber, department, status = "working", joinDate } = body;

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Họ và tên nhân sự là bắt buộc." } },
        { status: 400 }
      );
    }

    // Check unique corporateEmail if provided
    if (corporateEmail) {
      const existingEmail = await prisma.staff.findFirst({
        where: { corporateEmail: corporateEmail.trim(), deletedAt: null },
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-41", message: "Email này đã thuộc về nhân sự khác trong hệ thống." } },
          { status: 400 }
        );
      }
    }

    // Check unique staffCode if provided
    if (staffCode) {
      const existingCode = await prisma.staff.findFirst({
        where: { staffCode: staffCode.trim(), deletedAt: null },
      });
      if (existingCode) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-41", message: "Mã nhân sự này đã tồn tại." } },
          { status: 400 }
        );
      }
    }

    const newStaff = await prisma.staff.create({
      data: {
        fullName: fullName.trim(),
        staffCode: staffCode ? staffCode.trim() : null,
        corporateEmail: corporateEmail ? corporateEmail.trim() : null,
        phoneNumber: phoneNumber ? phoneNumber.trim() : null,
        department: department ? department.trim() : null,
        status: status as string,
        joinDate: joinDate ? new Date(joinDate) : null,
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "STAFF_CREATED",
      targetEntity: "staff",
      targetEntityId: newStaff.id,
      contextJson: { fullName: newStaff.fullName, staffCode: newStaff.staffCode },
    });

    createSystemNotification({
      title: "Nhân sự mới được tiếp nhận",
      content: `Hồ sơ nhân sự "${newStaff.fullName}" (${newStaff.staffCode || "N/A"}) - ${newStaff.department || "Chưa rõ phòng ban"} đã được thêm vào hệ thống.`,
      type: "staff",
      severity: "success",
      objectType: "staff",
      objectId: newStaff.id,
      targetUrl: "/staff",
      createdById: adminSession.userId,
      actorName: adminSession.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      data: newStaff,
      message: "Thêm hồ sơ nhân sự thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Create staff error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo hồ sơ nhân sự mới." } },
      { status: 500 }
    );
  }
}
