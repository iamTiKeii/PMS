import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// GET /api/v1/support-tickets/{id}/history - Lấy lịch sử thay đổi ca
export async function GET(
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
      select: { projectId: true },
    });

    if (!ticket) {
      return apiError("Không tìm thấy ca hỗ trợ", 404, "NOT_FOUND");
    }

    // Kiểm tra quyền xem lịch sử
    const check = await checkUserPermission(session.userId, "support_tickets.view_history", {
      projectId: ticket.projectId,
    });
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền xem lịch sử ca này", 403, "FORBIDDEN");
    }

    const history = await prisma.supportTicketHistory.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "desc" },
    });

    const parsedHistory = history.map((h) => ({
      id: h.id,
      ticketId: h.ticketId,
      actorUserId: h.actorUserId,
      actorName: h.actorName,
      action: h.action,
      beforeData: h.beforeData ? JSON.parse(h.beforeData) : null,
      afterData: h.afterData ? JSON.parse(h.afterData) : null,
      reason: h.reason,
      createdAt: h.createdAt,
    }));

    return apiSuccess(parsedHistory);
  } catch (error: any) {
    console.error("GET /api/v1/support-tickets/[id]/history error:", error);
    return apiError("Lỗi hệ thống khi tải lịch sử ca", 500, "INTERNAL_ERROR");
  }
}
