import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/audit-logs - View immutable audit logs (Admin only)
export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const actionCode = searchParams.get("actionCode") || "";
    const targetEntity = searchParams.get("targetEntity") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "30", 10)));

    const where: any = {};

    if (actionCode && actionCode !== "all") {
      where.actionCode = actionCode;
    }

    if (targetEntity && targetEntity !== "all") {
      where.targetEntity = targetEntity;
    }

    if (q) {
      where.OR = [
        { actionCode: { contains: q } },
        { targetEntity: { contains: q } },
        { targetEntityId: { contains: q } },
        { ipAddress: { contains: q } },
        { user: { username: { contains: q } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              staff: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Chỉ Quản trị viên mới có quyền xem nhật ký kiểm toán." } },
        { status: 403 }
      );
    }
    console.error("List audit logs error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải nhật ký kiểm toán." } },
      { status: 500 }
    );
  }
}
