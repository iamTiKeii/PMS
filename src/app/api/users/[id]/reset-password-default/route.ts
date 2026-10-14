import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/[id]/reset-password-default
 * Chức năng: Đưa mật khẩu về giá trị mặc định theo Username (SRS Quản lý tài khoản)
 * Quy tắc nghiệp vụ:
 * 1. Mật khẩu mặc định = username
 * 2. Chỉ Admin có thẩm quyền mới được thực hiện
 * 3. Không tự động mở khóa tài khoản nếu tài khoản đang bị khóa
 * 4. Không thay đổi username, role, quyền hạn hoặc dữ liệu nghiệp vụ
 * 5. Bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo (mustChangePassword = true)
 * 6. Tuyệt đối không lưu mật khẩu thô trong DB và không ghi vào Audit Log
 * 7. Ghi nhận lịch sử thao tác (Audit Log)
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-04", message: "Tài khoản người dùng không tồn tại hoặc đã bị xóa." },
        },
        { status: 404 }
      );
    }

    // Mật khẩu mặc định theo quy tắc: mật khẩu mặc định = username
    const defaultPassword = user.username.trim();
    const newPasswordHash = await hashPassword(defaultPassword);

    // Cập nhật mật khẩu và đánh dấu bắt buộc đổi pass (không thay đổi trạng thái khóa)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        failedAttempts: true,
        lockedUntil: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    // Ghi nhận lịch sử thao tác (Audit Log)
    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "RESET_PASSWORD_DEFAULT",
      targetEntity: "user",
      targetEntityId: user.id,
      contextJson: {
        username: user.username,
        performedBy: adminSession.username,
        accountStatus: user.status,
        mustChangePassword: true,
        note: "Đã đưa mật khẩu về mặc định theo username. Yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp.",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã reset mật khẩu tài khoản @${user.username} về mặc định theo username thành công.`,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-06", message: "Bạn không có quyền thực hiện reset mật khẩu tài khoản này." },
        },
        { status: 403 }
      );
    }

    console.error("Reset default password error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "MSG-500", message: "Lỗi hệ thống khi reset mật khẩu mặc định." },
      },
      { status: 500 }
    );
  }
}
