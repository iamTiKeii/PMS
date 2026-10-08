import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signSessionToken } from "@/lib/crypto";
import { recordAuditLog, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." } },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Find user
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
      return NextResponse.json(
        { success: false, error: { code: "MSG-02", message: "Tên đăng nhập hoặc mật khẩu không chính xác." } },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === "locked" || user.status === "inactive") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ Quản trị viên." } },
        { status: 403 }
      );
    }

    // Check brute-force lock duration
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-03",
            message: `Bạn đã nhập sai quá nhiều lần. Tài khoản tạm khóa, vui lòng thử lại sau ${remainingMinutes} phút.`,
          },
        },
        { status: 429 }
      );
    }

    // Verify password
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

      await recordAuditLog({
        userId: user.id,
        actionCode: isNowLocked ? "AUTH_LOCKED_OUT" : "AUTH_LOGIN_FAILED",
        targetEntity: "user",
        targetEntityId: user.id,
        contextJson: { attempts: newAttempts, isLocked: isNowLocked },
      });

      if (isNowLocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-03",
              message: "Bạn đã đăng nhập sai 5 lần liên tiếp. Tài khoản tạm khóa trong 15 phút.",
            },
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-02",
            message: `Tên đăng nhập hoặc mật khẩu không chính xác. (Lần sai: ${newAttempts}/5)`,
          },
        },
        { status: 401 }
      );
    }

    // Login successful
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

    const response = NextResponse.json({
      success: true,
      data: {
        user: sessionPayload,
        mustChangePassword: user.mustChangePassword,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Đã xảy ra lỗi máy chủ trong quá trình đăng nhập." } },
      { status: 500 }
    );
  }
}
