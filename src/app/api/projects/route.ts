import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import { isValidUrl } from "@/lib/url-parser";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/projects - List projects
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { projectName: { contains: q } },
        { projectCode: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                corporateEmail: true,
                phoneNumber: true,
                department: true,
              },
            },
          },
          orderBy: { tierLevel: "asc" },
        },
        _count: {
          select: {
            siteAccounts: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map projects to convenient structure with level1, level2, level3
    const data = projects.map((p) => {
      const l1 = p.assignments.find((a) => a.tierLevel === 1)?.staff || null;
      const l2 = p.assignments.find((a) => a.tierLevel === 2)?.staff || null;
      const l3 = p.assignments.find((a) => a.tierLevel === 3)?.staff || null;

      // Check if current user is a member of this project
      const isMember =
        session.role === "admin" ||
        (session.staffId &&
          p.assignments.some((a) => a.staffId === session.staffId));

      return {
        id: p.id,
        projectCode: p.projectCode,
        projectName: p.projectName,
        systemHisUrl: p.systemHisUrl,
        defaultPassword: p.defaultPassword,
        status: p.status,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        level1: l1,
        level2: l2,
        level3: l3,
        assignments: p.assignments,
        accountCount: p._count.siteAccounts,
        isMember,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List projects error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách dự án." } },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create project (Admin or PM)
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const body = await request.json();
    const {
      projectName,
      projectCode,
      systemHisUrl,
      defaultPassword,
      description,
      level1StaffId,
      level2StaffId,
      level3StaffId,
    } = body;

    if (!projectName || !systemHisUrl) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập tên dự án và link hệ thống (HIS)." } },
        { status: 400 }
      );
    }

    if (!isValidUrl(systemHisUrl)) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-32", message: "Link hệ thống không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://." } },
        { status: 400 }
      );
    }

    // Check unique project name (BR-14)
    const existingName = await prisma.project.findFirst({
      where: { projectName: projectName.trim(), deletedAt: null },
    });
    if (existingName) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-61", message: "Tên dự án này đã tồn tại trong hệ thống." } },
        { status: 400 }
      );
    }

    // Level 1 is mandatory
    if (!level1StaffId) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Nhân sự Level 1 (Kỹ thuật/Vận hành trực tiếp) là bắt buộc." } },
        { status: 400 }
      );
    }

    // BR-15: Check cross-level duplicates
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

    // BR-16: Check active staff status
    const inactiveStaff = await prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        status: { not: "working" },
      },
    });

    if (inactiveStaff.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-52",
            message: `Chỉ được chọn nhân sự đang làm việc. Nhân sự "${inactiveStaff[0].fullName}" đã nghỉ việc.`,
          },
        },
        { status: 400 }
      );
    }

    const newProject = await prisma.project.create({
      data: {
        projectName: projectName.trim(),
        projectCode: projectCode ? projectCode.trim() : null,
        systemHisUrl: systemHisUrl.trim(),
        defaultPassword: defaultPassword ? defaultPassword.trim() : null,
        description: description ? description.trim() : null,
        assignments: {
          create: selectedLevels.map((l) => ({
            staffId: l.staffId,
            tierLevel: l.level,
            isPrimary: true,
          })),
        },
      },
      include: {
        assignments: {
          include: { staff: true },
        },
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "PROJECT_CREATED",
      targetEntity: "project",
      targetEntityId: newProject.id,
      contextJson: { projectName: newProject.projectName, projectCode: newProject.projectCode },
    });

    return NextResponse.json({
      success: true,
      data: newProject,
      message: "Tạo mới dự án thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Create project error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo mới dự án." } },
      { status: 500 }
    );
  }
}
