import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signSessionToken } from "@/lib/crypto";
import { recordAuditLog, SESSION_COOKIE_NAME } from "@/lib/auth";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "pms_jwt_secret_token_default_fallback_2026";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/v1/auth/token - Cấp token xác thực cho Extension (SRS 8D.2, UC-48)
 * Trả về access_token (30 phút / 24h) + refresh_token (14 ngày)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, client } = body;

    if (!username || !password) {
      return apiError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu", 400, "MSG-01");
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
        contextJson: { username: cleanUsername, reason: "User not found", client },
      });
      return apiError("Tên đăng nhập hoặc mật khẩu không chính xác", 401, "MSG-02");
    }

    if (user.status === "locked" || user.status === "inactive") {
      return apiError("Tài khoản đã bị khóa hoặc ngừng hoạt động", 403, "MSG-04");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return apiError(
        `Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        429,
        "MSG-03"
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

      if (isNowLocked) {
        return apiError("Bạn đã nhập sai quá 5 lần. Tài khoản bị tạm khóa 15 phút.", 429, "MSG-03");
      }

      return apiError(`Tên đăng nhập hoặc mật khẩu không chính xác (${newAttempts}/5).`, 401, "MSG-02");
    }

    // Kiểm tra bắt buộc đổi mật khẩu
    if (user.mustChangePassword) {
      return apiError("Bạn cần đổi mật khẩu trước khi dùng Extension. Vui lòng đăng nhập Hub để đổi mật khẩu.", 403, "MSG-109");
    }

    // Đăng nhập thành công -> Reset failed counter
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

    const accessToken = signSessionToken(sessionPayload);
    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username, tokenType: "refresh" },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    await recordAuditLog({
      userId: user.id,
      actionCode: "ext_login",
      targetEntity: "user",
      targetEntityId: user.id,
      contextJson: {
        clientName: client?.name || "isofh-ext",
        clientVersion: client?.version || "1.0.0",
        deviceLabel: client?.device_label || "Browser Extension",
      },
    });

    return apiSuccess({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 1800, // 30 phút
      refresh_token: refreshToken,
      refresh_expires_in: 1209600, // 14 ngày
      user: {
        id: user.id,
        full_name: user.staff?.fullName || user.username,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("POST /api/v1/auth/token error:", error);
    return apiError("Lỗi hệ thống khi cấp token xác thực", 500, "INTERNAL_ERROR");
  }
}
