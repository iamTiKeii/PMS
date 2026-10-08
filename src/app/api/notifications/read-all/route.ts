import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Phiên đăng nhập hết hạn." } },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all unread notifications for this user
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        reads: {
          none: {
            userId: user.userId,
          },
        },
      },
      select: { id: true },
    });

    if (unreadNotifications.length > 0) {
      const records = unreadNotifications.map((n) => ({
        notificationId: n.id,
        userId: user.userId,
      }));

      // createMany with skipDuplicates for MySQL
      await prisma.notificationRead.createMany({
        data: records,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc.",
    });
  } catch (err: any) {
    console.error("POST /api/notifications/read-all error:", err);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi đánh dấu tất cả đã đọc." } },
      { status: 500 }
    );
  }
}
