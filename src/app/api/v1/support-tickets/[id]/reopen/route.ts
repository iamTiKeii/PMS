import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import { recordTicketHistory } from "@/lib/support-ticket";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/support-tickets/{id}/reopen - Mở lại ca đã hoàn thành
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return apiError("Không tìm thấy ca hỗ trợ", 404, "NOT_FOUND");
    }

    if (ticket.status !== "COMPLETED") {
      return apiError("Ca này chưa hoàn thành nên không cần mở lại", 400, "NOT_COMPLETED");
    }

    // Kiểm tra quyền mở lại ca
    const check = await checkUserPermission(session.userId, "support_tickets.reopen", {
      projectId: ticket.projectId,
    });
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền mở lại ca đã hoàn thành", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    if (!reason?.trim()) {
      return apiError("Vui lòng nhập lý do mở lại ca", 400, "REASON_REQUIRED");
    }

    // Chuyển lại trạng thái Chưa hoàn thành (IN_PROGRESS) và xóa kết quả hoàn tất tạm thời
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        resolvedAt: null,
        processingSeconds: null,
        totalSeconds: null,
        timeGroupId: null,
        version: { increment: 1 },
      },
      include: {
        project: { select: { id: true, projectCode: true, projectName: true } },
        createdByUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
        assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
        business: true,
        supportType: true,
        timeGroup: true,
        methods: { include: { method: true } },
      },
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Người dùng";

    // Ghi nhật ký mở lại ca kèm thông tin lần hoàn thành trước
    await recordTicketHistory({
      ticketId: id,
      actorUserId: session.userId,
      actorName,
      action: "reopened",
      beforeData: {
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        processingSeconds: ticket.processingSeconds,
        totalSeconds: ticket.totalSeconds,
        timeGroupId: ticket.timeGroupId,
      },
      afterData: {
        status: "IN_PROGRESS",
      },
      reason: reason.trim(),
    });

    return apiSuccess({
      ...updated,
      processingMinutes: null,
      totalMinutes: null,
      methods: updated.methods.map((m) => m.method),
    });
  } catch (error: any) {
    console.error("POST /api/v1/support-tickets/[id]/reopen error:", error);
    return apiError("Lỗi hệ thống khi mở lại ca", 500, "INTERNAL_ERROR");
  }
}
