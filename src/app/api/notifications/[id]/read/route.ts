import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Phiên đăng nhập hết hạn." } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const notification = await prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-72", message: "Thông báo không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId: user.userId,
        },
      },
      create: {
        notificationId: id,
        userId: user.userId,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc.",
    });
  } catch (err: any) {
    console.error("POST /api/notifications/[id]/read error:", err);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật trạng thái đã đọc." } },
      { status: 500 }
    );
  }
}
