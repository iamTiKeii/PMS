import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

// Danh sách ngân hàng phổ biến tại Việt Nam hỗ trợ Napas 24/7 & VietQR
export const VIETNAM_BANKS = [
  { code: "MB", shortName: "MBBank", name: "Ngân hàng Quân Đội" },
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng Ngoại Thương Việt Nam" },
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng Kỹ Thương Việt Nam" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng Việt Nam Thịnh Vượng" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng Á Châu" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng Đầu tư và Phát triển Việt Nam" },
  { code: "CTG", shortName: "VietinBank", name: "Ngân hàng Công Thương Việt Nam" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng Tiên Phong" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng Sài Gòn Thương Tín" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng Phát triển TP.HCM" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng Quốc Tế" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng Sài Gòn - Hà Nội" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng Lộc Phát Việt Nam" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng Hàng Hải" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng Phương Đông" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng Đông Nam Á" },
  { code: "ABB", shortName: "ABBANK", name: "Ngân hàng An Bình" },
  { code: "BAB", shortName: "BacABank", name: "Ngân hàng Bắc Á" },
  { code: "NAB", shortName: "NamABank", name: "Ngân hàng Nam Á" },
  { code: "BVB", shortName: "BVBank", name: "Ngân hàng Bản Việt" },
  { code: "VIETBANK", shortName: "VietBank", name: "Ngân hàng Việt Nam Thương Tín" },
  { code: "VCCB", shortName: "Bản Việt", name: "Ngân hàng TMCP Bản Việt" },
];

/**
 * Sinh link ảnh QR VietQR chuẩn Napas 24/7 (BR-GO-12: Không khóa số tiền cố định)
 */
export function getVietQrUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  content: string;
  amount?: number;
}): string {
  const { bankCode, accountNumber, accountName, content, amount = 0 } = params;
  const cleanBank = encodeURIComponent(bankCode.trim());
  const cleanAcc = encodeURIComponent(accountNumber.trim().replace(/\s+/g, ""));
  const encodedContent = encodeURIComponent(content.trim());
  const encodedName = encodeURIComponent(accountName.trim());

  // Template compact2 hiển thị logo ngân hàng và thông tin tài khoản chuyên nghiệp
  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-compact2.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
}

export type GroupOrderEventCode =
  | "GROUP_ORDER_CREATED"
  | "GROUP_ORDER_ITEM_ADDED"
  | "GROUP_ORDER_ITEM_UPDATED"
  | "GROUP_ORDER_ITEM_REMOVED"
  | "GROUP_ORDER_CLOSED"
  | "GROUP_ORDER_PRICE_UPDATED"
  | "GROUP_ORDER_PAYMENT_REMINDER_SENT"
  | "GROUP_ORDER_MEMBER_PAID"
  | "GROUP_ORDER_MEMBER_UNPAID"
  | "GROUP_ORDER_COMPLETED";

export interface LogGroupOrderActivityParams {
  groupOrderId: string;
  eventCode: GroupOrderEventCode;
  actorId?: string | null;
  actorName?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  eventTime?: Date;
}

/**
 * Ghi nhận Activity Timeline cho Đơn đặt nhóm (BR-GO-11)
 */
export async function logGroupOrderActivity(params: LogGroupOrderActivityParams) {
  try {
    const {
      groupOrderId,
      eventCode,
      actorId = null,
      actorName = "Hệ thống",
      title,
      description = null,
      metadata = null,
      eventTime = new Date(),
    } = params;

    return await prisma.groupOrderActivity.create({
      data: {
        groupOrderId,
        eventCode,
        actorId,
        actorName,
        title,
        description,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
        eventTime,
      },
    });
  } catch (error) {
    console.error("Failed to log group order activity:", error);
    return null;
  }
}

/**
 * Tính lại tổng tiền của toàn bộ đơn đặt nhóm (BR-GO-08)
 */
export async function recalculateGroupOrderTotal(groupOrderId: string) {
  try {
    const items = await prisma.groupOrderItem.findMany({
      where: { groupOrderId },
      select: { totalAmount: true },
    });

    const total = items.reduce((sum, it) => sum + (it.totalAmount || 0), 0);

    await prisma.groupOrder.update({
      where: { id: groupOrderId },
      data: { totalAmount: total },
    });

    return total;
  } catch (error) {
    console.error("Error recalculating group order total:", error);
    return 0;
  }
}

/**
 * Kiểm tra xem tất cả thành viên đã thanh toán chưa, nếu đã thanh toán 100% thì tự chuyển sang COMPLETED
 */
export async function checkAndAutoSetCompleted(groupOrderId: string, actorName = "Hệ thống") {
  try {
    const members = await prisma.groupOrderMember.findMany({
      where: { groupOrderId },
      select: { paymentStatus: true },
    });

    if (members.length === 0) return false;

    const allPaid = members.every((m) => m.paymentStatus === "paid");
    if (allPaid) {
      const order = await prisma.groupOrder.findUnique({
        where: { id: groupOrderId },
        select: { status: true, title: true, orderCode: true },
      });

      if (order && order.status !== "completed") {
        await prisma.groupOrder.update({
          where: { id: groupOrderId },
          data: { status: "completed" },
        });

        await logGroupOrderActivity({
          groupOrderId,
          eventCode: "GROUP_ORDER_COMPLETED",
          actorName,
          title: "Đơn đặt nhóm hoàn tất",
          description: `Tất cả ${members.length} thành viên đã thanh toán đầy đủ. Đơn chuyển sang trạng thái Hoàn tất.`,
          metadata: { totalMembers: members.length },
        });

        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking auto complete:", error);
    return false;
  }
}

/**
 * Gửi tin nhắn nhắc thanh toán kèm ảnh QR VietQR đến Telegram Group
 */
export async function sendPaymentReminderToTelegram(params: {
  groupOrderId: string;
  orderCode: string;
  orderTitle: string;
  leaderName: string;
  totalAmount: number;
  unpaidAmount: number;
  unpaidMembers: Array<{ fullName: string; amount: number }>;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  content: string;
  qrImageUrl: string;
}) {
  try {
    const config = await prisma.telegramConfig.findFirst();
    if (!config || !config.enabled) {
      return { success: false, reason: "Telegram Bot chưa được kích hoạt hoặc chưa cấu hình." };
    }

    const botToken = decryptSecret(config.botTokenEncrypted);
    const chatId = config.chatId;

    if (!botToken || !chatId) {
      return { success: false, reason: "Thiếu Bot Token hoặc Chat ID trong cấu hình Telegram." };
    }

    const formatMoney = (n: number) => n.toLocaleString("vi-VN") + "đ";

    // Danh sách thành viên chưa thanh toán
    const memberLines = params.unpaidMembers
      .map((m) => ` • <b>${m.fullName}</b>: ${formatMoney(m.amount)}`)
      .join("\n");

    const messageHtml = `🍜 <b>NHẮC THANH TOÁN ORDER</b>
━━━━━━━━━━━━━━━━━━
📋 <b>Đơn:</b> ${params.orderTitle} (${params.orderCode})
👑 <b>Trưởng nhóm:</b> ${params.leaderName}
💰 <b>Tổng đơn:</b> ${formatMoney(params.totalAmount)}
💳 <b>Còn cần thu:</b> <b>${formatMoney(params.unpaidAmount)}</b>

👥 <b>Danh sách chưa thanh toán (${params.unpaidMembers.length} người):</b>
${memberLines || " (Đã thanh toán đủ)"}

🏦 <b>Thông tin tài khoản nhận tiền:</b>
 • Ngân hàng: <b>${params.bankCode}</b>
 • Số tài khoản: <code>${params.accountNumber}</code>
 • Tên tài khoản: <b>${params.accountName}</b>
 • Cú pháp chuyển khoản: <code>${params.content}</code>

📌 <i>Vui lòng quét mã QR bên dưới hoặc chuyển khoản cho trưởng nhóm. Cảm ơn mọi người!</i>`;

    // Gọi Telegram Bot API sendPhoto (gửi ảnh kèm caption định dạng HTML)
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: params.qrImageUrl,
        caption: messageHtml,
        parse_mode: "HTML",
      }),
    });

    const json = await telegramRes.json();
    if (!json.ok) {
      console.error("Telegram sendPhoto failed:", json);
      // Fallback gửi text qua sendMessage nếu gửi ảnh bị lỗi
      const fallbackRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${messageHtml}\n\n📷 <i>Link mã QR thanh toán:</i> ${params.qrImageUrl}`,
          parse_mode: "HTML",
        }),
      });
      const fallbackJson = await fallbackRes.json();
      if (!fallbackJson.ok) {
        return { success: false, reason: json.description || "Lỗi Telegram API." };
      }
      return { success: true, messageId: fallbackJson.result?.message_id?.toString() };
    }

    return { success: true, messageId: json.result?.message_id?.toString() };
  } catch (error: any) {
    console.error("Error sending payment reminder to Telegram:", error);
    return { success: false, reason: error.message };
  }
}
