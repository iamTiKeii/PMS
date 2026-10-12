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

// POST /api/v1/support-tickets/{id}/assign - Đổi nhân sự phụ trách
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
      include: {
        assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
      },
    });

    if (!ticket) {
      return apiError("Không tìm thấy ca hỗ trợ", 404, "NOT_FOUND");
    }

    // Kiểm tra quyền đổi nhân sự phụ trách
    const check = await checkUserPermission(session.userId, "support_tickets.assign", {
      projectId: ticket.projectId,
    });
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền đổi nhân sự phụ trách ca", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { assignedUserId, reason } = body;

    if (!assignedUserId) {
      return apiError("Vui lòng chọn nhân sự phụ trách mới", 400, "ASSIGNEE_REQUIRED");
    }

    // Kiểm tra người được phân công có tồn tại không
    const targetUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
      include: { staff: true },
    });
    if (!targetUser || targetUser.deletedAt || targetUser.status !== "active") {
      return apiError("Nhân sự được phân công không hợp lệ hoặc đang bị khóa", 400, "INVALID_ASSIGNEE");
    }

    const oldAssigneeName = ticket.assignedUser.staff?.fullName || ticket.assignedUser.username;
    const newAssigneeName = targetUser.staff?.fullName || targetUser.username;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedUserId,
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

    // Ghi nhật ký đổi nhân sự phụ trách
    await recordTicketHistory({
      ticketId: id,
      actorUserId: session.userId,
      actorName,
      action: "assigned",
      beforeData: {
        assignedUserId: ticket.assignedUserId,
        assignedUserName: oldAssigneeName,
      },
      afterData: {
        assignedUserId: updated.assignedUserId,
        assignedUserName: newAssigneeName,
      },
      reason: reason || null,
    });

    return apiSuccess({
      ...updated,
      methods: updated.methods.map((m) => m.method),
    });
  } catch (error: any) {
    console.error("POST /api/v1/support-tickets/[id]/assign error:", error);
    return apiError("Lỗi hệ thống khi phân công nhân sự", 500, "INTERNAL_ERROR");
  }
}
