import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/[id]/unlock
 * Chức năng: Mở khóa tài khoản bị khóa (SRS Quản lý tài khoản)
 * Quy tắc nghiệp vụ:
 * 1. Chỉ người dùng có thẩm quyền (Admin) mới được thực hiện
 * 2. Phân biệt khóa tự động (sai mật khẩu >= 5 lần, lockedUntil) hoặc khóa thủ công (status = "locked")
 * 3. Bắt buộc nhập lý do mở khóa để phục vụ kiểm tra và truy vết (Audit Trail)
 * 4. Xóa bộ đếm đăng nhập sai (failedAttempts = 0) và thời gian khóa (lockedUntil = null)
 * 5. Cập nhật status = "active"
 * 6. Mật khẩu hiện tại KHÔNG tự động thay đổi
 * 7. Ghi nhận lịch sử thao tác vào Audit Log
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { id } = await props.params;

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    // Bắt buộc nhập lý do mở khóa
    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-01",
            message: "Vui lòng nhập lý do mở khóa tài khoản để phục vụ kiểm tra và truy vết.",
          },
        },
        { status: 400 }
      );
    }

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

    // Kiểm tra xem tài khoản có đang ở trạng thái bị khóa hay không
    const isTemporarilyLocked =
      user.lockedUntil !== null && new Date(user.lockedUntil).getTime() > Date.now();
    const isFailedAttemptsExceeded = user.failedAttempts >= 5;
    const isManuallyLocked = user.status === "locked";

    const isLocked = isManuallyLocked || isTemporarilyLocked || isFailedAttemptsExceeded;

    if (!isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-28",
            message: "Tài khoản hiện đang hoạt động bình thường, không ở trạng thái bị khóa.",
          },
        },
        { status: 400 }
      );
    }

    // Xác định nguyên nhân khóa để ghi nhận audit
    let lockCause = "Quản trị viên khóa thủ công";
    if (isTemporarilyLocked || isFailedAttemptsExceeded) {
      lockCause = `Đăng nhập sai quá 5 lần quy định (đã sai ${user.failedAttempts} lần)`;
    }

    // Cập nhật khôi phục trạng thái hoạt động (mật khẩu không đổi)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "active",
        failedAttempts: 0,
        lockedUntil: null,
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

    // Ghi nhận lịch sử thao tác mở khóa
    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "UNLOCK_USER",
      targetEntity: "user",
      targetEntityId: user.id,
      contextJson: {
        username: user.username,
        reason,
        lockCause,
        previousStatus: user.status,
        previousFailedAttempts: user.failedAttempts,
        previousLockedUntil: user.lockedUntil,
        performedBy: adminSession.username,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã mở khóa tài khoản @${user.username} thành công.`,
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-06", message: "Bạn không có quyền thực hiện mở khóa tài khoản này." },
        },
        { status: 403 }
      );
    }

    console.error("Unlock user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "MSG-500", message: "Lỗi hệ thống khi mở khóa tài khoản." },
      },
      { status: 500 }
    );
  }
}
