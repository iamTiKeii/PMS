import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const config = await prisma.telegramConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!config) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Mask bot token for security (BR-31)
    let tokenPreview = "";
    try {
      const decrypted = decryptSecret(config.botTokenEncrypted);
      tokenPreview = decrypted.length > 8 ? `••••••••••••${decrypted.slice(-6)}` : "••••••••••••";
    } catch {
      tokenPreview = "••••••••••••";
    }

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        botName: config.botName,
        tokenPreview,
        chatId: config.chatId,
        chatName: config.chatName,
        enabled: config.enabled,
        notifyProject: config.notifyProject,
        notifyStaff: config.notifyStaff,
        notifyAccount: config.notifyAccount,
        notifySystem: config.notifySystem,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền truy cập cấu hình Telegram." } },
        { status: 403 }
      );
    }
    console.error("GET /api/telegram/config error:", err);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải cấu hình Telegram." } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["admin"]);
    const body = await req.json();

    const {
      botName,
      botToken,
      chatId,
      chatName,
      enabled = true,
      notifyProject = true,
      notifyStaff = true,
      notifyAccount = true,
      notifySystem = true,
    } = body;

    if (!chatId || !String(chatId).trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Chat ID của nhóm Telegram không được để trống." } },
        { status: 400 }
      );
    }

    const existing = await prisma.telegramConfig.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If botToken is empty, keep existing encrypted token if available
    let botTokenEncrypted = "";
    if (botToken && String(botToken).trim()) {
      botTokenEncrypted = encryptSecret(String(botToken).trim());
    } else if (existing && existing.botTokenEncrypted) {
      botTokenEncrypted = existing.botTokenEncrypted;
    } else {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Bot Token không được để trống khi thiết lập lần đầu." } },
        { status: 400 }
      );
    }

    let savedConfig;
    if (existing) {
      savedConfig = await prisma.telegramConfig.update({
        where: { id: existing.id },
        data: {
          botName: botName ? String(botName).trim() : null,
          botTokenEncrypted,
          chatId: String(chatId).trim(),
          chatName: chatName ? String(chatName).trim() : null,
          enabled: Boolean(enabled),
          notifyProject: Boolean(notifyProject),
          notifyStaff: Boolean(notifyStaff),
          notifyAccount: Boolean(notifyAccount),
          notifySystem: Boolean(notifySystem),
        },
      });
    } else {
      savedConfig = await prisma.telegramConfig.create({
        data: {
          botName: botName ? String(botName).trim() : null,
          botTokenEncrypted,
          chatId: String(chatId).trim(),
          chatName: chatName ? String(chatName).trim() : null,
          enabled: Boolean(enabled),
          notifyProject: Boolean(notifyProject),
          notifyStaff: Boolean(notifyStaff),
          notifyAccount: Boolean(notifyAccount),
          notifySystem: Boolean(notifySystem),
        },
      });
    }

    // Safe audit logging (BR-31, non-blocking)
    await recordAuditLog({
      userId: user.userId,
      actionCode: "CONFIG_TELEGRAM",
      targetEntity: "TELEGRAM_CONFIG",
      targetEntityId: savedConfig.id,
      contextJson: {
        chatId: savedConfig.chatId,
        chatName: savedConfig.chatName,
        enabled: savedConfig.enabled,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình Telegram thành công.",
      data: {
        id: savedConfig.id,
        chatId: savedConfig.chatId,
        chatName: savedConfig.chatName,
        enabled: savedConfig.enabled,
      },
    });
  } catch (err: any) {
    console.error("POST /api/telegram/config error:", err);
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện chức năng này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MSG-500",
          message: "Lỗi lưu cấu hình Telegram.",
          details: err?.message || String(err),
        },
      },
      { status: 500 }
    );
  }
}

