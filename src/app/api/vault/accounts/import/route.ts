import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// POST /api/vault/accounts/import - Batch import site accounts from Excel (Admin or PM)
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Danh sách tài khoản import trống." } },
        { status: 400 }
      );
    }

    // Load all active projects and staff to map by name/code/email
    const [projects, staffList] = await Promise.all([
      prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, projectName: true, projectCode: true, defaultPassword: true },
      }),
      prisma.staff.findMany({
        where: { deletedAt: null },
        select: { id: true, fullName: true, staffCode: true, corporateEmail: true },
      }),
    ]);

    const projectMap = new Map<string, { id: string; defaultPassword: string | null }>();
    for (const p of projects) {
      const pInfo = { id: p.id, defaultPassword: p.defaultPassword };
      projectMap.set(p.projectName.trim().toLowerCase(), pInfo);
      if (p.projectCode) projectMap.set(p.projectCode.trim().toLowerCase(), pInfo);
    }

    const staffMap = new Map<string, string>();
    for (const s of staffList) {
      staffMap.set(s.fullName.trim().toLowerCase(), s.id);
      if (s.staffCode) staffMap.set(s.staffCode.trim().toLowerCase(), s.id);
      if (s.corporateEmail) staffMap.set(s.corporateEmail.trim().toLowerCase(), s.id);
    }

    const validAccounts: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const projectIdentifier = String(item.projectName || item.projectCode || "").trim().toLowerCase();
      const staffIdentifier = String(item.staffEmailOrCode || item.staffName || "").trim().toLowerCase();
      const accountLabel = String(item.accountLabel || "").trim();
      const siteLoginUsername = String(item.siteLoginUsername || "").trim();
      const sitePassword = String(item.sitePassword || "").trim();
      const notes = item.notes ? String(item.notes).trim() : null;
      const status = item.status === "stopped" ? "stopped" : item.status === "rotation_needed" ? "rotation_needed" : "in_use";

      if (!projectIdentifier) {
        errors.push(`Dòng ${i + 1}: Thiếu Tên hoặc Mã dự án.`);
        continue;
      }

      const projectInfo = projectMap.get(projectIdentifier);
      if (!projectInfo) {
        errors.push(`Dòng ${i + 1}: Không tìm thấy dự án nào khớp với "${item.projectName || item.projectCode}".`);
        continue;
      }
      const projectId = projectInfo.id;

      if (!staffIdentifier) {
        errors.push(`Dòng ${i + 1}: Thiếu Nhân sự (Email, Mã NV hoặc Tên).`);
        continue;
      }

      const staffId = staffMap.get(staffIdentifier);
      if (!staffId) {
        errors.push(`Dòng ${i + 1}: Không tìm thấy nhân sự nào khớp với "${item.staffEmailOrCode || item.staffName}".`);
        continue;
      }

      if (!accountLabel) {
        errors.push(`Dòng ${i + 1}: Thiếu Tên gợi nhớ / Phân vùng site.`);
        continue;
      }

      if (!siteLoginUsername) {
        errors.push(`Dòng ${i + 1}: Thiếu Tên đăng nhập site.`);
        continue;
      }

      const passwordToUse = sitePassword || projectInfo.defaultPassword;
      if (!passwordToUse) {
        errors.push(`Dòng ${i + 1}: Thiếu Mật khẩu site và dự án chưa được thiết lập mật khẩu mặc định.`);
        continue;
      }

      // Check duplicate triplet in DB
      const existing = await prisma.staffAccount.findFirst({
        where: {
          projectId,
          staffId,
          siteLoginUsername,
          deletedAt: null,
        },
      });

      if (existing) {
        errors.push(`Dòng ${i + 1}: Tài khoản "${siteLoginUsername}" đã tồn tại cho nhân sự này trên dự án.`);
        continue;
      }

      // Encrypt password using AES-256-GCM
      const enc = encryptSitePassword(passwordToUse);

      validAccounts.push({
        projectId,
        staffId,
        accountLabel,
        siteLoginUsername,
        sitePasswordEncrypted: enc.ciphertext,
        encryptionIv: enc.iv,
        encryptionAuthTag: enc.authTag,
        notes,
        status,
        lastRotatedAt: new Date(),
      });
    }

    if (validAccounts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-400",
            message: "Không có tài khoản nào hợp lệ để nhập vào két.",
            details: errors,
          },
        },
        { status: 400 }
      );
    }

    await prisma.staffAccount.createMany({
      data: validAccounts,
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_ACCOUNTS_IMPORTED_EXCEL",
      targetEntity: "staff_account",
      contextJson: {
        importedCount: validAccounts.length,
        skippedCount: errors.length,
        errors: errors.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: validAccounts.length,
        skippedCount: errors.length,
        errors,
      },
      message: `Đã nhập thành công ${validAccounts.length} tài khoản vào Két bảo mật từ Excel!${errors.length > 0 ? ` (Bỏ qua ${errors.length} dòng lỗi)` : ""}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Import vault accounts error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình import tài khoản." } },
      { status: 500 }
    );
  }
}
