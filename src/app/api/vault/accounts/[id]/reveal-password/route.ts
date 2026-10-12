import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { comparePassword, comparePin, decryptSitePassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/vault/accounts/[id]/reveal-password - Xác thực PIN và xem mật khẩu của tài khoản sở hữu
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();
    const { pin, reauthPassword } = body;

    // 1. Fetch current user from DB
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true, vaultSecurity: true },
    });

    if (!currentUser || currentUser.deletedAt || currentUser.status !== "active") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Phiên làm việc không hợp lệ hoặc tài khoản đã bị khóa." } },
        { status: 403 }
      );
    }

    // 2. Fetch target account
    const account = await prisma.staffAccount.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            assignments: { where: { unassignedAt: null } },
          },
        },
        staff: true,
      },
    });

    if (!account || account.deletedAt || account.project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    // 3. Determine ownership & permission
    const isOwner =
      account.ownerUserId === session.userId ||
      (session.staffId && account.staffId === session.staffId);

    const isProjectMember =
      session.staffId &&
      account.project.assignments.some((a) => a.staffId === session.staffId);
    const isAdmin = session.role === "admin";
    const passwordStatus = account.passwordStatus || "DEFAULT";

    // 4. Authenticate according to Password Status (SRS Mục 1, 2, 4)
    if (passwordStatus === "DEFAULT") {
      // TRẠNG THÁI 1 — Mật khẩu mặc định của dự án:
      // Các nhân sự có quyền truy cập tài khoản (chủ sở hữu, thành viên dự án, admin)
      // được xem mật khẩu mà KHÔNG CẦN PIN.
      if (!isOwner && !isProjectMember && !isAdmin) {
        await recordAuditLog({
          userId: session.userId,
          actionCode: "VAULT_REVEAL_DENIED",
          targetEntity: "staff_account",
          targetEntityId: account.id,
          contextJson: { reason: "Không có quyền truy cập dự án" },
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-06",
              message: "Bạn không có quyền truy cập xem tài khoản thuộc dự án này.",
            },
          },
          { status: 403 }
        );
      }
      // Đủ quyền truy cập mật khẩu mặc định: Không cần PIN, đi thẳng tới giải mã AES
    } else {
      // TRẠNG THÁI 2 — Nhân sự đã tự đổi mật khẩu (CUSTOM):
      // Mật khẩu chuyển sang trạng thái riêng tư.
      // QUY TẮC CỐT LÕI: Chỉ nhân sự sở hữu tài khoản mới được xem sau khi xác thực PIN thành công.
      // Các nhân sự khác KHÔNG ĐƯỢC XEM, kể cả khi PIN của họ đúng hay có quyền Admin!
      if (!isOwner) {
        await recordAuditLog({
          userId: session.userId,
          actionCode: "VAULT_REVEAL_DENIED",
          targetEntity: "staff_account",
          targetEntityId: account.id,
          contextJson: {
            reason: "Tài khoản ở chế độ riêng tư, từ chối nhân sự không phải chủ sở hữu",
            callerRole: session.role,
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-PRIVATE-PASSWORD",
              message: "Mật khẩu này đã được chủ sở hữu thay đổi và đặt ở chế độ riêng tư. Chỉ nhân sự sở hữu tài khoản mới có quyền xem sau khi xác thực PIN.",
            },
          },
          { status: 403 }
        );
      }

      // Chủ sở hữu BẮT BUỘC xác thực bằng mã PIN cá nhân
      if (!pin) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-PIN-REQUIRED",
              message: "Mật khẩu này đang ở chế độ riêng tư. Vui lòng nhập mã PIN bảo mật cá nhân của bạn để mở khóa.",
            },
          },
          { status: 400 }
        );
      }

      const security = currentUser.vaultSecurity;
      if (!security || !security.pinHash) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PIN_NOT_SET",
              message: "Bạn vừa đổi mật khẩu riêng tư nhưng chưa thiết lập mã PIN bảo vệ Két. Vui lòng thiết lập mã PIN để xem mật khẩu này.",
            },
          },
          { status: 400 }
        );
      }

      // Kiểm tra trạng thái khóa thử sai PIN
      const now = new Date();
      if (security.lockedUntil && security.lockedUntil > now) {
        const remainingMinutes = Math.ceil((security.lockedUntil.getTime() - now.getTime()) / 60000);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PIN_LOCKED",
              message: `Xác thực PIN tạm thời bị khóa do nhập sai quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
              remainingSeconds: Math.ceil((security.lockedUntil.getTime() - now.getTime()) / 1000),
            },
          },
          { status: 423 }
        );
      }

      // Xác thực PIN
      const isPinValid = await comparePin(String(pin).trim(), security.pinHash);

      if (!isPinValid) {
        const newFailed = security.failedAttempts + 1;
        let lockedUntil: Date | null = null;
        let errorMsg = `Mã PIN không chính xác. Bạn còn ${Math.max(0, 5 - newFailed)} lần thử.`;

        if (newFailed >= 5) {
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
          errorMsg = "Bạn đã nhập sai mã PIN 5 lần liên tiếp. Chức năng mở khóa PIN bị tạm ngưng trong 15 phút.";
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
          actionCode: "VAULT_PIN_FAILED",
          targetEntity: "staff_account",
          targetEntityId: id,
          contextJson: { reason: "Nhập sai PIN xem mật khẩu riêng tư", failedAttempts: newFailed, isLocked: Boolean(lockedUntil) },
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: newFailed >= 5 ? "PIN_LOCKED" : "PIN_INVALID",
              message: errorMsg,
              failedAttempts: newFailed,
              remainingAttempts: Math.max(0, 5 - newFailed),
            },
          },
          { status: newFailed >= 5 ? 423 : 401 }
        );
      }

      // Đúng PIN: reset cờ sai
      await prisma.userVaultSecurity.update({
        where: { userId: session.userId },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    // 5. Decrypt AES-256-GCM
    let plaintextPassword = "";
    try {
      plaintextPassword = decryptSitePassword({
        ciphertext: account.sitePasswordEncrypted,
        iv: account.encryptionIv,
        authTag: account.encryptionAuthTag,
      });
    } catch (decryptErr) {
      console.error("AES Decryption Error:", decryptErr);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-500",
            message: "Không thể giải mã mật khẩu. Khóa mã hóa hệ thống có thể đã thay đổi.",
          },
        },
        { status: 500 }
      );
    }

    // 6. Record critical Audit Log
    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_REVEAL_PASSWORD",
      targetEntity: "staff_account",
      targetEntityId: account.id,
      contextJson: {
        accountLabel: account.accountLabel,
        siteUsername: account.siteLoginUsername,
        isOwner,
        revealedBy: currentUser.username,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: "Xác thực thành công. Đã giải mã mật khẩu.",
      data: {
        password: plaintextPassword,
        plaintextPassword,
      },
    });

    // Yêu cầu bắt buộc: Response không được đưa vào cache dùng chung
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Reveal password error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi mở khóa mật khẩu." } },
      { status: 500 }
    );
  }
}
