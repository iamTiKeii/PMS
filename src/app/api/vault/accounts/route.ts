import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword, decryptSitePassword } from "@/lib/crypto";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/vault/accounts - List site accounts (Masked passwords)
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const projectId = searchParams.get("projectId") || "";
    const staffId = searchParams.get("staffId") || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      deletedAt: null,
      project: { deletedAt: null },
    };

    if (q) {
      where.OR = [
        { accountLabel: { contains: q } },
        { siteLoginUsername: { contains: q } },
        { notes: { contains: q } },
        { project: { projectName: { contains: q } } },
        { staff: { fullName: { contains: q } } },
      ];
    }

    if (projectId && projectId !== "all") where.projectId = projectId;
    if (staffId && staffId !== "all") where.staffId = staffId;
    if (status && status !== "all") where.status = status;

    // Get user's assigned projects for permission checking
    const userAssignments = session.staffId
      ? await prisma.projectAssignment.findMany({
          where: { staffId: session.staffId, unassignedAt: null },
          select: { projectId: true },
        })
      : [];
    const assignedProjectIds = new Set(userAssignments.map((a) => a.projectId));

    const accounts = await prisma.staffAccount.findMany({
      where,
      include: {
        project: {
          select: { id: true, projectName: true, projectCode: true, systemHisUrl: true },
        },
        staff: {
          select: { id: true, fullName: true, staffCode: true, corporateEmail: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeAccounts = accounts.map((acc) => {
      // Permission check: Admin or Member of this Project
      const canReveal = session.role === "admin" || assignedProjectIds.has(acc.projectId);

      let plaintextPassword: string | null = null;
      if (canReveal) {
        try {
          plaintextPassword = decryptSitePassword({
            ciphertext: acc.sitePasswordEncrypted,
            iv: acc.encryptionIv,
            authTag: acc.encryptionAuthTag,
          });
        } catch {
          plaintextPassword = null;
        }
      }

      return {
        id: acc.id,
        projectId: acc.projectId,
        project: acc.project,
        staffId: acc.staffId,
        staff: acc.staff,
        accountLabel: acc.accountLabel,
        siteLoginUsername: acc.siteLoginUsername,
        maskedPassword: "••••••••••••",
        password: plaintextPassword,
        status: acc.status,
        notes: acc.notes,
        lastRotatedAt: acc.lastRotatedAt,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        canReveal,
      };
    });

    return NextResponse.json({
      success: true,
      data: safeAccounts,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List vault accounts error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách tài khoản." } },
      { status: 500 }
    );
  }
}

// POST /api/vault/accounts - Create new site account (Admin or PM)
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const body = await request.json();
    const { projectId, staffId, accountLabel, siteLoginUsername, sitePassword, notes, status = "in_use" } = body;

    if (!projectId || !staffId || !siteLoginUsername) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng chọn Dự án, Nhân sự và nhập Tên đăng nhập." } },
        { status: 400 }
      );
    }

    // 1. Check if staff is assigned to this project
    const assignment = await prisma.projectAssignment.findFirst({
      where: {
        projectId,
        staffId,
        unassignedAt: null,
      },
      include: {
        staff: { select: { fullName: true } },
        project: { select: { projectName: true, defaultPassword: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-63",
            message: "Nhân sự được chọn chưa được gán vào dự án này. Két tài khoản chỉ quản lý tài khoản của nhân sự được gán trong dự án.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Resolve password: use sitePassword if provided, otherwise inherit project defaultPassword
    let finalPassword = sitePassword ? String(sitePassword).trim() : "";
    if (!finalPassword) {
      if (assignment.project.defaultPassword) {
        finalPassword = assignment.project.defaultPassword;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-64",
              message: `Dự án "${assignment.project.projectName}" chưa được thiết lập Mật khẩu mặc định. Vui lòng cài đặt mật khẩu mặc định cho dự án hoặc nhập mật khẩu cho tài khoản.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Resolve account label if empty
    const finalAccountLabel = accountLabel && String(accountLabel).trim()
      ? String(accountLabel).trim()
      : `Tài khoản Site - ${assignment.staff.fullName}`;

    // 4. Check unique triplet (BR-12)
    const existing = await prisma.staffAccount.findFirst({
      where: {
        projectId,
        staffId,
        siteLoginUsername: siteLoginUsername.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-51", message: "Tài khoản với tên đăng nhập này đã tồn tại cho nhân sự trên dự án đã chọn." } },
        { status: 400 }
      );
    }

    // 5. Encrypt password using AES-256-GCM
    const enc = encryptSitePassword(finalPassword);

    const newAccount = await prisma.staffAccount.create({
      data: {
        projectId,
        staffId,
        accountLabel: finalAccountLabel,
        siteLoginUsername: siteLoginUsername.trim(),
        sitePasswordEncrypted: enc.ciphertext,
        encryptionIv: enc.iv,
        encryptionAuthTag: enc.authTag,
        status: status as string,
        notes: notes ? notes.trim() : null,
        lastRotatedAt: new Date(),
      },
      include: {
        project: { select: { projectName: true } },
        staff: { select: { fullName: true } },
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "VAULT_ACCOUNT_CREATED",
      targetEntity: "staff_account",
      targetEntityId: newAccount.id,
      contextJson: {
        accountLabel: newAccount.accountLabel,
        projectName: newAccount.project.projectName,
        staffName: newAccount.staff.fullName,
      },
    });

    createSystemNotification({
      title: "Tài khoản site mới",
      content: `Tài khoản "${newAccount.accountLabel}" (${newAccount.siteLoginUsername}) vừa được thêm vào dự án "${newAccount.project.projectName}" cho nhân sự ${newAccount.staff.fullName}.`,
      type: "account",
      severity: "info",
      objectType: "account",
      objectId: newAccount.id,
      targetUrl: "/projects",
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      data: {
        id: newAccount.id,
        accountLabel: newAccount.accountLabel,
        siteLoginUsername: newAccount.siteLoginUsername,
        maskedPassword: "••••••••••••",
        status: newAccount.status,
      },
      message: "Thêm tài khoản site dự án thành công (đã mã hóa an toàn AES-256-GCM).",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Create vault account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo tài khoản site mới." } },
      { status: 500 }
    );
  }
}
