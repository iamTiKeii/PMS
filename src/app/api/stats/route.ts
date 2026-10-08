import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    const [
      totalProjects,
      totalLinks,
      totalStaff,
      totalAccounts,
      recentLogs,
      recentLinks,
      urgentProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.docLink.count({ where: { deletedAt: null } }),
      prisma.staff.count({ where: { deletedAt: null } }),
      prisma.staffAccount.count({ where: { deletedAt: null } }),
      session.role === "admin"
        ? prisma.auditLog.findMany({
            take: 6,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { username: true } } },
          })
        : [],
      prisma.docLink.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.findMany({
        where: { deletedAt: null, status: "active" },
        take: 4,
        include: {
          assignments: {
            where: { unassignedAt: null },
            include: { staff: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          projects: totalProjects,
          docLinks: totalLinks,
          staff: totalStaff,
          accounts: totalAccounts,
        },
        recentLogs,
        recentLinks,
        urgentProjects,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thống kê trang chủ." } },
      { status: 500 }
    );
  }
}
