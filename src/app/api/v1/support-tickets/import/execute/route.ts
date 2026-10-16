import { NextRequest } from "next/server";
import { getSessionUser, recordAuditLog } from "@/lib/auth";
import { checkUserPermission, getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import { executeSupportTicketImport, ValidatedImportTicket } from "@/lib/support-ticket-import";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/support-tickets/import/execute - Thực thi ghi nhận danh sách ca hợp lệ vào cơ sở dữ liệu
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

    const body = await request.json();
    const tickets = body.tickets as ValidatedImportTicket[];

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return apiError("Không có dòng dữ liệu hợp lệ nào để import", 400, "EMPTY_DATA");
    }

    if (tickets.length > 1000) {
      return apiError("Số dòng import vượt quá giới hạn 1.000 dòng/lần", 400, "EXCEED_LIMIT");
    }

    // Kiểm tra quyền trên danh sách dự án
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

    // Chuẩn hóa lại các trường kiểu Date từ JSON string
    const normalizedTickets: ValidatedImportTicket[] = [];
    for (const t of tickets) {
      if (allowedProjectIds !== null && !allowedProjectIds.includes(t.projectId)) {
        return apiError(`Bạn không có quyền thao tác trên dự án ${t.projectName}`, 403, "FORBIDDEN_PROJECT");
      }

      normalizedTickets.push({
        ...t,
        sentAt: new Date(t.sentAt),
        receivedAt: new Date(t.receivedAt),
        resolvedAt: t.resolvedAt ? new Date(t.resolvedAt) : null,
      });
    }

    // Lấy thông tin người import
    const actorUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = actorUser?.staff?.fullName || actorUser?.username || "Người dùng Import";

    // Thực thi lưu DB qua Prisma Transaction
    const result = await executeSupportTicketImport(normalizedTickets, session.userId, actorName);

    // Ghi nhận nhật ký kiểm toán hệ thống
    await recordAuditLog({
      userId: session.userId,
      actionCode: "IMPORT_SUPPORT_TICKETS",
      targetEntity: "support_tickets",
      targetEntityId: result.batchCode,
      contextJson: {
        batchCode: result.batchCode,
        successCount: result.successCount,
        createdTicketCodes: result.createdTicketCodes.slice(0, 50),
      },
    });

    return apiSuccess({
      successCount: result.successCount,
      createdTicketCodes: result.createdTicketCodes,
      batchCode: result.batchCode,
      message: `Đã nhập thành công ${result.successCount} ca hỗ trợ vào hệ thống (Lô: ${result.batchCode})`,
    });
  } catch (err: any) {
    console.error("Lỗi thực thi import ca hỗ trợ:", err);
    return apiError(err.message || "Lỗi lưu dữ liệu ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
