import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { comparePassword, decryptSitePassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// POST /api/vault/accounts/[id]/reveal - Step-Up Re-Authentication & Reveal Password
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();
    const { reauthPassword } = body;

    if (!reauthPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-01",
            message: "Vui lòng nhập mật khẩu tài khoản của bạn để xác thực mở khóa.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Fetch current user from DB to verify current password
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser || currentUser.deletedAt || currentUser.status !== "active") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Phiên làm việc không hợp lệ." } },
        { status: 403 }
      );
    }

    const isReauthValid = await comparePassword(reauthPassword, currentUser.passwordHash);

    if (!isReauthValid) {
      await recordAuditLog({
        userId: session.userId,
        actionCode: "VAULT_REVEAL_FAILED",
        targetEntity: "staff_account",
        targetEntityId: id,
        contextJson: { reason: "Sai mật khẩu xác thực Re-Auth" },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-11",
            message: "Mật khẩu xác thực không chính xác. Hành vi này đã được ghi nhận vào nhật ký kiểm toán.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Fetch the target site account
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
        { success: false, error: { code: "MSG-04", message: "Tài khoản site không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    // 3. Permission check: Admin or Member of this Project
    const isProjectMember =
      session.staffId &&
      account.project.assignments.some((a) => a.staffId === session.staffId);

    if (session.role !== "admin" && !isProjectMember) {
      await recordAuditLog({
        userId: session.userId,
        actionCode: "VAULT_REVEAL_DENIED",
        targetEntity: "staff_account",
        targetEntityId: account.id,
        contextJson: {
          reason: "Người dùng không thuộc dự án sở hữu tài khoản",
          projectId: account.projectId,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-06",
            message: "Bạn không phải thành viên phụ trách của dự án này nên không có quyền xem mật khẩu.",
          },
        },
        { status: 403 }
      );
    }

    // 4. Decrypt AES-256-GCM
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
            message: "Không thể giải mã mật khẩu. Có thể khóa mã hóa hệ thống không khớp.",
          },
        },
        { status: 500 }
      );
    }

    // 5. Record critical Audit Log
    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_REVEAL_PASSWORD",
      targetEntity: "staff_account",
      targetEntityId: account.id,
      contextJson: {
        accountLabel: account.accountLabel,
        projectName: account.project.projectName,
        staffName: account.staff.fullName,
        siteUsername: account.siteLoginUsername,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accountId: account.id,
        plaintextPassword,
        expiresInSeconds: 15,
      },
      message: "Xác thực thành công. Mật khẩu sẽ tự động ẩn sau 15 giây.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Reveal password error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình xác thực mở mật khẩu." } },
      { status: 500 }
    );
  }
}
