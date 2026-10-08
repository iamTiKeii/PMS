import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// PUT /api/vault/accounts/[id] - Update account (Admin or PM)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const { id } = await props.params;
    const body = await request.json();
    const { accountLabel, siteLoginUsername, newPassword, notes, status } = body;

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

    const updateData: any = {};
    if (accountLabel) updateData.accountLabel = accountLabel.trim();
    if (siteLoginUsername) updateData.siteLoginUsername = siteLoginUsername.trim();
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (status) updateData.status = status;

    if (newPassword && newPassword.trim()) {
      const enc = encryptSitePassword(newPassword.trim());
      updateData.sitePasswordEncrypted = enc.ciphertext;
      updateData.encryptionIv = enc.iv;
      updateData.encryptionAuthTag = enc.authTag;
      updateData.lastRotatedAt = new Date();
    }

    const updated = await prisma.staffAccount.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: newPassword ? "VAULT_PASSWORD_ROTATED" : "VAULT_ACCOUNT_UPDATED",
      targetEntity: "staff_account",
      targetEntityId: updated.id,
      contextJson: {
        accountLabel: updated.accountLabel,
        isPasswordChanged: Boolean(newPassword),
        newStatus: updated.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        accountLabel: updated.accountLabel,
        siteLoginUsername: updated.siteLoginUsername,
        maskedPassword: "••••••••••••",
        status: updated.status,
        lastRotatedAt: updated.lastRotatedAt,
      },
      message: "Cập nhật tài khoản site thành công.",
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

// DELETE /api/vault/accounts/[id] - Soft-delete account (Admin only)
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin"]);
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

    await prisma.staffAccount.update({
      where: { id },
      data: { deletedAt: new Date(), status: "stopped" },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_ACCOUNT_DELETED_SOFT",
      targetEntity: "staff_account",
      targetEntityId: existing.id,
      contextJson: { accountLabel: existing.accountLabel, project: existing.project.projectName },
    });

    return NextResponse.json({
      success: true,
      message: "Xóa tài khoản thành công.",
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
