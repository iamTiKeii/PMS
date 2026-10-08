import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/requests/next-code - Preview next QLYC code
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: projectId } = await props.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectName: true,
        shortName: true,
        requestSequence: true,
        deletedAt: true,
      },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    if (!project.shortName) {
      return NextResponse.json({
        success: true,
        data: {
          hasShortName: false,
          nextCode: null,
          message: "Dự án chưa có Tên viết tắt (short_name). Vui lòng cấu hình tên viết tắt để bật Quản lý yêu cầu.",
        },
      });
    }

    const nextSeq = project.requestSequence + 1;
    const nextCode = `${project.shortName}${String(nextSeq).padStart(5, "0")}`;

    return NextResponse.json({
      success: true,
      data: {
        hasShortName: true,
        shortName: project.shortName,
        nextSequence: nextSeq,
        nextCode,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Preview next code error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi lấy mã yêu cầu dự kiến." } },
      { status: 500 }
    );
  }
}
