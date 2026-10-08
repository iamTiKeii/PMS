import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logGroupOrderActivity } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/group-orders/[id]/close - Trưởng nhóm đóng đơn order
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const order = await prisma.groupOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: true,
        members: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-06", message: "Đơn đặt nhóm không tồn tại." } },
        { status: 404 }
      );
    }

    if (order.createdById !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-07", message: "Chỉ trưởng nhóm mới có quyền đóng đơn." } },
        { status: 403 }
      );
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-08", message: "Đơn này đã được đóng trước đó." } },
        { status: 400 }
      );
    }

    const closed = await prisma.groupOrder.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });

    const actorName = (session as any).fullName || session.username;

    // Ghi nhận Activity Timeline (BR-GO-11)
    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_CLOSED",
      actorId: session.userId,
      actorName,
      title: "Đóng đơn order",
      description: `${actorName} đã đóng đơn. Thành viên không thể order thêm; bắt đầu chuyển sang bước nhập giá và thanh toán.`,
      metadata: {
        totalItems: order.items.length,
        totalMembers: order.members.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã đóng đơn order thành công. Bây giờ bạn có thể đi mua hàng và nhập giá thực tế.",
      data: closed,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Close group order error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi đóng đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}
