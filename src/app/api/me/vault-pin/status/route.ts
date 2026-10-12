import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/me/vault-pin/status - Kiểm tra trạng thái mã PIN bảo mật Két
export async function GET() {
  try {
    const session = await requireAuth();

    const security = await prisma.userVaultSecurity.findUnique({
      where: { userId: session.userId },
    });

    if (!security) {
      return NextResponse.json({
        success: true,
        data: {
          hasPin: false,
          pinLength: null,
          isLocked: false,
          lockedUntil: null,
          remainingLockSeconds: 0,
          failedAttempts: 0,
        },
      });
    }

    const now = new Date();
    let isLocked = false;
    let remainingLockSeconds = 0;

    if (security.lockedUntil) {
      if (security.lockedUntil > now) {
        isLocked = true;
        remainingLockSeconds = Math.ceil((security.lockedUntil.getTime() - now.getTime()) / 1000);
      } else {
        // Hết thời gian khóa, tự động dọn cờ khóa
        await prisma.userVaultSecurity.update({
          where: { userId: session.userId },
          data: { lockedUntil: null, failedAttempts: 0 },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasPin: true,
        pinLength: security.pinLength,
        isLocked,
        lockedUntil: isLocked ? security.lockedUntil : null,
        remainingLockSeconds,
        failedAttempts: isLocked ? security.failedAttempts : security.failedAttempts,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get vault pin status error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi kiểm tra trạng thái PIN bảo mật." } },
      { status: 500 }
    );
  }
}
