import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { comparePassword, hashPin } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/me/vault-pin/reset - Đặt lại mã PIN bằng xác thực mật khẩu đăng nhập hệ thống
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { password, newPin, confirmPin } = body;

    if (!password || !newPin || !confirmPin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-01",
            message: "Vui lòng nhập mật khẩu đăng nhập hệ thống, mã PIN mới và xác nhận PIN mới.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Fetch user to verify login password
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.status !== "active" || user.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không hợp lệ hoặc đã bị khóa." } },
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      await recordAuditLog({
        userId: session.userId,
        actionCode: "VAULT_PIN_RESET_FAILED",
        targetEntity: "user_vault_security",
        targetEntityId: session.userId,
        contextJson: { reason: "Mật khẩu xác minh danh tính không chính xác" },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-11",
            message: "Mật khẩu đăng nhập hệ thống không chính xác. Không thể đặt lại mã PIN.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Validate new PIN
    const trimmedNewPin = String(newPin).trim();
    const trimmedConfirmPin = String(confirmPin).trim();

    if (!/^\d{4}$|^\d{6}$/.test(trimmedNewPin)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-02",
            message: "Mã PIN mới phải có độ dài chính xác là 4 hoặc 6 chữ số (chỉ bao gồm chữ số 0-9).",
          },
        },
        { status: 400 }
      );
    }

    if (trimmedNewPin !== trimmedConfirmPin) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PIN-03", message: "Mã PIN mới và xác nhận không khớp." } },
        { status: 400 }
      );
    }

    const pinHashed = await hashPin(trimmedNewPin);

    // 3. Upsert user vault security, clearing any previous lock and attempts
    await prisma.userVaultSecurity.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        pinHash: pinHashed,
        pinLength: trimmedNewPin.length,
        failedAttempts: 0,
        lockedUntil: null,
        pinUpdatedAt: new Date(),
      },
      update: {
        pinHash: pinHashed,
        pinLength: trimmedNewPin.length,
        failedAttempts: 0,
        lockedUntil: null,
        pinUpdatedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_PIN_RESET",
      targetEntity: "user_vault_security",
      targetEntityId: session.userId,
      contextJson: { pinLength: trimmedNewPin.length },
    });

    return NextResponse.json({
      success: true,
      message: `Đặt lại mã PIN bảo mật (${trimmedNewPin.length} chữ số) thành công.`,
      data: { pinLength: trimmedNewPin.length },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Reset vault PIN error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi đặt lại mã PIN bảo mật." } },
      { status: 500 }
    );
  }
}
