import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import { calculateTicketDurations, recordTicketHistory } from "@/lib/support-ticket";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/support-tickets/{id}/complete - Xác nhận hoàn thành ca
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

    if (ticket.status === "COMPLETED") {
      return apiError("Ca hỗ trợ này đã được hoàn thành trước đó", 400, "ALREADY_COMPLETED");
    }

    // Kiểm tra quyền hoàn thành
    const check = await checkUserPermission(session.userId, "support_tickets.complete", {
      projectId: ticket.projectId,
    });
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền hoàn thành ca này", 403, "FORBIDDEN");
    }

    const body = await request.json().catch(() => ({}));
    const { resolvedAt, resolution, cause, supportTypeId } = body;

    // Bắt buộc cách xử lý khi hoàn thành (Quy tắc 2.2)
    const effectiveResolution = resolution?.trim() || ticket.resolution?.trim();
    if (!effectiveResolution) {
      return apiError("Vui lòng nhập Cách xử lý trước khi hoàn thành ca", 400, "RESOLUTION_REQUIRED");
    }

    // Thời điểm hoàn thành
    const resolvedDate = resolvedAt ? new Date(resolvedAt) : new Date();
    if (isNaN(resolvedDate.getTime())) {
      return apiError("Thời điểm hoàn thành không hợp lệ", 400, "INVALID_TIMESTAMP");
    }

    // Kiểm tra thứ tự thời gian
    const baseReceiveDate = ticket.receivedAt || ticket.sentAt;
    if (resolvedDate.getTime() < baseReceiveDate.getTime()) {
      return apiError(
        "Thời điểm hoàn thành không được sớm hơn thời điểm tiếp nhận",
        400,
        "INVALID_CHRONOLOGY"
      );
    }

    // Tính toán thời lượng và nhóm thời gian
    const durations = await calculateTicketDurations(ticket.sentAt, ticket.receivedAt, resolvedDate);

    // Cập nhật ticket
    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: "COMPLETED",
        resolvedAt: resolvedDate,
        resolution: effectiveResolution,
        cause: cause !== undefined ? (cause?.trim() || null) : ticket.cause,
        supportTypeId: supportTypeId !== undefined ? (supportTypeId || null) : ticket.supportTypeId,
        processingSeconds: durations.processingSeconds,
        totalSeconds: durations.totalSeconds,
        timeGroupId: durations.timeGroupId,
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

    // Ghi nhật ký
    await recordTicketHistory({
      ticketId: id,
      actorUserId: session.userId,
      actorName,
      action: "completed",
      beforeData: { status: ticket.status, resolvedAt: ticket.resolvedAt },
      afterData: {
        status: updated.status,
        resolvedAt: updated.resolvedAt,
        processingMinutes: durations.processingMinutes,
        totalMinutes: durations.totalMinutes,
        timeGroupId: durations.timeGroupId,
        resolution: updated.resolution,
      },
    });

    return apiSuccess({
      ...updated,
      processingMinutes: durations.processingMinutes,
      totalMinutes: durations.totalMinutes,
      methods: updated.methods.map((m) => m.method),
    });
  } catch (error: any) {
    console.error("POST /api/v1/support-tickets/[id]/complete error:", error);
    return apiError("Lỗi hệ thống khi xác nhận hoàn thành", 500, "INTERNAL_ERROR");
  }
}
