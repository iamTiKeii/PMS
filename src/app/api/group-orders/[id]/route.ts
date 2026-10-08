import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/group-orders/[id] - Chi tiết đơn đặt nhóm
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const order = await prisma.groupOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            staff: { select: { fullName: true } },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                staff: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        items: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                staff: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        reminders: {
          orderBy: { sentAt: "desc" },
        },
        activities: {
          orderBy: { eventTime: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-06", message: "Đơn đặt nhóm không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    const isLeader = order.createdById === session.userId;
    const isMember = (order as any).members.some((m: any) => m.userId === session.userId);

    // Chuẩn hóa tên cho items
    const formattedItems = (order as any).items.map((it: any) => ({
      ...it,
      user: {
        id: it.user.id,
        username: it.user.username,
        fullName: it.user.staff?.fullName || it.user.username,
      },
    }));

    // Tính toán số liệu từng thành viên
    const membersWithSummary = (order as any).members.map((m: any) => {
      const userItems = formattedItems.filter((it: any) => it.userId === m.userId);
      const totalAmount = userItems.reduce((sum: number, it: any) => sum + (it.totalAmount || 0), 0);
      const totalItemsCount = userItems.reduce((sum: number, it: any) => sum + it.quantity, 0);

      return {
        ...m,
        user: {
          id: m.user.id,
          username: m.user.username,
          fullName: m.user.staff?.fullName || m.user.username,
        },
        items: userItems,
        totalAmount,
        totalItemsCount,
      };
    });

    // Thống kê tài chính
    const totalCollected = membersWithSummary
      .filter((m: any) => m.paymentStatus === "paid")
      .reduce((sum: number, m: any) => sum + m.totalAmount, 0);

    const totalUnpaid = membersWithSummary
      .filter((m: any) => m.paymentStatus !== "paid")
      .reduce((sum: number, m: any) => sum + m.totalAmount, 0);

    const unpaidCount = membersWithSummary.filter((m: any) => m.paymentStatus !== "paid").length;

    // Lấy cấu hình thanh toán của trưởng nhóm nếu có
    const leaderPaymentConfig = await prisma.userPaymentConfig.findUnique({
      where: { userId: order.createdById },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        createdByUser: {
          id: (order as any).createdByUser.id,
          username: (order as any).createdByUser.username,
          fullName: (order as any).createdByUser.staff?.fullName || (order as any).createdByUser.username,
        },
        items: formattedItems,
        isLeader,
        isMember,
        currentUserId: session.userId,
        members: membersWithSummary,
        summary: {
          totalAmount: order.totalAmount,
          totalCollected,
          totalUnpaid,
          unpaidCount,
          totalMembers: (order as any).members.length,
          paidMembersCount: (order as any).members.length - unpaidCount,
        },
        leaderPaymentConfig,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get group order error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}

// PUT /api/group-orders/[id] - Cập nhật thông tin đơn (Chỉ trưởng nhóm)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();

    const order = await prisma.groupOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-06", message: "Đơn đặt nhóm không tồn tại." } },
        { status: 404 }
      );
    }

    if (order.createdById !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-07", message: "Chỉ trưởng nhóm mới có quyền sửa thông tin đơn." } },
        { status: 403 }
      );
    }

    const { title, description, orderDeadline } = body;

    let parsedDeadline: Date | null = order.orderDeadline;
    if (orderDeadline !== undefined) {
      if (orderDeadline) {
        parsedDeadline = new Date(orderDeadline);
        if (isNaN(parsedDeadline.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: "MSG-GO-05", message: "Hạn order không hợp lệ." } },
            { status: 400 }
          );
        }
      } else {
        parsedDeadline = null;
      }
    }

    const updated = await prisma.groupOrder.update({
      where: { id },
      data: {
        title: title ? title.trim() : order.title,
        description: description !== undefined ? (description ? description.trim() : null) : order.description,
        orderDeadline: parsedDeadline,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật thông tin đơn.",
      data: updated,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Update group order error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}

// DELETE /api/group-orders/[id] - Xóa đơn đặt nhóm
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const order = await prisma.groupOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-06", message: "Đơn đặt nhóm không tồn tại." } },
        { status: 404 }
      );
    }

    if (order.createdById !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-07", message: "Chỉ trưởng nhóm hoặc admin mới có quyền xóa đơn." } },
        { status: 403 }
      );
    }

    await prisma.groupOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "GROUP_ORDER_DELETED",
      targetEntity: "group_order",
      targetEntityId: id,
      contextJson: { orderCode: order.orderCode, title: order.title },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa đơn đặt nhóm.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Delete group order error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}
