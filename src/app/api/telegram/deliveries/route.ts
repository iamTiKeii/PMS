import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { channel: "telegram" },
      orderBy: { sentAt: "desc" },
      take: limit,
      include: {
        notification: {
          select: {
            id: true,
            title: true,
            type: true,
            severity: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: deliveries,
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện chức năng này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải lịch sử gửi tin Telegram." } },
      { status: 500 }
    );
  }
}
