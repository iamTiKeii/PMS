import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth";
import { createSystemNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Phiên đăng nhập hết hạn hoặc chưa đăng nhập." } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // 'all' | 'unread'
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const now = new Date();

    // Base condition: not deleted and not expired
    const where: any = {
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (type && type !== "all") {
      where.type = type;
    }

    if (filter === "unread") {
      where.reads = {
        none: {
          userId: user.userId,
        },
      };
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          reads: {
            where: { userId: user.userId },
            select: { readAt: true },
          },
          createdBy: {
            select: { username: true, staff: { select: { fullName: true } } },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          reads: {
            none: {
              userId: user.userId,
            },
          },
        },
      }),
    ]);

    const formatted = items.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      type: item.type,
      severity: item.severity,
      objectType: item.objectType,
      objectId: item.objectId,
      targetUrl: item.targetUrl,
      createdAt: item.createdAt,
      isRead: item.reads.length > 0,
      readAt: item.reads[0]?.readAt || null,
      creatorName: item.createdBy?.staff?.fullName || item.createdBy?.username || "Hệ thống",
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json(
      { success: false, error: { code: "MSG-71", message: "Không thể tải danh sách thông báo. Vui lòng thử lại." } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["admin"]);

    const body = await req.json();
    const { title, content, type, severity, targetUrl, expiresAt } = body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập tiêu đề và nội dung thông báo." } },
        { status: 400 }
      );
    }

    if (title.trim().length < 2 || title.trim().length > 200) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Tiêu đề thông báo phải từ 2 đến 200 ký tự." } },
        { status: 400 }
      );
    }

    if (content.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-75", message: "Nội dung thông báo vượt quá giới hạn 5000 ký tự." } },
        { status: 400 }
      );
    }

    const notification = await createSystemNotification({
      title: title.trim(),
      content: content.trim(),
      type: type || "custom",
      severity: severity || "info",
      targetUrl: targetUrl?.trim() || null,
      createdById: user.userId,
      actorName: user.username,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình tạo thông báo." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã tạo thông báo thành công.",
      data: notification,
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện chức năng này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi máy chủ khi tạo thông báo." } },
      { status: 500 }
    );
  }
}
