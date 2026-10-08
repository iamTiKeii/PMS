import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { testTelegramConnection } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();

    let { botToken, chatId } = body;

    // If botToken is empty, try using currently saved token from database
    if (!botToken || !botToken.trim()) {
      const config = await prisma.telegramConfig.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (config && config.botTokenEncrypted) {
        try {
          botToken = decryptSecret(config.botTokenEncrypted);
        } catch {
          return NextResponse.json(
            { success: false, error: { code: "MSG-82", message: "Không thể giải mã Bot Token đã lưu trong hệ thống." } },
            { status: 400 }
          );
        }
      }
    }

    if (!chatId || !chatId.trim()) {
      const config = await prisma.telegramConfig.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (config) {
        chatId = config.chatId;
      }
    }

    if (!botToken || !botToken.trim() || !chatId || !chatId.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập Bot Token và Chat ID để kiểm tra kết nối." } },
        { status: 400 }
      );
    }

    const result = await testTelegramConnection(botToken.trim(), chatId.trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-82", message: result.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kết nối Telegram thành công! Đã gửi tin nhắn kiểm tra đến nhóm.",
      data: result.data,
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện chức năng này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-82", message: "Không thể kết nối Telegram. Vui lòng kiểm tra lại cấu hình." } },
      { status: 500 }
    );
  }
}
