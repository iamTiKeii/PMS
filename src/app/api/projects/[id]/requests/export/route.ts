import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/projects/[id]/requests/export - Log audit event when exporting requests to Excel
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await props.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectName: true, projectCode: true, shortName: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === "number" ? body.count : 0;
    const scope = body.scope === "dang_loc" ? "Danh sách đang lọc" : "Toàn bộ dự án";

    await recordAuditLog({
      userId: user.userId,
      actionCode: "REQUEST_EXPORT",
      targetEntity: "ProjectRequest",
      targetEntityId: projectId,
      contextJson: {
        projectId,
        projectName: project.projectName,
        projectCode: project.projectCode,
        shortName: project.shortName,
        exportCount: count,
        exportScope: scope,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã ghi nhận nhật ký xuất Excel.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Export request audit log error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi ghi nhận lịch sử xuất file." } },
      { status: 500 }
    );
  }
}
