import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/access/scopes - Tổng quan cấu hình phạm vi dữ liệu và danh mục mục tiêu (Projects, Departments)
export async function GET() {
  try {
    await requireAuth();

    // Lấy danh sách dự án active để gán scope
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        projectName: true,
        projectCode: true,
      },
      orderBy: { projectName: "asc" },
    });

    // Lấy danh sách phòng ban từ Staff
    const staffDepts = await prisma.staff.findMany({
      where: {
        deletedAt: null,
        department: { not: null },
      },
      select: { department: true },
      distinct: ["department"],
    });
    const departments = staffDepts
      .map((s) => s.department)
      .filter((d): d is string => Boolean(d))
      .sort();

    // Thống kê người dùng theo các mức scope
    const allScopes = await prisma.userRoleScope.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
            staff: {
              select: {
                fullName: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const scopeCounts: Record<string, number> = {
      system: 0,
      project: 0,
      department: 0,
      assigned: 0,
      personal: 0,
    };

    for (const s of allScopes) {
      if (scopeCounts[s.scopeType] !== undefined) {
        scopeCounts[s.scopeType]++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: scopeCounts,
        availableTargets: {
          projects: projects.map((p) => ({
            id: p.id,
            name: p.projectName,
            code: p.projectCode,
          })),
          departments,
        },
        scopes: allScopes.map((s) => ({
          id: s.id,
          userId: s.userId,
          username: s.user.username,
          fullName: s.user.staff?.fullName || s.user.username,
          scopeType: s.scopeType,
          targetId: s.targetId,
          targetName: s.targetName,
          notes: s.notes,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải tổng quan phạm vi truy cập" } },
      { status: 500 }
    );
  }
}
