import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { hashPassword, generateRandomPassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// POST /api/users/import - Batch import system users from Excel (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await requireRole(["admin"]);
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Danh sách tài khoản import trống." } },
        { status: 400 }
      );
    }

    // Load existing usernames and linked staffIds
    const existingUsers = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { username: true, staffId: true },
    });

    const existingUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));
    const linkedStaffIds = new Set(existingUsers.map((u) => u.staffId).filter(Boolean) as string[]);

    // Load staff list to match staffIdentifier
    const staffList = await prisma.staff.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, staffCode: true, corporateEmail: true },
    });

    const staffMap = new Map<string, string>();
    for (const s of staffList) {
      staffMap.set(s.fullName.trim().toLowerCase(), s.id);
      if (s.staffCode) staffMap.set(s.staffCode.trim().toLowerCase(), s.id);
      if (s.corporateEmail) staffMap.set(s.corporateEmail.trim().toLowerCase(), s.id);
    }

    const validUsers: any[] = [];
    const errors: string[] = [];
    const seenUsernames = new Set<string>();
    const seenStaffIds = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rawUsername = String(item.username || "").trim();
      const rawPassword = item.password ? String(item.password).trim() : "";
      const rawRole = String(item.role || "user").trim().toLowerCase();
      const rawStatus = String(item.status || "active").trim().toLowerCase();
      const staffIdentifier = String(item.staffIdentifier || item.staffEmail || item.staffCode || item.staffName || "").trim().toLowerCase();

      if (!rawUsername) {
        errors.push(`Dòng ${i + 1}: Thiếu Tên đăng nhập.`);
        continue;
      }

      if (rawUsername.length < 3) {
        errors.push(`Dòng ${i + 1} (${rawUsername}): Tên đăng nhập phải có ít nhất 3 ký tự.`);
        continue;
      }

      const lowerUsername = rawUsername.toLowerCase();
      if (existingUsernames.has(lowerUsername) || seenUsernames.has(lowerUsername)) {
        errors.push(`Dòng ${i + 1} (${rawUsername}): Tên đăng nhập đã tồn tại trong hệ thống.`);
        continue;
      }

      // Validate role
      let role = "user";
      if (rawRole === "admin" || rawRole === "quản trị" || rawRole === "quan tri") {
        role = "admin";
      } else if (rawRole === "pm" || rawRole === "quản lý dự án" || rawRole === "project manager") {
        role = "pm";
      }

      // Validate status
      let status = "active";
      if (rawStatus === "locked" || rawStatus === "khóa") {
        status = "locked";
      } else if (rawStatus === "inactive" || rawStatus === "ngừng hoạt động") {
        status = "inactive";
      }

      // Resolve staffId if provided
      let staffId: string | null = null;
      if (staffIdentifier) {
        const foundStaffId = staffMap.get(staffIdentifier);
        if (!foundStaffId) {
          errors.push(`Dòng ${i + 1} (${rawUsername}): Không tìm thấy hồ sơ nhân sự khớp với "${item.staffIdentifier}".`);
          continue;
        }

        if (linkedStaffIds.has(foundStaffId) || seenStaffIds.has(foundStaffId)) {
          errors.push(`Dòng ${i + 1} (${rawUsername}): Nhân sự "${item.staffIdentifier}" đã được liên kết với một tài khoản khác.`);
          continue;
        }

        staffId = foundStaffId;
        seenStaffIds.add(foundStaffId);
      }

      // Password: use provided or fallback to a secure default
      const finalPassword = rawPassword || generateRandomPassword(10);
      const passwordHash = await hashPassword(finalPassword);

      seenUsernames.add(lowerUsername);

      validUsers.push({
        username: lowerUsername,
        passwordHash,
        role,
        status,
        staffId,
        mustChangePassword: true,
      });
    }

    if (validUsers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-400",
            message: "Không có tài khoản người dùng nào hợp lệ để nhập.",
            details: errors,
          },
        },
        { status: 400 }
      );
    }

    // Insert users
    await prisma.user.createMany({
      data: validUsers,
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "USERS_IMPORTED_EXCEL",
      targetEntity: "user",
      contextJson: {
        importedCount: validUsers.length,
        skippedCount: errors.length,
        errors: errors.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: validUsers.length,
        skippedCount: errors.length,
        errors,
      },
      message: `Đã nhập thành công ${validUsers.length} tài khoản người dùng từ Excel!${errors.length > 0 ? ` (Bỏ qua ${errors.length} dòng lỗi)` : ""}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Import users error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình import tài khoản người dùng." } },
      { status: 500 }
    );
  }
}
