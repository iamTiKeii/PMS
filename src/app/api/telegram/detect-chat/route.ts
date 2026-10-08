import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { detectTelegramChats } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    await requireRole(["admin"]);
    const body = await req.json();

    let { botToken } = body;

    if (!botToken || !botToken.trim()) {
      const config = await prisma.telegramConfig.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (config && config.botTokenEncrypted) {
        try {
          botToken = decryptSecret(config.botTokenEncrypted);
        } catch {
          return NextResponse.json(
            { success: false, error: { code: "MSG-82", message: "Không thể giải mã Bot Token đã lưu." } },
            { status: 400 }
          );
        }
      }
    }

    if (!botToken || !botToken.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập Bot Token trước để quét nhóm." } },
        { status: 400 }
      );
    }

    const result = await detectTelegramChats(botToken.trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-82", message: result.message } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    if (err.message === "FORBIDDEN" || err.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi phát hiện nhóm Telegram." } },
      { status: 500 }
    );
  }
}
