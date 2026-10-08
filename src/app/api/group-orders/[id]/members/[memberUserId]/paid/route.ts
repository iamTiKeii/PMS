import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logGroupOrderActivity, checkAndAutoSetCompleted } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/group-orders/[id]/members/[memberUserId]/paid - Trưởng nhóm xác nhận thanh toán (BR-GO-09, BR-GO-10)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string; memberUserId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id, memberUserId } = await props.params;
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

    // BR-GO-09: Chỉ trưởng nhóm được đánh dấu thành viên đã thanh toán
    if (order.createdById !== session.userId && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-16", message: "Chỉ trưởng nhóm mới có quyền xác nhận thanh toán." } },
        { status: 403 }
      );
    }

    const member = await prisma.groupOrderMember.findFirst({
      where: { groupOrderId: id, userId: memberUserId },
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

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-17", message: "Thành viên không nằm trong đơn đặt nhóm này." } },
        { status: 404 }
      );
    }

    const { paymentStatus = "paid" } = body;
    const isPaid = paymentStatus === "paid";
    const actorName = (session as any).fullName || session.username;
    const targetMemberName = member.user?.staff?.fullName || member.user?.username || "Thành viên";

    // BR-GO-10: Đã thanh toán phải lưu paid_at và paid_confirmed_by
    const updated = await prisma.groupOrderMember.update({
      where: { id: member.id },
      data: {
        paymentStatus: isPaid ? "paid" : "pending",
        paidAt: isPaid ? new Date() : null,
        paidConfirmedById: isPaid ? session.userId : null,
      },
    });

    // Ghi nhận Activity Timeline (BR-GO-11)
    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: isPaid ? "GROUP_ORDER_MEMBER_PAID" : "GROUP_ORDER_MEMBER_UNPAID",
      actorId: session.userId,
      actorName,
      title: isPaid ? "Xác nhận đã thanh toán" : "Hủy xác nhận thanh toán",
      description: isPaid
        ? `${actorName} đã xác nhận nhận tiền thành công từ ${targetMemberName}`
        : `${actorName} đã chuyển lại trạng thái Chưa thanh toán cho ${targetMemberName}`,
      metadata: {
        memberUserId,
        memberName: targetMemberName,
        paymentStatus: updated.paymentStatus,
      },
    });

    // Kiểm tra xem tất cả thành viên đã trả chưa -> Tự chuyển sang COMPLETED
    const autoCompleted = await checkAndAutoSetCompleted(id, actorName);

    return NextResponse.json({
      success: true,
      message: isPaid
        ? `Đã xác nhận thanh toán cho ${targetMemberName}.`
        : `Đã hủy xác nhận thanh toán của ${targetMemberName}.`,
      data: updated,
      autoCompleted,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Confirm member payment error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xác nhận thanh toán thành viên." } },
      { status: 500 }
    );
  }
}
