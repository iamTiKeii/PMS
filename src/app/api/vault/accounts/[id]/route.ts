import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword } from "@/lib/crypto";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/vault/accounts/[id] - Xem thông tin chi tiết tài khoản theo quyền
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const account = await prisma.staffAccount.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, projectName: true, projectCode: true, systemHisUrl: true },
        },
        staff: {
          select: { id: true, fullName: true, staffCode: true, corporateEmail: true, department: true },
        },
        ownerUser: {
          select: { id: true, username: true, staff: { select: { fullName: true } } },
        },
        createdByUser: {
          select: { id: true, username: true, staff: { select: { fullName: true } } },
        },
      },
    });

    if (!account || account.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không tồn tại." } },
        { status: 404 }
      );
    }

    const isOwner =
      account.ownerUserId === session.userId ||
      (session.staffId && account.staffId === session.staffId);

    return NextResponse.json({
      success: true,
      data: {
        id: account.id,
        name: account.accountLabel,
        accountLabel: account.accountLabel,
        username: account.siteLoginUsername,
        siteLoginUsername: account.siteLoginUsername,
        maskedPassword: "••••••••••••",
        url: account.url || account.project?.systemHisUrl || null,
        projectId: account.projectId,
        project: account.project,
        staffId: account.staffId,
        staff: account.staff,
        ownerUserId: account.ownerUserId,
        ownerUser: account.ownerUser,
        createdById: account.createdById,
        status: account.status,
        notes: account.notes,
        passwordStatus: account.passwordStatus || "DEFAULT",
        passwordChangedAt: account.passwordChangedAt,
        requiresPin: (account.passwordStatus || "DEFAULT") === "CUSTOM",
        canRevealWithoutPin: (account.passwordStatus || "DEFAULT") === "DEFAULT",
        isOwner: Boolean(isOwner),
        lastRotatedAt: account.lastRotatedAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get vault account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin tài khoản." } },
      { status: 500 }
    );
  }
}

// PUT / PATCH /api/vault/accounts/[id] - Cập nhật tài khoản (Admin, PM hoặc Chủ sở hữu)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();
    const { name, accountLabel, username, siteLoginUsername, password, newPassword, notes, status, url } = body;

    const existing = await prisma.staffAccount.findUnique({
      where: { id },
      include: { project: true, staff: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không tồn tại." } },
        { status: 404 }
      );
    }

    // Permission check: Admin, PM, hoặc Chủ sở hữu tài khoản
    const isOwner =
      existing.ownerUserId === session.userId ||
      (session.staffId && existing.staffId === session.staffId);
    const canManage = session.role === "admin" || session.role === "pm" || isOwner;

    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-06", message: "Bạn không có quyền chỉnh sửa tài khoản thuộc sở hữu của người khác." },
        },
        { status: 403 }
      );
    }

    const updateData: any = {};
    const finalLabel = name || accountLabel;
    const finalUsername = username || siteLoginUsername;
    const finalPassword = password || newPassword;

    if (finalLabel) updateData.accountLabel = String(finalLabel).trim();
    if (finalUsername) updateData.siteLoginUsername = String(finalUsername).trim();
    if (url !== undefined) updateData.url = url ? String(url).trim() : null;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
    if (status) updateData.status = status;

    const isPasswordChanged = Boolean(finalPassword && String(finalPassword).trim());

    if (isPasswordChanged) {
      const enc = encryptSitePassword(String(finalPassword).trim());
      updateData.sitePasswordEncrypted = enc.ciphertext;
      updateData.encryptionIv = enc.iv;
      updateData.encryptionAuthTag = enc.authTag;
      // QUY TẮC NGHIỆP VỤ 3: Khi nhân sự tự đổi mật khẩu, chuyển sang trạng thái CUSTOM riêng tư,
      // gán quyền sở hữu cá nhân và ghi nhận thời điểm đổi
      updateData.passwordStatus = "CUSTOM";
      updateData.passwordChangedAt = new Date();
      updateData.ownerUserId = session.userId;
      updateData.lastRotatedAt = new Date();
    }

    const updated = await prisma.staffAccount.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: isPasswordChanged ? "VAULT_PASSWORD_CUSTOMIZED" : "VAULT_ACCOUNT_UPDATED",
      targetEntity: "staff_account",
      targetEntityId: updated.id,
      contextJson: {
        accountLabel: updated.accountLabel,
        isPasswordChanged,
        newStatus: updated.status,
        passwordStatus: updated.passwordStatus,
      },
    });

    createSystemNotification({
      title: finalPassword ? "Đổi mật khẩu tài khoản Két" : "Cập nhật tài khoản Két",
      content: `Tài khoản "${updated.accountLabel}" (${updated.siteLoginUsername}) vừa được cập nhật.`,
      type: "account",
      severity: "info",
      objectType: "account",
      objectId: updated.id,
      targetUrl: "/vault",
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.accountLabel,
        accountLabel: updated.accountLabel,
        username: updated.siteLoginUsername,
        siteLoginUsername: updated.siteLoginUsername,
        maskedPassword: "••••••••••••",
        status: updated.status,
        url: updated.url,
        lastRotatedAt: updated.lastRotatedAt,
      },
      message: "Cập nhật tài khoản Két thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Update vault account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật tài khoản." } },
      { status: 500 }
    );
  }
}

// PATCH - Alias for PUT
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return PUT(request, props);
}

// DELETE /api/vault/accounts/[id] - Xóa tài khoản (Admin hoặc Chủ sở hữu)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const existing = await prisma.staffAccount.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài khoản không tồn tại." } },
        { status: 404 }
      );
    }

    // Permission check: Admin hoặc Chủ sở hữu tài khoản
    const isOwner =
      existing.ownerUserId === session.userId ||
      (session.staffId && existing.staffId === session.staffId);
    const canDelete = session.role === "admin" || isOwner;

    if (!canDelete) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-06", message: "Bạn không có quyền xóa tài khoản của người khác." },
        },
        { status: 403 }
      );
    }

    await prisma.staffAccount.update({
      where: { id },
      data: { deletedAt: new Date(), status: "stopped" },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_ACCOUNT_DELETED",
      targetEntity: "staff_account",
      targetEntityId: existing.id,
      contextJson: { accountLabel: existing.accountLabel, project: existing.project?.projectName },
    });

    createSystemNotification({
      title: "Xóa tài khoản Két",
      content: `Tài khoản "${existing.accountLabel}" (${existing.siteLoginUsername}) đã được xóa khỏi két.`,
      type: "account",
      severity: "warning",
      objectType: "account",
      objectId: existing.id,
      targetUrl: "/vault",
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      message: "Đã xóa tài khoản khỏi Két thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Delete vault account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa tài khoản." } },
      { status: 500 }
    );
  }
}
