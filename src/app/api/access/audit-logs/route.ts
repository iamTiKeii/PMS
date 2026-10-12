import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/access/audit-logs - Tra cứu lịch sử cấp/thu hồi quyền và thay đổi vai trò
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const action = searchParams.get("action") || "";
    const targetType = searchParams.get("targetType") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};

    if (q) {
      where.OR = [
        { actorUsername: { contains: q } },
        { actorName: { contains: q } },
        { targetName: { contains: q } },
        { summary: { contains: q } },
      ];
    }

    if (action && action !== "all") {
      where.action = action;
    }

    if (targetType && targetType !== "all") {
      where.targetType = targetType;
    }

    const logs = await prisma.accessAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        actorId: log.actorId,
        actorUsername: log.actorUsername,
        actorName: log.actorName,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        targetName: log.targetName,
        summary: log.summary,
        beforeData: log.beforeDataJson ? JSON.parse(log.beforeDataJson) : null,
        afterData: log.afterDataJson ? JSON.parse(log.afterDataJson) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải nhật ký phân quyền" } },
      { status: 500 }
    );
  }
}
