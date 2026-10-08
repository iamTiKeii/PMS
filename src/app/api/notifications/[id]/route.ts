import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth";

export async function GET(
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
      where: {
        id,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { username: true, staff: { select: { fullName: true } } },
        },
        reads: {
          where: { userId: user.userId },
        },
      },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-72", message: "Thông báo không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    // Auto mark as read if not read yet (BR-23)
    if (notification.reads.length === 0) {
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
    }

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        severity: notification.severity,
        objectType: notification.objectType,
        objectId: notification.objectId,
        targetUrl: notification.targetUrl,
        createdAt: notification.createdAt,
        isRead: true,
        creatorName: notification.createdBy?.staff?.fullName || notification.createdBy?.username || "Hệ thống",
      },
    });
  } catch (err: any) {
    console.error("GET /api/notifications/[id] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải chi tiết thông báo." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-72", message: "Thông báo không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    // Soft delete (BR-27)
    await prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa thông báo thành công.",
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện chức năng này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi khi xóa thông báo." } },
      { status: 500 }
    );
  }
}
