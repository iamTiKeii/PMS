import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission, getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import { validateSupportTicketsFromExcel } from "@/lib/support-ticket-import";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/support-tickets/import/validate - Tải file lên và kiểm tra tính hợp lệ
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.create");
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền import ca hỗ trợ", 403, "FORBIDDEN");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("Vui lòng đính kèm file Excel (.xlsx)", 400, "MISSING_FILE");
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return apiError("Định dạng file không hỗ trợ. Vui lòng chỉ tải lên file Excel có đuôi .xlsx", 400, "INVALID_FORMAT");
    }

    if (file.size > 10 * 1024 * 1024) {
      return apiError("Dung lượng file vượt quá giới hạn cho phép (tối đa 10MB)", 400, "FILE_TOO_LARGE");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Xác định danh sách dự án user được phân quyền
    const effective = await getEffectiveUserPermissions(session.userId);
    let allowedProjectIds: string[] | null = null;

    if (!effective?.isSystemAdmin && !effective?.scopes.some((s) => s.scopeType === "system")) {
      const projectScopeIds =
        effective?.scopes.filter((s) => s.scopeType === "project" && s.targetId).map((s) => s.targetId as string) || [];

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { staffId: true },
      });

      let assignedProjectIds: string[] = [];
      if (user?.staffId) {
        const assignments = await prisma.projectAssignment.findMany({
          where: { staffId: user.staffId, unassignedAt: null },
          select: { projectId: true },
        });
        assignedProjectIds = assignments.map((a) => a.projectId);
      }

      allowedProjectIds = Array.from(new Set([...projectScopeIds, ...assignedProjectIds]));
    }

    // Thực hiện kiểm tra toàn diện
    const validationResult = await validateSupportTicketsFromExcel(
      buffer,
      session.userId,
      allowedProjectIds
    );

    return apiSuccess({
      fileName: file.name,
      fileSizeBytes: file.size,
      totalRows: validationResult.totalRows,
      validRowsCount: validationResult.validRowsCount,
      errorRowsCount: validationResult.errorRowsCount,
      hasStructureError: validationResult.hasStructureError,
      structureErrorMessage: validationResult.structureErrorMessage,
      errors: validationResult.errors,
      validTickets: validationResult.validTickets,
      rawRows: validationResult.rawRows,
    });
  } catch (err: any) {
    console.error("Lỗi kiểm tra file import ca hỗ trợ:", err);
    return apiError(err.message || "Lỗi xử lý file Excel", 500, "INTERNAL_ERROR");
  }
}
