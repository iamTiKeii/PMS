import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getVietQrUrl,
  logGroupOrderActivity,
  sendPaymentReminderToTelegram,
} from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/group-orders/[id]/payment-reminder - Sinh QR & Gửi nhắc thanh toán qua Telegram (BR-GO-11 -> BR-GO-15)
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
        },
        items: true,
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
        { success: false, error: { code: "MSG-GO-18", message: "Chỉ trưởng nhóm mới có quyền tạo nhắc thanh toán." } },
        { status: 403 }
      );
    }

    const {
      bankCode,
      accountNumber,
      accountName,
      customContent,
      sendTelegram = false,
    } = body;

    if (!bankCode || !accountNumber || !accountName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-GO-19",
            message: "Vui lòng nhập đầy đủ thông tin tài khoản nhận tiền (Ngân hàng, STK, Tên tài khoản).",
          },
        },
        { status: 400 }
      );
    }

    // Nội dung chuyển khoản mặc định (BR-GO-13)
    const content = customContent?.trim() || `ORDER ${order.orderCode}`;

    // Sinh link ảnh VietQR (BR-GO-12: không khóa số tiền cố định)
    const qrImageUrl = getVietQrUrl({
      bankCode: bankCode.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      content,
      amount: 0,
    });

    // Thống kê thành viên chưa thanh toán
    const unpaidMembers: Array<{ fullName: string; amount: number }> = [];
    let unpaidAmount = 0;

    const orderMembers = (order as any).members || [];
    const orderItems = (order as any).items || [];

    for (const m of orderMembers) {
      if (m.paymentStatus !== "paid") {
        const userItems = orderItems.filter((it: any) => it.userId === m.userId);
        const memberTotal = userItems.reduce((sum: number, it: any) => sum + (it.totalAmount || 0), 0);
        unpaidAmount += memberTotal;
        unpaidMembers.push({
          fullName: m.user?.staff?.fullName || m.user?.username || "Thành viên",
          amount: memberTotal,
        });
      }
    }

    let telegramSent = false;
    let telegramError: string | null = null;
    let telegramMsgId: string | null = null;

    // Gửi Telegram nếu người dùng chọn
    if (sendTelegram) {
      const leaderName =
        (order as any).createdByUser?.staff?.fullName ||
        (order as any).createdByUser?.username ||
        "Trưởng nhóm";

      const tgResult = await sendPaymentReminderToTelegram({
        groupOrderId: id,
        orderCode: order.orderCode,
        orderTitle: order.title,
        leaderName,
        totalAmount: order.totalAmount,
        unpaidAmount,
        unpaidMembers,
        bankCode,
        accountNumber,
        accountName,
        content,
        qrImageUrl,
      });

      if (tgResult.success) {
        telegramSent = true;
        telegramMsgId = tgResult.messageId || null;
      } else {
        telegramError = tgResult.reason || "Lỗi gửi tin nhắn Telegram.";
      }
    }

    // BR-GO-14: Lưu một bản ghi Payment Reminder riêng
    const reminder = await prisma.groupOrderPaymentReminder.create({
      data: {
        groupOrderId: id,
        createdById: session.userId,
        content,
        bankInfo: JSON.stringify({ bankCode, accountNumber, accountName }),
        qrDataUrl: qrImageUrl,
        unpaidCount: unpaidMembers.length,
        unpaidAmount,
        telegramMessageId: telegramMsgId,
        sentAt: new Date(),
      },
    });

    const actorName = (session as any).fullName || session.username;

    // Ghi nhận Activity Timeline (BR-GO-11)
    await logGroupOrderActivity({
      groupOrderId: id,
      eventCode: "GROUP_ORDER_PAYMENT_REMINDER_SENT",
      actorId: session.userId,
      actorName,
      title: sendTelegram ? "Gửi nhắc thanh toán qua Telegram" : "Tạo QR nhắc thanh toán",
      description: `${actorName} đã tạo QR chuyển khoản (còn thiếu ${unpaidAmount.toLocaleString("vi-VN")}đ từ ${unpaidMembers.length} người)${telegramSent ? " và đã gửi thông báo đến nhóm Telegram." : ""}`,
      metadata: {
        unpaidCount: unpaidMembers.length,
        unpaidAmount,
        telegramSent,
        telegramError,
      },
    });

    return NextResponse.json({
      success: true,
      message: telegramSent
        ? "Đã gửi thông báo nhắc thanh toán kèm mã QR tới nhóm Telegram."
        : "Đã sinh mã QR thanh toán thành công.",
      data: {
        reminder,
        qrImageUrl,
        telegramSent,
        telegramError,
        unpaidCount: unpaidMembers.length,
        unpaidAmount,
        unpaidMembers,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Payment reminder error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo nhắc thanh toán." } },
      { status: 500 }
    );
  }
}
