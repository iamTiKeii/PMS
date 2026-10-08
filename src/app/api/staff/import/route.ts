import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/staff/import - Batch import staff members from Excel (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await requireRole(["admin"]);
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Danh sách nhân sự import trống." } },
        { status: 400 }
      );
    }

    // Load existing emails and staffCodes to check duplicates
    const [existingStaff] = await Promise.all([
      prisma.staff.findMany({
        where: { deletedAt: null },
        select: { staffCode: true, corporateEmail: true },
      }),
    ]);

    const existingEmails = new Set(existingStaff.map((s) => s.corporateEmail?.toLowerCase()).filter(Boolean));
    const existingCodes = new Set(existingStaff.map((s) => s.staffCode?.toLowerCase()).filter(Boolean));

    const validStaff: any[] = [];
    const errors: string[] = [];

    const seenEmails = new Set<string>();
    const seenCodes = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const fullName = String(item.fullName || "").trim();
      const staffCode = item.staffCode ? String(item.staffCode).trim() : null;
      const corporateEmail = item.corporateEmail ? String(item.corporateEmail).trim() : null;
      const phoneNumber = item.phoneNumber ? String(item.phoneNumber).trim() : null;
      const department = item.department ? String(item.department).trim() : null;
      const status = item.status === "left" ? "left" : "working";

      let joinDate: Date | null = null;
      if (item.joinDate) {
        const parsed = new Date(item.joinDate);
        if (!isNaN(parsed.getTime())) {
          joinDate = parsed;
        }
      }

      if (!fullName) {
        errors.push(`Dòng ${i + 1}: Thiếu Họ và tên.`);
        continue;
      }

      if (corporateEmail) {
        const lowerEmail = corporateEmail.toLowerCase();
        if (existingEmails.has(lowerEmail) || seenEmails.has(lowerEmail)) {
          errors.push(`Dòng ${i + 1} (${fullName}): Email "${corporateEmail}" đã tồn tại.`);
          continue;
        }
        seenEmails.add(lowerEmail);
      }

      if (staffCode) {
        const lowerCode = staffCode.toLowerCase();
        if (existingCodes.has(lowerCode) || seenCodes.has(lowerCode)) {
          errors.push(`Dòng ${i + 1} (${fullName}): Mã NV "${staffCode}" đã tồn tại.`);
          continue;
        }
        seenCodes.add(lowerCode);
      }

      validStaff.push({
        fullName,
        staffCode,
        corporateEmail,
        phoneNumber,
        department,
        status,
        joinDate,
      });
    }

    if (validStaff.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-400",
            message: "Không có hồ sơ nhân sự nào hợp lệ để nhập.",
            details: errors,
          },
        },
        { status: 400 }
      );
    }

    await prisma.staff.createMany({
      data: validStaff,
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "STAFF_IMPORTED_EXCEL",
      targetEntity: "staff",
      contextJson: {
        importedCount: validStaff.length,
        skippedCount: errors.length,
        errors: errors.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: validStaff.length,
        skippedCount: errors.length,
        errors,
      },
      message: `Đã nhập thành công ${validStaff.length} nhân sự từ Excel!${errors.length > 0 ? ` (Bỏ qua ${errors.length} dòng lỗi)` : ""}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Import staff error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình import nhân sự." } },
      { status: 500 }
    );
  }
}
