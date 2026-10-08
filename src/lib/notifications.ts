import prisma from "./prisma";
import { decryptSecret } from "./crypto";
import { logRequestActivity } from "./request-activities";

export interface CreateNotificationParams {
  eventCode?: string;
  title: string;
  content: string;
  type?: "project" | "staff" | "account" | "security" | "system" | "request" | "reminder" | "attendance" | "custom";
  severity?: "info" | "success" | "warning" | "important" | "security";
  objectType?: string;
  objectId?: string;
  targetUrl?: string;
  createdById?: string | null;
  actorName?: string | null;
  expiresAt?: Date | null;
  telegramCustomMessage?: string;
}

export interface NotificationEventDefinition {
  code: string;
  name: string;
  category: "SYS" | "PROJECT" | "REQUEST" | "REMINDER" | "ATTENDANCE" | "SECURITY" | "STAFF" | "ACCOUNT";
  defaultFeed: boolean;
  defaultTelegram: boolean;
  scheduleTime?: string;
  description?: string;
}

// 13.3 & 13.14: Danh mục sự kiện thông báo chuẩn
export const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  // Nhóm QLYC (REQUEST & REMINDER)
  {
    code: "REQUEST_CREATED",
    name: "Tạo mới QLYC",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi một yêu cầu phát sinh mới được tạo trên dự án",
  },
  {
    code: "REQUEST_ASSIGNED",
    name: "Được phân công theo dõi QLYC",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Khi nhân sự được thêm vào danh sách theo dõi yêu cầu",
  },
  {
    code: "REQUEST_DUE_SOON",
    name: "QLYC sắp đến hạn",
    category: "REMINDER",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Nhắc nhở yêu cầu sắp đến hạn hoàn thành (trước 1–3 ngày)",
  },
  {
    code: "REQUEST_DUE_TODAY",
    name: "QLYC đến hạn hôm nay",
    category: "REMINDER",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Cảnh báo yêu cầu đến hạn hoàn thành trong ngày hôm nay",
  },
  {
    code: "REQUEST_OVERDUE",
    name: "QLYC quá hạn xử lý",
    category: "REMINDER",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Cảnh báo yêu cầu đã quá hạn hoàn thành",
  },
  {
    code: "REQUEST_COMPLETED",
    name: "QLYC hoàn thành",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi yêu cầu được đánh dấu hoàn thành",
  },
  {
    code: "REQUEST_UPDATED",
    name: "Cập nhật QLYC",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi thông tin yêu cầu được chỉnh sửa",
  },
  {
    code: "REQUEST_REOPENED",
    name: "QLYC được mở lại (Re-open)",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Khi một yêu cầu đã đóng được mở lại để xử lý tiếp",
  },
  {
    code: "REQUEST_DELETED",
    name: "Xóa QLYC",
    category: "REQUEST",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi một yêu cầu bị xóa mềm",
  },

  // Nhóm Dự án (PROJECT)
  {
    code: "PROJECT_CREATED",
    name: "Tạo mới dự án",
    category: "PROJECT",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi khởi tạo một dự án mới trên hệ thống",
  },
  {
    code: "PROJECT_UPDATED",
    name: "Cập nhật dự án",
    category: "PROJECT",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi cập nhật thông tin dự án hoặc link HIS",
  },
  {
    code: "PROJECT_STAFF_CHANGED",
    name: "Thay đổi nhân sự phụ trách dự án",
    category: "PROJECT",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Khi phân công lại Lead kỹ thuật (L1), PM (L2) hoặc Director (L3)",
  },
  {
    code: "PROJECT_DELETED",
    name: "Xóa / ngừng dự án",
    category: "PROJECT",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi dự án bị xóa hoặc chuyển trạng thái đóng",
  },

  // Nhóm Chấm công (ATTENDANCE)
  {
    code: "ATTENDANCE_MORNING",
    name: "Nhắc chấm công buổi sáng",
    category: "ATTENDANCE",
    defaultFeed: true,
    defaultTelegram: true,
    scheduleTime: "07:50",
    description: "Nhắc nhở chấm công đầu ngày (mặc định 07:50)",
  },
  {
    code: "ATTENDANCE_EVENING",
    name: "Nhắc chấm công buổi chiều",
    category: "ATTENDANCE",
    defaultFeed: true,
    defaultTelegram: true,
    scheduleTime: "17:35",
    description: "Nhắc nhở chấm công cuối ngày (mặc định 17:35)",
  },

  // Nhóm Nhân sự & Tài khoản site (STAFF / ACCOUNT)
  {
    code: "STAFF_CREATED",
    name: "Thêm nhân sự mới",
    category: "STAFF",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi tiếp nhận nhân sự mới vào hệ thống",
  },
  {
    code: "STAFF_UPDATED",
    name: "Cập nhật hồ sơ nhân sự",
    category: "STAFF",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi sửa đổi thông tin nhân sự",
  },
  {
    code: "STAFF_LEFT",
    name: "Nhân sự nghỉ việc",
    category: "STAFF",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Cảnh báo khi nhân sự chuyển trạng thái đã nghỉ việc",
  },
  {
    code: "ACCOUNT_CREATED",
    name: "Cấp phát tài khoản site dự án",
    category: "ACCOUNT",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi tạo tài khoản đăng nhập site mới trong két",
  },
  {
    code: "ACCOUNT_STOPPED",
    name: "Ngừng tài khoản site dự án",
    category: "ACCOUNT",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi khóa hoặc ngừng sử dụng tài khoản site",
  },

  // Nhóm Hệ thống & Bảo mật (SYS / SECURITY)
  {
    code: "SYSTEM_ANNOUNCEMENT",
    name: "Thông báo hệ thống",
    category: "SYS",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Thông báo chung từ Ban Quản trị tới toàn thể người dùng",
  },
  {
    code: "SYSTEM_MAINTENANCE",
    name: "Bảo trì hệ thống",
    category: "SYS",
    defaultFeed: true,
    defaultTelegram: true,
    description: "Thông báo lịch bảo trì, nâng cấp phần mềm",
  },
  {
    code: "USER_LOCKED",
    name: "Khóa tài khoản bảo mật",
    category: "SECURITY",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi tài khoản bị khóa do đăng nhập sai nhiều lần",
  },
  {
    code: "PASSWORD_CHANGED",
    name: "Đổi mật khẩu tài khoản",
    category: "SECURITY",
    defaultFeed: true,
    defaultTelegram: false,
    description: "Khi người dùng thực hiện đổi mật khẩu",
  },
];

/**
 * Format date time in Vietnamese format
 */
export function formatDateTimeVN(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Format message safely for Telegram HTML
 */
function formatTelegramMessage(params: {
  eventCode?: string;
  title: string;
  content: string;
  actorName?: string | null;
  targetUrl?: string | null;
  date: Date;
}): string {
  const code = params.eventCode || "";
  let icon = "🔔";

  if (code.includes("REQUEST")) icon = "📋";
  else if (code.includes("ATTENDANCE")) icon = "⏰";
  else if (code.includes("OVERDUE") || code.includes("LOCKED")) icon = "⚠️";
  else if (code.includes("PROJECT")) icon = "📁";
  else if (code.includes("SECURITY")) icon = "🛡️";

  const parts = [
    `${icon} <b>THÔNG BÁO HỆ THỐNG PMS</b>`,
    "",
    `📌 <b>${escapeHtml(params.title)}</b>`,
    "",
    escapeHtml(params.content),
    "",
    `👤 <b>Người thực hiện:</b> ${escapeHtml(params.actorName || "Hệ thống")}`,
    `🕐 <b>Thời gian:</b> ${formatDateTimeVN(params.date)}`,
  ];

  if (params.targetUrl) {
    const fullUrl = params.targetUrl.startsWith("http")
      ? params.targetUrl
      : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${params.targetUrl}`;
    parts.push("");
    parts.push(`🔗 <a href="${escapeHtml(fullUrl)}">Xem chi tiết trên hệ thống ↗</a>`);
  }

  return parts.join("\n");
}

/**
 * Dispatch message to Telegram Group
 */
async function dispatchToTelegram(params: {
  notificationId: string;
  eventCode?: string;
  title: string;
  content: string;
  actorName?: string | null;
  targetUrl?: string | null;
  date: Date;
  customMessage?: string;
}) {
  try {
    const config = await prisma.telegramConfig.findFirst({
      where: { enabled: true },
    });

    if (!config || !config.chatId || !config.botTokenEncrypted) return;

    // Create delivery record in pending status
    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: params.notificationId,
        channel: "telegram",
        status: "pending",
      },
    });

    let botToken = "";
    try {
      botToken = decryptSecret(config.botTokenEncrypted);
    } catch {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          errorMessage: "Không thể giải mã Bot Token Telegram.",
        },
      });
      return;
    }

    const messageText =
      params.customMessage ||
      formatTelegramMessage({
        eventCode: params.eventCode,
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
        disable_web_page_preview: false,
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
  }
}

/**
 * 13.2 Core Notification Engine: One event -> One notification -> Multiple channels
 */
export async function createSystemNotification(params: CreateNotificationParams) {
  try {
    const now = new Date();
    const eventCode = params.eventCode || "SYSTEM_ANNOUNCEMENT";

    // 1. Check Notification Setting for this event
    let feedEnabled = true;
    let telegramEnabled = false;

    const setting = await prisma.notificationSetting.findUnique({
      where: { eventCode },
    });

    if (setting) {
      feedEnabled = setting.enabled && setting.feedEnabled;
      telegramEnabled = setting.enabled && setting.telegramEnabled;
    } else {
      const def = NOTIFICATION_EVENTS.find((e) => e.code === eventCode);
      if (def) {
        feedEnabled = def.defaultFeed;
        telegramEnabled = def.defaultTelegram;
      }
    }

    // Determine type
    const inferredType =
      params.type ||
      (eventCode.startsWith("REQUEST")
        ? "request"
        : eventCode.startsWith("PROJECT")
        ? "project"
        : eventCode.startsWith("ATTENDANCE")
        ? "attendance"
        : eventCode.startsWith("STAFF")
        ? "staff"
        : eventCode.startsWith("ACCOUNT")
        ? "account"
        : eventCode.startsWith("SECURITY")
        ? "security"
        : "system");

    // 2. Save Notification to Database (Feed)
    let notification = null;
    if (feedEnabled) {
      notification = await prisma.notification.create({
        data: {
          eventCode,
          title: params.title,
          content: params.content,
          type: inferredType,
          severity: params.severity || "info",
          objectType: params.objectType || null,
          objectId: params.objectId || null,
          targetUrl: params.targetUrl || null,
          createdById: params.createdById || null,
          expiresAt: params.expiresAt || null,
        },
      });

      // Record Web Feed Delivery
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: "web",
          status: "sent",
          sentAt: now,
        },
      });
    }

    // 3. Dispatch to Telegram (Asynchronous & Non-blocking)
    if (telegramEnabled) {
      const notifId = notification?.id || "temp_" + Date.now();
      dispatchToTelegram({
        notificationId: notifId,
        eventCode,
        title: params.title,
        content: params.content,
        actorName: params.actorName,
        targetUrl: params.targetUrl,
        date: now,
        customMessage: params.telegramCustomMessage,
      }).catch((err) => {
        console.error("dispatchToTelegram error:", err);
      });
    }

    return notification;
  } catch (error) {
    console.error("Lỗi Notification Engine:", error);
    return null;
  }
}

/**
 * 13.5 Check and dispatch QLYC due reminders (Chống gửi trùng)
 */
export async function checkAndDispatchDueReminders() {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Lấy cài đặt nhắc nhở
    const settingSoon = await prisma.notificationSetting.findUnique({
      where: { eventCode: "REQUEST_DUE_SOON" },
    });
    const remindBeforeDays = settingSoon?.remindBeforeDays || 1;

    // Lấy các QLYC chưa đóng, chưa xóa mềm và có dueDate
    const activeRequests = await prisma.projectRequest.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ["completed", "closed", "cancelled"] },
        dueDate: { not: null },
      },
      include: {
        project: { select: { id: true, projectName: true, projectCode: true } },
        requester: { select: { fullName: true } },
        receiver: { select: { fullName: true } },
        followers: { include: { staff: { select: { fullName: true } } } },
      },
    });

    const results: string[] = [];

    for (const req of activeRequests) {
      if (!req.dueDate) continue;

      const due = new Date(req.dueDate);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const followersNames = req.followers.map((f) => f.staff.fullName).join(", ") || "Chưa có";

      // 1. Quá hạn
      if (diffDays < 0) {
        const reminderType = "OVERDUE";
        const alreadySent = await prisma.reminderLog.findUnique({
          where: {
            reminderType_referenceId_targetDate: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          },
        });

        if (!alreadySent) {
          const daysOver = Math.abs(diffDays);
          const title = `⚠️ QLYC quá hạn: ${req.requestCode}`;
          const content = `Dự án: ${req.project.projectName}\nMã: ${req.requestCode}\nNgười yêu cầu: ${req.requester?.fullName || req.requesterName || "N/A"}\nDue Date: ${formatDateTimeVN(due)}\nĐã quá hạn: ${daysOver} ngày\nNgười theo dõi: ${followersNames}`;

          await createSystemNotification({
            eventCode: "REQUEST_OVERDUE",
            title,
            content,
            type: "reminder",
            severity: "warning",
            objectType: "project_request",
            objectId: req.id,
            targetUrl: `/projects/${req.projectId}`,
          });

          // Ghi nhận Activity Timeline cho QLYC (Mục 13 & Mục 6: 1 lần khi chuyển sang quá hạn)
          const existingOverdueAct = await prisma.projectRequestActivity.findFirst({
            where: { requestId: req.id, eventCode: "REQUEST_OVERDUE" },
          });
          if (!existingOverdueAct) {
            await logRequestActivity({
              requestId: req.id,
              eventCode: "REQUEST_OVERDUE",
              actorName: "Hệ thống",
              title: "QLYC quá hạn",
              description: `QLYC đã quá hạn xử lý ${daysOver} ngày (Hạn: ${formatDateTimeVN(due)}).`,
              metadata: { days_overdue: daysOver, due_date: due },
            });
          }

          await prisma.reminderLog.create({
            data: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          });
          results.push(`Đã gửi cảnh báo quá hạn cho ${req.requestCode}`);
        }
      }
      // 2. Đến hạn hôm nay
      else if (diffDays === 0) {
        const reminderType = "DUE_TODAY";
        const alreadySent = await prisma.reminderLog.findUnique({
          where: {
            reminderType_referenceId_targetDate: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          },
        });

        if (!alreadySent) {
          const title = `🔔 QLYC đến hạn hôm nay: ${req.requestCode}`;
          const content = `Dự án: ${req.project.projectName}\nMã: ${req.requestCode}\nNgười yêu cầu: ${req.requester?.fullName || req.requesterName || "N/A"}\nDue Date: Hôm nay (${formatDateTimeVN(due)})\nNgười theo dõi: ${followersNames}`;

          await createSystemNotification({
            eventCode: "REQUEST_DUE_TODAY",
            title,
            content,
            type: "reminder",
            severity: "important",
            objectType: "project_request",
            objectId: req.id,
            targetUrl: `/projects/${req.projectId}`,
          });

          // Ghi nhận Activity Timeline cho QLYC
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const existingTodayAct = await prisma.projectRequestActivity.findFirst({
            where: {
              requestId: req.id,
              eventCode: "REQUEST_DUE_TODAY",
              eventTime: { gte: startOfToday },
            },
          });
          if (!existingTodayAct) {
            await logRequestActivity({
              requestId: req.id,
              eventCode: "REQUEST_DUE_TODAY",
              actorName: "Hệ thống",
              title: "QLYC đến hạn",
              description: `QLYC đã đến hạn xử lý trong hôm nay.`,
              metadata: { due_date: due },
            });
          }

          await prisma.reminderLog.create({
            data: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          });
          results.push(`Đã gửi thông báo đến hạn hôm nay cho ${req.requestCode}`);
        }
      }
      // 3. Sắp đến hạn (trước remindBeforeDays ngày)
      else if (diffDays > 0 && diffDays <= remindBeforeDays) {
        const reminderType = `DUE_SOON_${diffDays}D`;
        const alreadySent = await prisma.reminderLog.findUnique({
          where: {
            reminderType_referenceId_targetDate: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          },
        });

        if (!alreadySent) {
          const title = `🔔 QLYC sắp đến hạn: ${req.requestCode}`;
          const content = `Dự án: ${req.project.projectName}\nMã: ${req.requestCode}\nNgười yêu cầu: ${req.requester?.fullName || req.requesterName || "N/A"}\nDue Date: ${formatDateTimeVN(due)} (Còn ${diffDays} ngày)\nNgười theo dõi: ${followersNames}`;

          await createSystemNotification({
            eventCode: "REQUEST_DUE_SOON",
            title,
            content,
            type: "reminder",
            severity: "info",
            objectType: "project_request",
            objectId: req.id,
            targetUrl: `/projects/${req.projectId}`,
          });

          // Ghi nhận Activity Timeline cho QLYC
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const existingSoonAct = await prisma.projectRequestActivity.findFirst({
            where: {
              requestId: req.id,
              eventCode: "REQUEST_DUE_SOON",
              eventTime: { gte: startOfToday },
            },
          });
          if (!existingSoonAct) {
            await logRequestActivity({
              requestId: req.id,
              eventCode: "REQUEST_DUE_SOON",
              actorName: "Hệ thống",
              title: "Sắp đến hạn xử lý",
              description: `QLYC còn ${diffDays} ngày đến hạn xử lý.`,
              metadata: { days_remaining: diffDays, due_date: due },
            });
          }

          await prisma.reminderLog.create({
            data: {
              reminderType,
              referenceId: req.id,
              targetDate: todayStr,
            },
          });
          results.push(`Đã gửi nhắc sắp đến hạn cho ${req.requestCode}`);
        }
      }
    }

    return { success: true, count: results.length, details: results };
  } catch (err: any) {
    console.error("Error in checkAndDispatchDueReminders:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 13.7 Check and dispatch attendance reminders (Sáng 07:50, Chiều 17:35, múi giờ VN)
 */
export async function checkAndDispatchAttendanceReminders(forceType?: "morning" | "evening") {
  try {
    const now = new Date();
    // Chuyển giờ theo Asia/Ho_Chi_Minh
    const vnDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }); // YYYY-MM-DD
    const vnTimeStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }); // HH:mm
    const dayOfWeek = new Date(vnDateStr).getDay(); // 0: CN, 6: T7

    // 1. Nhắc chấm công buổi sáng
    if (forceType === "morning" || (!forceType && vnTimeStr >= "07:50" && vnTimeStr <= "08:15")) {
      const morningSetting = await prisma.notificationSetting.findUnique({
        where: { eventCode: "ATTENDANCE_MORNING" },
      });

      const skipWeekends = morningSetting?.skipWeekends ?? true;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!forceType && isWeekend && skipWeekends) {
        // Bỏ qua ngày nghỉ cuối tuần
      } else {
        const reminderType = "ATTENDANCE_MORNING";
        const alreadySent = await prisma.reminderLog.findUnique({
          where: {
            reminderType_referenceId_targetDate: {
              reminderType,
              referenceId: "ATTENDANCE",
              targetDate: vnDateStr,
            },
          },
        });

        if (!alreadySent || forceType) {
          await createSystemNotification({
            eventCode: "ATTENDANCE_MORNING",
            title: "⏰ NHẮC CHẤM CÔNG ĐẦU NGÀY",
            content: "Đã đến giờ chấm công buổi sáng. Vui lòng kiểm tra và thực hiện chấm công đúng giờ trên hệ thống.",
            type: "attendance",
            severity: "info",
            targetUrl: "/profile",
          });

          if (!alreadySent) {
            await prisma.reminderLog.create({
              data: {
                reminderType,
                referenceId: "ATTENDANCE",
                targetDate: vnDateStr,
              },
            });
          }
          return { success: true, message: "Đã gửi nhắc chấm công buổi sáng." };
        }
      }
    }

    // 2. Nhắc chấm công buổi chiều
    if (forceType === "evening" || (!forceType && vnTimeStr >= "17:35" && vnTimeStr <= "18:00")) {
      const eveningSetting = await prisma.notificationSetting.findUnique({
        where: { eventCode: "ATTENDANCE_EVENING" },
      });

      const skipWeekends = eveningSetting?.skipWeekends ?? true;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!forceType && isWeekend && skipWeekends) {
        // Bỏ qua
      } else {
        const reminderType = "ATTENDANCE_EVENING";
        const alreadySent = await prisma.reminderLog.findUnique({
          where: {
            reminderType_referenceId_targetDate: {
              reminderType,
              referenceId: "ATTENDANCE",
              targetDate: vnDateStr,
            },
          },
        });

        if (!alreadySent || forceType) {
          await createSystemNotification({
            eventCode: "ATTENDANCE_EVENING",
            title: "⏰ NHẮC CHẤM CÔNG CUỐI NGÀY",
            content: "Đã đến giờ chấm công cuối ngày. Vui lòng kiểm tra và thực hiện checkout chấm công trước khi ra về.",
            type: "attendance",
            severity: "info",
            targetUrl: "/profile",
          });

          if (!alreadySent) {
            await prisma.reminderLog.create({
              data: {
                reminderType,
                referenceId: "ATTENDANCE",
                targetDate: vnDateStr,
              },
            });
          }
          return { success: true, message: "Đã gửi nhắc chấm công buổi chiều." };
        }
      }
    }

    return { success: true, message: "Chưa tới khung giờ hoặc đã gửi trước đó." };
  } catch (err: any) {
    console.error("Error in checkAndDispatchAttendanceReminders:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Test Telegram bot connection and send test message (SRS 13.9)
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
      "Hệ thống đã kết nối thành công với nhóm và sẵn sàng truyền phát các thông báo tự động (QLYC, Dự án, Chấm công).",
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
