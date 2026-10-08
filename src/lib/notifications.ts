import prisma from "./prisma";
import { decryptSecret } from "./crypto";

export interface CreateNotificationParams {
  title: string;
  content: string;
  type: "project" | "staff" | "account" | "security" | "system" | "custom";
  severity?: "info" | "success" | "warning" | "important" | "security";
  objectType?: string;
  objectId?: string;
  targetUrl?: string;
  createdById?: string | null;
  actorName?: string | null;
  expiresAt?: Date | null;
}

/**
 * Format date time in Vietnamese format
 */
function formatDateTimeVN(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format message safely for Telegram HTML
 */
function formatTelegramMessage(params: {
  title: string;
  content: string;
  actorName?: string | null;
  targetUrl?: string | null;
  date: Date;
}): string {
  const parts = [
    "🔔 <b>THÔNG BÁO HỆ THỐNG</b>",
    "",
    `📌 <b>${escapeHtml(params.title)}</b>`,
    "",
    escapeHtml(params.content),
    "",
    `👤 <b>Người thực hiện:</b> ${escapeHtml(params.actorName || "Hệ thống")}`,
    `🕐 <b>Thời gian:</b> ${formatDateTimeVN(params.date)}`,
  ];

  if (params.targetUrl) {
    parts.push("");
    parts.push(`🔗 <a href="${escapeHtml(params.targetUrl)}">Xem chi tiết trên hệ thống</a>`);
  }

  return parts.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Test Telegram bot connection and send test message
 */
export async function testTelegramConnection(botToken: string, chatId: string) {
  try {
    const trimmedToken = botToken.trim();
    const trimmedChatId = chatId.trim();

    if (!trimmedToken || !trimmedChatId) {
      return {
        success: false,
        message: "Bot Token và Chat ID không được để trống.",
      };
    }

    const testText = [
      "🔔 <b>THÔNG BÁO HỆ THỐNG PMS</b>",
      "",
      "✅ <b>Kiểm tra kết nối Telegram Bot thành công!</b>",
      "Hệ thống đã kết nối thành công với nhóm và sẵn sàng truyền phát các thông báo tự động.",
      "",
      `🕐 <b>Thời gian:</b> ${formatDateTimeVN(new Date())}`,
    ].join("\n");

    const res = await fetch(`https://api.telegram.org/bot${trimmedToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: trimmedChatId,
        text: testText,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      let desc = data.description || "Lỗi không xác định từ máy chủ Telegram";
      if (desc.toLowerCase().includes("chat not found")) {
        desc = "Không tìm thấy nhóm (chat not found). Vui lòng đảm bảo: 1. Đã thêm Bot vào nhóm; 2. Chat ID của nhóm phải có tiền tố '-' hoặc '-100' (VD: -100xxxxxxxxxx).";
      }
      return {
        success: false,
        message: `Không thể kết nối Telegram: ${desc}`,
      };
    }

    return {
      success: true,
      message: "Đã gửi thông báo kiểm tra đến nhóm Telegram thành công!",
      data: {
        messageId: data.result?.message_id,
        chatTitle: data.result?.chat?.title || "Nhóm Telegram",
      },
    };
  } catch {
    return {
      success: false,
      message: "Không thể kết nối đến máy chủ Telegram. Vui lòng kiểm tra lại đường truyền mạng hoặc cấu hình.",
    };
  }
}

/**
 * Detect available chats that the bot has received messages from via getUpdates
 */
export async function detectTelegramChats(botToken: string) {
  try {
    const trimmedToken = botToken.trim();
    if (!trimmedToken) {
      return { success: false, message: "Bot Token không được để trống." };
    }

    const res = await fetch(`https://api.telegram.org/bot${trimmedToken}/getUpdates`, {
      method: "GET",
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        success: false,
        message: data.description || "Không thể lấy thông tin cập nhật từ Bot.",
      };
    }

    const updates = data.result || [];
    const chatsMap = new Map<string, { id: string; title: string; type: string }>();

    for (const update of updates) {
      const chat = update.message?.chat || update.my_chat_member?.chat || update.channel_post?.chat;
      if (chat && chat.id) {
        const idStr = String(chat.id);
        const title = chat.title || chat.username || `${chat.first_name || ""} ${chat.last_name || ""}`.trim() || "Chat";
        chatsMap.set(idStr, {
          id: idStr,
          title,
          type: chat.type,
        });
      }
    }

    const foundChats = Array.from(chatsMap.values());
    return {
      success: true,
      data: foundChats,
    };
  } catch {
    return {
      success: false,
      message: "Lỗi kết nối tới Telegram khi phát hiện nhóm.",
    };
  }
}

/**
 * Dispatch notification to Telegram Group based on current config
 */
async function dispatchToTelegram(params: {
  notificationId: string;
  type: string;
  title: string;
  content: string;
  actorName?: string | null;
  targetUrl?: string | null;
  date: Date;
}) {
  try {
    const config = await prisma.telegramConfig.findFirst({
      where: { enabled: true },
    });

    if (!config) return;

    // Check notification type filter according to config
    let shouldSend = false;
    if (params.type === "project" && config.notifyProject) shouldSend = true;
    else if (params.type === "staff" && config.notifyStaff) shouldSend = true;
    else if (params.type === "account" && config.notifyAccount) shouldSend = true;
    else if (
      (params.type === "system" || params.type === "security" || params.type === "custom") &&
      config.notifySystem
    )
      shouldSend = true;

    if (!shouldSend) return;

    // Create delivery record in pending status
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: params.notificationId,
        channel: "telegram",
        status: "pending",
      },
    });

    // Decrypt bot token
    let botToken = "";
    try {
      botToken = decryptSecret(config.botTokenEncrypted);
    } catch {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          errorMessage: "Không thể giải mã Bot Token Telegram đã lưu.",
        },
      });
      return;
    }

    const messageText = formatTelegramMessage({
      title: params.title,
      content: params.content,
      actorName: params.actorName,
      targetUrl: params.targetUrl,
      date: params.date,
    });

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: messageText,
        parse_mode: "HTML",
      }),
    });

    const json = await res.json();
    if (res.ok && json.ok) {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          externalMessageId: String(json.result?.message_id || ""),
        },
      });
    } else {
      const errDesc = json.description || "Lỗi không xác định từ Telegram API";
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          errorMessage: errDesc,
        },
      });
    }
  } catch (err: any) {
    console.error("Lỗi khi phân phối thông báo tới Telegram:", err?.message || err);
    // BR-30: Do not throw or interrupt web notifications
  }
}

/**
 * Core function to create system notification and dispatch
 */
export async function createSystemNotification(params: CreateNotificationParams) {
  try {
    const now = new Date();

    // 1. Save Notification to Database
    const notification = await prisma.notification.create({
      data: {
        title: params.title,
        content: params.content,
        type: params.type,
        severity: params.severity || "info",
        objectType: params.objectType || null,
        objectId: params.objectId || null,
        targetUrl: params.targetUrl || null,
        createdById: params.createdById || null,
        expiresAt: params.expiresAt || null,
      },
    });

    // 2. Record Web Feed Delivery
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: "web",
        status: "sent",
        sentAt: now,
      },
    });

    // 3. Dispatch to Telegram (asynchronously, non-blocking)
    dispatchToTelegram({
      notificationId: notification.id,
      type: params.type,
      title: params.title,
      content: params.content,
      actorName: params.actorName,
      targetUrl: params.targetUrl,
      date: now,
    }).catch((err) => {
      console.error("dispatchToTelegram error:", err);
    });

    return notification;
  } catch (error) {
    console.error("Lỗi tạo thông báo hệ thống:", error);
    return null;
  }
}
