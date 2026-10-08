import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logGroupOrderActivity, recalculateGroupOrderTotal } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/group-orders/[id]/items - Thành viên thêm món order (BR-GO-03, BR-GO-04)
export async function POST(
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

    // BR-GO-04: Khi đơn CLOSED, thành viên không được thêm món
    if (order.status !== "open") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-09", message: "Đơn đã đóng order, không thể thêm món mới." } },
        { status: 400 }
      );
    }

    const { itemName, quantity = 1, note } = body;

    if (!itemName || !itemName.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-10", message: "Tên món không được để trống." } },
        { status: 400 }
      );
    }

    const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);

    // Đảm bảo user có trong GroupOrderMember
    await prisma.groupOrderMember.upsert({
      where: {
        groupOrderId_userId: {
          groupOrderId: id,
          userId: session.userId,
        },
      },
      create: {
        groupOrderId: id,
        userId: session.userId,
        paymentStatus: "pending",
      },
      update: {},
    });

    // Tạo món
    const newItem = await prisma.groupOrderItem.create({
      data: {
        groupOrderId: id,
        userId: session.userId,
        itemName: itemName.trim(),
        quantity: parsedQty,
        note: note ? note.trim() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            staff: { select: { fullName: true } },
          },
        },
      },
    });

    const actorName = (session as any).fullName || session.username;

    // Ghi nhận Activity Timeline (BR-GO-11)
    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_ITEM_ADDED",
      actorId: session.userId,
      actorName,
      title: "Thêm món order",
      description: `${actorName} đã thêm "${newItem.itemName}" (x${newItem.quantity})${newItem.note ? ` - Ghi chú: ${newItem.note}` : ""}`,
      metadata: {
        itemName: newItem.itemName,
        quantity: newItem.quantity,
        note: newItem.note,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã thêm món "${newItem.itemName}" vào order.`,
      data: newItem,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Add item error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi thêm món order." } },
      { status: 500 }
    );
  }
}
