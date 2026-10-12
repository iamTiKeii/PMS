import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { encryptSitePassword } from "@/lib/crypto";
import { createSystemNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/vault/accounts - Danh sách tài khoản trong Két (Mật khẩu được che mặc định)
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const projectId = searchParams.get("projectId") || "";
    const staffId = searchParams.get("staffId") || "";
    const status = searchParams.get("status") || "";
    const ownerOnly = searchParams.get("ownerOnly") === "true";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { accountLabel: { contains: q } },
        { siteLoginUsername: { contains: q } },
        { notes: { contains: q } },
        { url: { contains: q } },
        { project: { projectName: { contains: q } } },
        { staff: { fullName: { contains: q } } },
      ];
    }

    if (projectId && projectId !== "all") where.projectId = projectId;
    if (staffId && staffId !== "all") where.staffId = staffId;
    if (status && status !== "all") where.status = status;

    // Filter by owner if requested
    if (ownerOnly) {
      where.OR = [
        { ownerUserId: session.userId },
        ...(session.staffId ? [{ staffId: session.staffId }] : []),
      ];
    }

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
        ownerUser: {
          select: {
            id: true,
            username: true,
            staff: { select: { fullName: true } },
          },
        },
        createdByUser: {
          select: {
            id: true,
            username: true,
            staff: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeAccounts = accounts.map((acc) => {
      // Xác định quyền sở hữu: tài khoản gắn với user ID hoặc staff ID của phiên hiện tại
      const isOwner =
        acc.ownerUserId === session.userId ||
        (session.staffId && acc.staffId === session.staffId);

      const passwordStatus = acc.passwordStatus || "DEFAULT";

      // QUY TẮC NGHIỆP VỤ 1 & 2:
      // - Nếu passwordStatus === "DEFAULT": Được xem mà không cần PIN (chủ sở hữu, thành viên dự án hoặc admin)
      // - Nếu passwordStatus === "CUSTOM": Mật khẩu đã đổi -> Riêng tư! CHỈ chủ sở hữu mới được xem (bắt buộc PIN).
      const isProjectMember = assignedProjectIds.has(acc.projectId);
      const canReveal = passwordStatus === "DEFAULT"
        ? Boolean(isOwner || session.role === "admin" || isProjectMember)
        : Boolean(isOwner);

      const requiresPin = passwordStatus === "CUSTOM";
      const canRevealWithoutPin = passwordStatus === "DEFAULT" && canReveal;

      // Quyền chỉnh sửa / xóa: Admin, PM hoặc chủ sở hữu tài khoản
      const canManage = Boolean(session.role === "admin" || session.role === "pm" || isOwner);

      return {
        id: acc.id,
        name: acc.accountLabel,
        accountLabel: acc.accountLabel,
        username: acc.siteLoginUsername,
        siteLoginUsername: acc.siteLoginUsername,
        maskedPassword: "••••••••••••",
        password: null, // Bảo mật: không bao giờ trả mật khẩu rõ ở danh sách
        passwordStatus,
        passwordChangedAt: acc.passwordChangedAt,
        url: acc.url || acc.project?.systemHisUrl || null,
        projectId: acc.projectId,
        project: acc.project,
        staffId: acc.staffId,
        staff: acc.staff,
        ownerUserId: acc.ownerUserId,
        ownerUser: acc.ownerUser
          ? {
              id: acc.ownerUser.id,
              username: acc.ownerUser.username,
              fullName: acc.ownerUser.staff?.fullName || acc.ownerUser.username,
            }
          : null,
        createdById: acc.createdById,
        createdByUser: acc.createdByUser
          ? {
              id: acc.createdByUser.id,
              username: acc.createdByUser.username,
              fullName: acc.createdByUser.staff?.fullName || acc.createdByUser.username,
            }
          : null,
        status: acc.status,
        notes: acc.notes,
        isOwner: Boolean(isOwner),
        canReveal,
        requiresPin,
        canRevealWithoutPin,
        canManage,
        lastRotatedAt: acc.lastRotatedAt,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
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
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách tài khoản Két." } },
      { status: 500 }
    );
  }
}

// POST /api/vault/accounts - Tạo tài khoản mới trong Két
// Đặc tả 2.1: Tất cả nhân sự có tài khoản hoạt động đều được phép tạo tài khoản mới trong Két,
// không phụ thuộc việc được gán LV1, LV2 hay LV3.
export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    // Verify user is active
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });

    if (!currentUser || currentUser.status !== "active" || currentUser.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MSG-04", message: "Tài khoản của bạn đã bị khóa hoặc không ở trạng thái hoạt động." },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      accountLabel,
      username,
      siteLoginUsername,
      password,
      sitePassword,
      url,
      projectId,
      staffId,
      ownerUserId,
      notes,
      status = "in_use",
    } = body;

    const finalUsername = (username || siteLoginUsername || "").trim();
    const rawPassword = password || sitePassword;

    if (!finalUsername) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập Tên đăng nhập (username)." } },
        { status: 400 }
      );
    }

    // 1. Resolve Project
    let finalProjectId = projectId;
    let targetProject: any = null;

    if (finalProjectId && finalProjectId !== "all") {
      targetProject = await prisma.project.findFirst({
        where: { id: finalProjectId, deletedAt: null },
      });
    }

    if (!targetProject) {
      // If no valid projectId specified, link to first available project
      targetProject = await prisma.project.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      if (!targetProject) {
        // Fallback: auto-create a default general project if database has none
        targetProject = await prisma.project.create({
          data: {
            projectName: "Két Chung & Dịch vụ Số",
            projectCode: "VAULT-COMMON",
            systemHisUrl: "https://pms.local",
            status: "active",
            description: "Dự án quản lý tài khoản dịch vụ chung",
          },
        });
      }
      finalProjectId = targetProject.id;
    }

    // 2. Resolve Password
    let finalPassword = rawPassword ? String(rawPassword).trim() : "";
    if (!finalPassword) {
      if (targetProject.defaultPassword) {
        finalPassword = targetProject.defaultPassword;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-01",
              message: "Vui lòng nhập mật khẩu cho tài khoản.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Resolve account label / name
    const finalLabel = (name || accountLabel || "").trim() || `Tài khoản - ${finalUsername}`;

    // 4. Resolve owner and creator
    // Default owner: current user, or explicitly specified owner if admin
    const finalOwnerUserId =
      session.role === "admin" && ownerUserId ? ownerUserId : session.userId;
    const finalStaffId = staffId || currentUser.staffId || null;

    // 5. Encrypt password using AES-256-GCM
    const enc = encryptSitePassword(finalPassword);

    const isDefault = Boolean(targetProject.defaultPassword && finalPassword === targetProject.defaultPassword);
    const passwordStatus = isDefault ? "DEFAULT" : "CUSTOM";
    const passwordChangedAt = isDefault ? null : new Date();

    const newAccount = await prisma.staffAccount.create({
      data: {
        projectId: finalProjectId,
        staffId: finalStaffId,
        ownerUserId: finalOwnerUserId,
        createdById: session.userId,
        accountLabel: finalLabel,
        siteLoginUsername: finalUsername,
        sitePasswordEncrypted: enc.ciphertext,
        encryptionIv: enc.iv,
        encryptionAuthTag: enc.authTag,
        passwordStatus,
        passwordChangedAt,
        url: url ? String(url).trim() : null,
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
        siteUsername: newAccount.siteLoginUsername,
        projectName: newAccount.project?.projectName,
        ownerUserId: finalOwnerUserId,
      },
    });

    createSystemNotification({
      title: "Tài khoản Két mới",
      content: `Tài khoản "${newAccount.accountLabel}" (${newAccount.siteLoginUsername}) vừa được thêm vào Két bởi ${currentUser.staff?.fullName || currentUser.username}.`,
      type: "account",
      severity: "info",
      objectType: "account",
      objectId: newAccount.id,
      targetUrl: "/vault",
      createdById: session.userId,
      actorName: currentUser.staff?.fullName || currentUser.username,
    }).catch((e) => console.error("Notification dispatch error:", e));

    return NextResponse.json({
      success: true,
      message: "Tạo tài khoản trong Két thành công (đã mã hóa an toàn AES-256-GCM).",
      data: {
        id: newAccount.id,
        name: newAccount.accountLabel,
        accountLabel: newAccount.accountLabel,
        username: newAccount.siteLoginUsername,
        siteLoginUsername: newAccount.siteLoginUsername,
        maskedPassword: "••••••••••••",
        url: newAccount.url,
        status: newAccount.status,
        ownerUserId: newAccount.ownerUserId,
        createdById: newAccount.createdById,
        createdAt: newAccount.createdAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Create vault account error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo tài khoản trong Két." } },
      { status: 500 }
    );
  }
}
