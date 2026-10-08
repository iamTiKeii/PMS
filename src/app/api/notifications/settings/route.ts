import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NOTIFICATION_EVENTS } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications/settings - Get all notification event settings
export async function GET() {
  try {
    await requireAuth();

    const dbSettings = await prisma.notificationSetting.findMany();
    const settingsMap = new Map(dbSettings.map((s) => [s.eventCode, s]));

    // Merge default events with saved settings
    const merged = NOTIFICATION_EVENTS.map((evt) => {
      const saved = settingsMap.get(evt.code);
      return {
        eventCode: evt.code,
        name: evt.name,
        category: evt.category,
        description: evt.description,
        feedEnabled: saved ? saved.feedEnabled : evt.defaultFeed,
        telegramEnabled: saved ? saved.telegramEnabled : evt.defaultTelegram,
        scheduleEnabled: saved ? saved.scheduleEnabled : Boolean(evt.scheduleTime),
        scheduleTime: saved?.scheduleTime || evt.scheduleTime || null,
        remindBeforeDays: saved?.remindBeforeDays ?? 1,
        skipWeekends: saved ? saved.skipWeekends : true,
        skipHolidays: saved ? saved.skipHolidays : true,
        enabled: saved ? saved.enabled : true,
        updatedAt: saved?.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: merged,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải cấu hình thông báo." } },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/settings - Update notification settings (Admin)
export async function PUT(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Dữ liệu cấu hình không hợp lệ." } },
        { status: 400 }
      );
    }

    // Upsert each setting
    for (const item of settings) {
      if (!item.eventCode) continue;

      await prisma.notificationSetting.upsert({
        where: { eventCode: item.eventCode },
        update: {
          feedEnabled: Boolean(item.feedEnabled),
          telegramEnabled: Boolean(item.telegramEnabled),
          scheduleEnabled: Boolean(item.scheduleEnabled),
          scheduleTime: item.scheduleTime || null,
          remindBeforeDays: item.remindBeforeDays !== undefined ? Number(item.remindBeforeDays) : 1,
          skipWeekends: item.skipWeekends !== undefined ? Boolean(item.skipWeekends) : true,
          skipHolidays: item.skipHolidays !== undefined ? Boolean(item.skipHolidays) : true,
          enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
          updatedBy: session.username,
        },
        create: {
          eventCode: item.eventCode,
          feedEnabled: Boolean(item.feedEnabled),
          telegramEnabled: Boolean(item.telegramEnabled),
          scheduleEnabled: Boolean(item.scheduleEnabled),
          scheduleTime: item.scheduleTime || null,
          remindBeforeDays: item.remindBeforeDays !== undefined ? Number(item.remindBeforeDays) : 1,
          skipWeekends: item.skipWeekends !== undefined ? Boolean(item.skipWeekends) : true,
          skipHolidays: item.skipHolidays !== undefined ? Boolean(item.skipHolidays) : true,
          enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
          updatedBy: session.username,
        },
      });
    }

    await recordAuditLog({
      userId: session.userId,
      actionCode: "NOTIFICATION_SETTINGS_UPDATED",
      targetEntity: "notification_settings",
      contextJson: { updatedCount: settings.length },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật ma trận cấu hình thông báo thành công!",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Chỉ Admin mới có quyền cấu hình thông báo." } },
        { status: 403 }
      );
    }
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi lưu cấu hình thông báo." } },
      { status: 500 }
    );
  }
}
