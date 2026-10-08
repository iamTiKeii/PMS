import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logGroupOrderActivity, recalculateGroupOrderTotal } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/group-orders/[id]/prices - Trưởng nhóm cập nhật hàng loạt đơn giá các món (BR-GO-05, BR-GO-06, BR-GO-07)
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
        { success: false, error: { code: "MSG-GO-12", message: "Chỉ trưởng nhóm mới có quyền cập nhật giá món." } },
        { status: 403 }
      );
    }

    const { prices } = body; // Array of { itemId: string, unitPrice: number }

    if (!Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-15", message: "Danh sách giá không hợp lệ." } },
        { status: 400 }
      );
    }

    // Cập nhật từng món
    for (const p of prices) {
      if (!p.itemId) continue;
      const unitPrice = Math.max(0, parseInt(p.unitPrice, 10) || 0);

      const existing = await prisma.groupOrderItem.findFirst({
        where: { id: p.itemId, groupOrderId: id },
      });

      if (existing) {
        const totalAmount = existing.quantity * unitPrice; // BR-GO-06
        await prisma.groupOrderItem.update({
          where: { id: p.itemId },
          data: {
            unitPrice,
            totalAmount,
          },
        });
      }
    }

    // Tính lại tổng đơn (BR-GO-08)
    const newTotal = await recalculateGroupOrderTotal(id);
    const actorName = (session as any).fullName || session.username;

    // Ghi nhận Activity Timeline (BR-GO-11)
    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_PRICE_UPDATED",
      actorId: session.userId,
      actorName,
      title: "Cập nhật bảng giá thực tế",
      description: `${actorName} đã lưu bảng giá thực tế cho các món. Tổng tiền đơn hàng: ${newTotal.toLocaleString("vi-VN")}đ.`,
      metadata: {
        totalAmount: newTotal,
        updatedItemsCount: prices.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật giá các món thành công.",
      totalAmount: newTotal,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Batch update prices error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi lưu bảng giá món ăn." } },
      { status: 500 }
    );
  }
}
