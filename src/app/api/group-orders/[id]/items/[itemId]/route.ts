import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logGroupOrderActivity, recalculateGroupOrderTotal } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/group-orders/[id]/items/[itemId] - Sửa món (Thành viên sửa món khi open, Trưởng nhóm cập nhật giá khi closed)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id, itemId } = await props.params;
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

    const item = await prisma.groupOrderItem.findFirst({
      where: { id: itemId, groupOrderId: id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-11", message: "Món order không tồn tại." } },
        { status: 404 }
      );
    }

    const isLeader = order.createdById === session.userId;
    const isOwner = item.userId === session.userId;
    const actorName = (session as any).fullName || session.username;

    // 1. Trường hợp cập nhật giá (BR-GO-05: chỉ trưởng nhóm)
    if (body.unitPrice !== undefined) {
      if (!isLeader && session.role !== "admin") {
        return NextResponse.json(
          { success: false, error: { code: "MSG-GO-12", message: "Chỉ trưởng nhóm mới có quyền nhập giá món." } },
          { status: 403 }
        );
      }

      const unitPrice = Math.max(0, parseInt(body.unitPrice, 10) || 0);
      const totalAmount = item.quantity * unitPrice; // BR-GO-06

      const updated = await prisma.groupOrderItem.update({
        where: { id: itemId },
        data: {
          unitPrice,
          totalAmount,
        },
      });

      // Tính lại tổng đơn (BR-GO-08)
      await recalculateGroupOrderTotal(id);

      await logGroupOrderActivity({
        groupOrderId: id,
        eventCode: "GROUP_ORDER_PRICE_UPDATED",
        actorId: session.userId,
        actorName,
        title: "Cập nhật giá món",
        description: `${actorName} đã cập nhật giá cho "${item.itemName}": ${unitPrice.toLocaleString("vi-VN")}đ/món (Tổng: ${totalAmount.toLocaleString("vi-VN")}đ)`,
        metadata: {
          itemName: item.itemName,
          unitPrice,
          totalAmount,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật giá món.",
        data: updated,
      });
    }

    // 2. Trường hợp thành viên sửa món (tên, số lượng, ghi chú)
    if (order.status !== "open") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-09", message: "Đơn đã đóng order, không thể sửa món." } },
        { status: 400 }
      );
    }

    if (!isOwner && !isLeader && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-13", message: "Bạn chỉ có thể sửa món của chính mình." } },
        { status: 403 }
      );
    }

    const { itemName, quantity, note } = body;
    const parsedQty = quantity ? Math.max(1, parseInt(quantity, 10) || 1) : item.quantity;
    const newUnitPrice = item.unitPrice || 0;
    const newTotalAmount = parsedQty * newUnitPrice;

    const updated = await prisma.groupOrderItem.update({
      where: { id: itemId },
      data: {
        itemName: itemName ? itemName.trim() : item.itemName,
        quantity: parsedQty,
        note: note !== undefined ? (note ? note.trim() : null) : item.note,
        totalAmount: item.unitPrice !== null ? newTotalAmount : null,
      },
    });

    if (item.unitPrice !== null) {
      await recalculateGroupOrderTotal(id);
    }

    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_ITEM_UPDATED",
      actorId: session.userId,
      actorName,
      title: "Cập nhật món order",
      description: `${actorName} đã sửa "${item.itemName}" thành "${updated.itemName}" (x${updated.quantity})`,
      metadata: {
        oldItem: item.itemName,
        newItem: updated.itemName,
        quantity: updated.quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật món.",
      data: updated,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Update item error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật món order." } },
      { status: 500 }
    );
  }
}

// DELETE /api/group-orders/[id]/items/[itemId] - Xóa món order (BR-GO-03, BR-GO-04)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id, itemId } = await props.params;

    const order = await prisma.groupOrder.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-06", message: "Đơn đặt nhóm không tồn tại." } },
        { status: 404 }
      );
    }

    if (order.status !== "open") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-09", message: "Đơn đã đóng order, không thể xóa món." } },
        { status: 400 }
      );
    }

    const item = await prisma.groupOrderItem.findFirst({
      where: { id: itemId, groupOrderId: id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-11", message: "Món order không tồn tại." } },
        { status: 404 }
      );
    }

    const isLeader = order.createdById === session.userId;
    const isOwner = item.userId === session.userId;

    if (!isOwner && !isLeader && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-14", message: "Bạn chỉ có thể xóa món do chính bạn đặt." } },
        { status: 403 }
      );
    }

    await prisma.groupOrderItem.delete({
      where: { id: itemId },
    });

    await recalculateGroupOrderTotal(id);

    // Kiểm tra xem thành viên còn món nào trong đơn không, nếu không còn thì có thể giữ hoặc gỡ khỏi member
    const remainingItems = await prisma.groupOrderItem.count({
      where: { groupOrderId: id, userId: item.userId },
    });
    if (remainingItems === 0 && item.userId !== order.createdById) {
      // Nếu thành viên không còn món nào và không phải trưởng nhóm thì xóa khỏi member list
      await prisma.groupOrderMember.deleteMany({
        where: { groupOrderId: id, userId: item.userId },
      });
    }

    const actorName = (session as any).fullName || session.username;

    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_ITEM_REMOVED",
      actorId: session.userId,
      actorName,
      title: "Xóa món order",
      description: `${actorName} đã xóa món "${item.itemName}" (x${item.quantity}) khỏi order`,
      metadata: {
        itemName: item.itemName,
        quantity: item.quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa món "${item.itemName}".`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Delete item error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa món order." } },
      { status: 500 }
    );
  }
}
