import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signSessionToken } from "@/lib/crypto";
import { recordAuditLog, SESSION_COOKIE_NAME } from "@/lib/auth";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/auth/login - Đăng nhập cho Extension & API clients
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu", 400, "MISSING_CREDENTIALS");
    }

    const cleanUsername = String(username).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        deletedAt: null,
      },
      include: {
        staff: true,
      },
    });

    if (!user) {
      await recordAuditLog({
        actionCode: "AUTH_LOGIN_FAILED",
        targetEntity: "user",
        contextJson: { username: cleanUsername, reason: "User not found" },
      });
      return apiError("Tên đăng nhập hoặc mật khẩu không chính xác", 401, "INVALID_CREDENTIALS");
    }

    if (user.status === "locked" || user.status === "inactive") {
      return apiError("Tài khoản đã bị khóa hoặc ngừng hoạt động", 403, "ACCOUNT_LOCKED");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return apiError(
        `Bạn đã nhập sai quá nhiều lần. Tài khoản tạm khóa, vui lòng thử lại sau ${remainingMinutes} phút`,
        429,
        "TOO_MANY_ATTEMPTS"
      );
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = user.failedAttempts + 1;
      const isNowLocked = newAttempts >= 5;
      const lockedUntil = isNowLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      return apiError(`Tên đăng nhập hoặc mật khẩu không chính xác (${newAttempts}/5)`, 401, "INVALID_CREDENTIALS");
    }

    // Đăng nhập thành công
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as "admin" | "pm" | "user",
      staffId: user.staffId,
      fullName: user.staff?.fullName || user.username,
    };

    const token = signSessionToken(sessionPayload);

    await recordAuditLog({
      userId: user.id,
      actionCode: "AUTH_LOGIN_SUCCESS",
      targetEntity: "user",
      targetEntityId: user.id,
      contextJson: { role: user.role, username: user.username },
    });

    const response = apiSuccess({
      token,
      user: sessionPayload,
      mustChangePassword: user.mustChangePassword,
    });

    // Cũng đặt cookie để nếu gọi qua browser thì có session ngay
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Extension login error:", error);
    return apiError("Lỗi hệ thống khi đăng nhập", 500, "INTERNAL_ERROR");
  }
}
