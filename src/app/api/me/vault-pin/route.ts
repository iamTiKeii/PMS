import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { hashPin, comparePin } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/me/vault-pin - Thiết lập PIN bảo mật Két lần đầu
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { pin, confirmPin } = body;

    if (!pin || !confirmPin) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PIN-01", message: "Vui lòng nhập đầy đủ mã PIN và xác nhận PIN." } },
        { status: 400 }
      );
    }

    const trimmedPin = String(pin).trim();
    const trimmedConfirm = String(confirmPin).trim();

    // Check PIN strictly 4 or 6 digits
    if (!/^\d{4}$|^\d{6}$/.test(trimmedPin)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-02",
            message: "Mã PIN phải có độ dài chính xác là 4 hoặc 6 chữ số (chỉ bao gồm chữ số 0-9).",
          },
        },
        { status: 400 }
      );
    }

    if (trimmedPin !== trimmedConfirm) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PIN-03", message: "Mã PIN xác nhận không khớp." } },
        { status: 400 }
      );
    }

    // Check if user already configured PIN
    const existing = await prisma.userVaultSecurity.findUnique({
      where: { userId: session.userId },
    });

    if (existing && existing.pinHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-04",
            message: "Bạn đã thiết lập mã PIN trước đó. Vui lòng sử dụng tính năng Đổi PIN.",
          },
        },
        { status: 400 }
      );
    }

    const pinHashed = await hashPin(trimmedPin);

    await prisma.userVaultSecurity.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        pinHash: pinHashed,
        pinLength: trimmedPin.length,
        failedAttempts: 0,
        lockedUntil: null,
        pinUpdatedAt: new Date(),
      },
      update: {
        pinHash: pinHashed,
        pinLength: trimmedPin.length,
        failedAttempts: 0,
        lockedUntil: null,
        pinUpdatedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_PIN_CREATED",
      targetEntity: "user_vault_security",
      targetEntityId: session.userId,
      contextJson: { pinLength: trimmedPin.length },
    });

    return NextResponse.json({
      success: true,
      message: `Thiết lập mã PIN bảo vệ Két (${trimmedPin.length} chữ số) thành công.`,
      data: { pinLength: trimmedPin.length },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Setup vault PIN error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi thiết lập mã PIN bảo mật." } },
      { status: 500 }
    );
  }
}

// PATCH /api/me/vault-pin - Đổi PIN bảo mật
export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { currentPin, newPin, confirmPin } = body;

    if (!currentPin || !newPin || !confirmPin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-PIN-01", message: "Vui lòng nhập PIN hiện tại, PIN mới và xác nhận PIN mới." },
        },
        { status: 400 }
      );
    }

    const security = await prisma.userVaultSecurity.findUnique({
      where: { userId: session.userId },
    });

    if (!security || !security.pinHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-05",
            message: "Bạn chưa thiết lập mã PIN. Vui lòng thiết lập PIN lần đầu.",
          },
        },
        { status: 400 }
      );
    }

    // Check lock status
    const now = new Date();
    if (security.lockedUntil && security.lockedUntil > now) {
      const waitMinutes = Math.ceil((security.lockedUntil.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-PIN-LOCKED",
            message: `Tài khoản tạm thời bị khóa xác thực PIN do nhập sai quá 5 lần. Vui lòng thử lại sau ${waitMinutes} phút.`,
          },
        },
        { status: 423 }
      );
    }

    // Verify current PIN
    const isCurrentValid = await comparePin(String(currentPin).trim(), security.pinHash);

    if (!isCurrentValid) {
      const newFailed = security.failedAttempts + 1;
      let lockedUntil: Date | null = null;
      let msg = `Mã PIN hiện tại không chính xác. Bạn còn ${Math.max(0, 5 - newFailed)} lần thử.`;

      if (newFailed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        msg = "Bạn đã nhập sai PIN 5 lần liên tiếp. Xác thực PIN bị khóa trong 15 phút.";
      }

      await prisma.userVaultSecurity.update({
        where: { userId: session.userId },
        data: {
          failedAttempts: newFailed >= 5 ? 0 : newFailed,
          lockedUntil,
        },
      });

      await recordAuditLog({
        userId: session.userId,
        actionCode: "VAULT_PIN_VERIFY_FAILED",
        targetEntity: "user_vault_security",
        targetEntityId: session.userId,
        contextJson: { failedAttempts: newFailed, isLocked: Boolean(lockedUntil) },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: newFailed >= 5 ? "MSG-PIN-LOCKED" : "MSG-PIN-INVALID",
            message: msg,
          },
        },
        { status: newFailed >= 5 ? 423 : 401 }
      );
    }

    // Validate new PIN
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

    const newPinHashed = await hashPin(trimmedNewPin);

    await prisma.userVaultSecurity.update({
      where: { userId: session.userId },
      data: {
        pinHash: newPinHashed,
        pinLength: trimmedNewPin.length,
        failedAttempts: 0,
        lockedUntil: null,
        pinUpdatedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_PIN_CHANGED",
      targetEntity: "user_vault_security",
      targetEntityId: session.userId,
      contextJson: { pinLength: trimmedNewPin.length },
    });

    return NextResponse.json({
      success: true,
      message: "Đổi mã PIN bảo mật thành công.",
      data: { pinLength: trimmedNewPin.length },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Change vault PIN error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi thay đổi mã PIN bảo mật." } },
      { status: 500 }
    );
  }
}
