import { NextResponse } from "next/server";
import { getSessionUser, recordAuditLog } from "@/lib/auth";
import { comparePassword, hashPassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword, confirmPassword } = body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập đầy đủ các trường mật khẩu." } },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-13", message: "Mật khẩu xác nhận không khớp với mật khẩu mới." } },
        { status: 400 }
      );
    }

    // Password strength check (BR-04)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,64}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-12",
            message: "Mật khẩu mới phải từ 8-64 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.",
          },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Người dùng không tồn tại." } },
        { status: 404 }
      );
    }

    const isOldValid = await comparePassword(oldPassword, user.passwordHash);
    if (!isOldValid) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-11", message: "Mật khẩu hiện tại không đúng." } },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-14", message: "Mật khẩu mới không được trùng với mật khẩu hiện tại." } },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    await recordAuditLog({
      userId: user.id,
      actionCode: "AUTH_CHANGE_PASSWORD",
      targetEntity: "user",
      targetEntityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới của bạn.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Đã xảy ra lỗi khi đổi mật khẩu." } },
      { status: 500 }
    );
  }
}
