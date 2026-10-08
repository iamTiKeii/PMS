import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { isValidUrl } from "@/lib/url-parser";
import prisma from "@/lib/prisma";

// POST /api/projects/import - Batch import projects from Excel (Admin or PM)
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Danh sách dự án import trống." } },
        { status: 400 }
      );
    }

    // Load existing projects to check uniqueness (BR-14)
    const existingProjects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { projectName: true, projectCode: true },
    });

    const existingNames = new Set(existingProjects.map((p) => p.projectName.trim().toLowerCase()));
    const existingCodes = new Set(
      existingProjects.map((p) => p.projectCode?.trim().toLowerCase()).filter(Boolean) as string[]
    );

    // Load active staff members to resolve assignments
    const activeStaff = await prisma.staff.findMany({
      where: { deletedAt: null },
      select: { id: true, fullName: true, staffCode: true, corporateEmail: true, status: true },
    });

    const staffMap = new Map<string, typeof activeStaff[0]>();
    for (const s of activeStaff) {
      staffMap.set(s.fullName.trim().toLowerCase(), s);
      if (s.staffCode) staffMap.set(s.staffCode.trim().toLowerCase(), s);
      if (s.corporateEmail) staffMap.set(s.corporateEmail.trim().toLowerCase(), s);
    }

    const validProjects: any[] = [];
    const errors: string[] = [];
    const seenNames = new Set<string>();
    const seenCodes = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const projectName = String(item.projectName || "").trim();
      const projectCode = item.projectCode ? String(item.projectCode).trim() : null;
      const systemHisUrl = String(item.systemHisUrl || "").trim();
      const defaultPassword = item.defaultPassword ? String(item.defaultPassword).trim() : null;
      const description = item.description ? String(item.description).trim() : null;

      // Status mapping
      let status = "active";
      const rawStatus = String(item.status || "").trim().toLowerCase();
      if (rawStatus === "maintenance" || rawStatus === "bảo trì") {
        status = "maintenance";
      } else if (rawStatus === "closed" || rawStatus === "đóng" || rawStatus === "kết thúc") {
        status = "closed";
      }

      if (!projectName) {
        errors.push(`Dòng ${i + 1}: Thiếu Tên dự án.`);
        continue;
      }

      const lowerName = projectName.toLowerCase();
      if (existingNames.has(lowerName) || seenNames.has(lowerName)) {
        errors.push(`Dòng ${i + 1} (${projectName}): Tên dự án đã tồn tại trong hệ thống.`);
        continue;
      }

      if (projectCode) {
        const lowerCode = projectCode.toLowerCase();
        if (existingCodes.has(lowerCode) || seenCodes.has(lowerCode)) {
          errors.push(`Dòng ${i + 1} (${projectName}): Mã dự án "${projectCode}" đã tồn tại.`);
          continue;
        }
        seenCodes.add(lowerCode);
      }

      if (!systemHisUrl) {
        errors.push(`Dòng ${i + 1} (${projectName}): Thiếu Đường dẫn hệ thống HIS.`);
        continue;
      }

      if (!isValidUrl(systemHisUrl)) {
        errors.push(`Dòng ${i + 1} (${projectName}): Link hệ thống không hợp lệ (cần bắt đầu bằng http:// hoặc https://).`);
        continue;
      }

      // Resolve assignments if provided
      const assignments: { staffId: string; tierLevel: number; isPrimary: boolean }[] = [];
      const assignedStaffIds = new Set<string>();
      let hasAssignmentError = false;

      const levelsToCheck = [
        { level: 1, val: item.level1Staff || item.level1 || item.leadStaff },
        { level: 2, val: item.level2Staff || item.level2 || item.pmStaff },
        { level: 3, val: item.level3Staff || item.level3 || item.directorStaff },
      ];

      for (const lvl of levelsToCheck) {
        if (!lvl.val) continue;
        const identifier = String(lvl.val).trim().toLowerCase();
        const found = staffMap.get(identifier);

        if (!found) {
          errors.push(`Dòng ${i + 1} (${projectName}): Không tìm thấy nhân sự Level ${lvl.level} "${lvl.val}".`);
          hasAssignmentError = true;
          break;
        }

        if (found.status !== "working") {
          errors.push(`Dòng ${i + 1} (${projectName}): Nhân sự "${found.fullName}" (Level ${lvl.level}) đã nghỉ việc.`);
          hasAssignmentError = true;
          break;
        }

        if (assignedStaffIds.has(found.id)) {
          errors.push(`Dòng ${i + 1} (${projectName}): Nhân sự "${found.fullName}" bị trùng giữa các cấp phụ trách.`);
          hasAssignmentError = true;
          break;
        }

        assignedStaffIds.add(found.id);
        assignments.push({
          staffId: found.id,
          tierLevel: lvl.level,
          isPrimary: true,
        });
      }

      if (hasAssignmentError) {
        continue;
      }

      seenNames.add(lowerName);

      validProjects.push({
        projectName,
        projectCode,
        systemHisUrl,
        defaultPassword,
        description,
        status,
        assignments,
      });
    }

    if (validProjects.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-400",
            message: "Không có dự án nào hợp lệ để nhập.",
            details: errors,
          },
        },
        { status: 400 }
      );
    }

    // Insert projects and their assignments in a transaction
    await prisma.$transaction(async (tx) => {
      for (const p of validProjects) {
        await tx.project.create({
          data: {
            projectName: p.projectName,
            projectCode: p.projectCode,
            systemHisUrl: p.systemHisUrl,
            defaultPassword: p.defaultPassword,
            description: p.description,
            status: p.status,
            assignments: p.assignments.length > 0
              ? {
                  create: p.assignments,
                }
              : undefined,
          },
        });
      }
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "PROJECTS_IMPORTED_EXCEL",
      targetEntity: "project",
      contextJson: {
        importedCount: validProjects.length,
        skippedCount: errors.length,
        errors: errors.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: validProjects.length,
        skippedCount: errors.length,
        errors,
      },
      message: `Đã nhập thành công ${validProjects.length} dự án từ Excel!${errors.length > 0 ? ` (Bỏ qua ${errors.length} dòng lỗi)` : ""}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Import projects error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình import dự án." } },
      { status: 500 }
    );
  }
}
