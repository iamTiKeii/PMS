import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Chưa đăng nhập hoặc phiên đã hết hạn." } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        staff: {
          include: {
            projectAssignments: {
              where: { unassignedAt: null },
              include: {
                project: {
                  select: { id: true, projectName: true, projectCode: true, systemHisUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không tồn tại hoặc đã bị khóa." } },
        { status: 403 }
      );
    }

    const assignedProjects = user.staff?.projectAssignments.map((pa) => ({
      projectId: pa.projectId,
      projectName: pa.project.projectName,
      projectCode: pa.project.projectCode,
      systemHisUrl: pa.project.systemHisUrl,
      tierLevel: pa.tierLevel,
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        staff: user.staff
          ? {
              id: user.staff.id,
              fullName: user.staff.fullName,
              staffCode: user.staff.staffCode,
              corporateEmail: user.staff.corporateEmail,
              phoneNumber: user.staff.phoneNumber,
              department: user.staff.department,
            }
          : null,
        assignedProjects,
      },
    });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin tài khoản." } },
      { status: 500 }
    );
  }
}
