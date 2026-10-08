import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword, decryptSitePassword } from "@/lib/crypto";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/accounts - UC-32: View accounts of project
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId } = await props.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectName: true, projectCode: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    // Check project assignment of current user
    const userAssignments = session.staffId
      ? await prisma.projectAssignment.findMany({
          where: { staffId: session.staffId, projectId, unassignedAt: null },
        })
      : [];
    const isProjectMember = session.role === "admin" || userAssignments.length > 0;

    // Get project assignments to show level
    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId, unassignedAt: null },
      select: { staffId: true, tierLevel: true },
    });
    const staffLevelMap = new Map<string, number>();
    assignments.forEach((a) => {
      staffLevelMap.set(a.staffId, a.tierLevel);
    });

    const accounts = await prisma.staffAccount.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            staffCode: true,
            corporateEmail: true,
            department: true,
            status: true,
            joinDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = accounts.map((acc) => {
      let plaintextPassword: string | null = null;
      if (isProjectMember) {
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

      const tierLevel = staffLevelMap.get(acc.staffId) || null;

      return {
        id: acc.id,
        projectId: acc.projectId,
        staffId: acc.staffId,
        staff: acc.staff,
        tierLevel,
        accountLabel: acc.accountLabel,
        siteLoginUsername: acc.siteLoginUsername,
        maskedPassword: "••••••••••••",
        password: plaintextPassword,
        status: acc.status,
        notes: acc.notes,
        lastRotatedAt: acc.lastRotatedAt,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List project accounts error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách tài khoản dự án." } },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/accounts - UC-33: Add account to project (Admin)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const { id: projectId } = await props.params;
    const body = await request.json();
    const {
      staffId,
      siteLoginUsername,
      sitePassword,
      accountLabel,
      notes,
    } = body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectName: true, projectCode: true, defaultPassword: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng chọn nhân sự." } },
        { status: 400 }
      );
    }

    if (!siteLoginUsername || !siteLoginUsername.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập tên tài khoản (username) site." } },
        { status: 400 }
      );
    }

    // Effective password: input or project default password
    const effectivePassword = sitePassword?.trim() || project.defaultPassword;
    if (!effectivePassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-01",
            message: "Vui lòng nhập mật khẩu hoặc cấu hình mật khẩu mặc định cho dự án.",
          },
        },
        { status: 400 }
      );
    }

    const trimmedUsername = siteLoginUsername.trim();

    // UC-33: Check duplicate triad (staffId + projectId + siteLoginUsername)
    const existing = await prisma.staffAccount.findFirst({
      where: {
        projectId,
        staffId,
        siteLoginUsername: trimmedUsername,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-49",
            message: "Nhân sự này đã có tài khoản với tên đăng nhập tương tự trên dự án.",
          },
        },
        { status: 400 }
      );
    }

    // Verify staff exists and active
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff || staff.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Nhân sự không tồn tại." } },
        { status: 404 }
      );
    }

    // Encrypt password (BR-11, BR-12, BR-13)
    const encrypted = encryptSitePassword(effectivePassword);

    const label = accountLabel?.trim() || `${staff.fullName} - ${trimmedUsername}`;

    const newAccount = await prisma.staffAccount.create({
      data: {
        projectId,
        staffId,
        accountLabel: label,
        siteLoginUsername: trimmedUsername,
        sitePasswordEncrypted: encrypted.ciphertext,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        status: "in_use",
        notes: notes?.trim() || null,
        lastRotatedAt: new Date(),
      },
      include: {
        staff: {
          select: { id: true, fullName: true, staffCode: true, corporateEmail: true },
        },
      },
    });

    // Audit log (never log raw password!)
    await recordAuditLog({
      userId: session.userId,
      actionCode: "ACCOUNT_CREATED",
      targetEntity: "staff_account",
      targetEntityId: newAccount.id,
      contextJson: {
        projectId,
        projectName: project.projectName,
        staffId,
        staffName: staff.fullName,
        siteLoginUsername: trimmedUsername,
      },
    });

    // Notify
    createSystemNotification({
      title: "Cấp phát tài khoản dự án",
      content: `Đã cấp tài khoản "${trimmedUsername}" cho nhân sự ${staff.fullName} tại dự án ${project.projectName}.`,
      type: "account",
      severity: "info",
      objectType: "project",
      objectId: projectId,
      targetUrl: `/projects/${projectId}`,
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      message: "Đã thêm tài khoản dự án thành công.",
      data: {
        id: newAccount.id,
        projectId: newAccount.projectId,
        staffId: newAccount.staffId,
        staff: newAccount.staff,
        accountLabel: newAccount.accountLabel,
        siteLoginUsername: newAccount.siteLoginUsername,
        status: newAccount.status,
        notes: newAccount.notes,
        createdAt: newAccount.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Add project account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi thêm tài khoản dự án." } },
      { status: 500 }
    );
  }
}
