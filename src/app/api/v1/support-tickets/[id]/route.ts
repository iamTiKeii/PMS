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

// GET /api/v1/support-tickets/{id} - Xem chi tiết ca hỗ trợ
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
      include: {
        project: {
          select: { id: true, projectCode: true, projectName: true },
        },
        createdByUser: {
          select: { id: true, username: true, staff: { select: { fullName: true } } },
        },
        assignedUser: {
          select: { id: true, username: true, staff: { select: { fullName: true } } },
        },
        business: true,
        supportType: true,
        timeGroup: true,
        methods: {
          include: {
            method: true,
          },
        },
      },
    });

    if (!ticket) {
      return apiError("Không tìm thấy ca hỗ trợ này", 404, "NOT_FOUND");
    }

    // Kiểm tra quyền xem dự án
    const check = await checkUserPermission(session.userId, "support_tickets.view", {
      projectId: ticket.projectId,
    });
    if (!check.allowed) {
      return apiError(check.reason || "Không có quyền xem ca thuộc dự án này", 403, "FORBIDDEN");
    }

    return apiSuccess({
      ...ticket,
      processingMinutes: ticket.processingSeconds !== null ? Math.round(ticket.processingSeconds / 60) : null,
      totalMinutes: ticket.totalSeconds !== null ? Math.round(ticket.totalSeconds / 60) : null,
      methods: ((ticket as any).methods || []).map((m: any) => m.method),
    });
  } catch (error: any) {
    console.error("GET /api/v1/support-tickets/[id] error:", error);
    return apiError("Lỗi hệ thống khi tải chi tiết ca", 500, "INTERNAL_ERROR");
  }
}

// PATCH /api/v1/support-tickets/{id} - Cập nhật ca hỗ trợ
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const currentTicket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        methods: true,
      },
    });

    if (!currentTicket) {
      return apiError("Không tìm thấy ca hỗ trợ", 404, "NOT_FOUND");
    }

    // Kiểm tra quyền: Nếu đã hoàn thành thì cần support_tickets.edit_completed
    const isCompleted = currentTicket.status === "COMPLETED";
    const requiredPerm = isCompleted ? "support_tickets.edit_completed" : "support_tickets.update";
    const permCheck = await checkUserPermission(session.userId, requiredPerm, {
      projectId: currentTicket.projectId,
    });
    if (!permCheck.allowed) {
      return apiError(
        permCheck.reason ||
          (isCompleted
            ? "Bạn không có quyền chỉnh sửa ca đã hoàn thành"
            : "Bạn không có quyền cập nhật ca hỗ trợ này"),
        403,
        "FORBIDDEN"
      );
    }

    const body = await request.json();
    const {
      requesterName,
      businessId,
      supportTypeId,
      description,
      cause,
      resolution,
      sentAt,
      receivedAt,
      resolvedAt,
      supportMethodIds,
      changeReason,
      version,
    } = body;

    // Kiểm tra xung đột cập nhật đồng thời (Optimistic locking)
    if (version !== undefined && version !== null && version !== currentTicket.version) {
      return apiError(
        "Dữ liệu đã được người khác cập nhật trước đó. Vui lòng tải lại trang.",
        409,
        "CONFLICT"
      );
    }

    const beforeSnapshot = {
      requesterName: currentTicket.requesterName,
      businessId: currentTicket.businessId,
      supportTypeId: currentTicket.supportTypeId,
      description: currentTicket.description,
      cause: currentTicket.cause,
      resolution: currentTicket.resolution,
      sentAt: currentTicket.sentAt,
      receivedAt: currentTicket.receivedAt,
      resolvedAt: currentTicket.resolvedAt,
      methodIds: currentTicket.methods.map((m) => m.methodId),
      status: currentTicket.status,
    };

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {
      version: { increment: 1 },
    };

    if (requesterName !== undefined) updateData.requesterName = requesterName.trim();
    if (businessId !== undefined) updateData.businessId = businessId;
    if (supportTypeId !== undefined) updateData.supportTypeId = supportTypeId || null;
    if (description !== undefined) updateData.description = description.trim();
    if (cause !== undefined) updateData.cause = cause ? cause.trim() : null;
    if (resolution !== undefined) updateData.resolution = resolution ? resolution.trim() : null;

    // Cập nhật timestamp nếu có
    const effectiveSent = sentAt ? new Date(sentAt) : currentTicket.sentAt;
    const effectiveReceived = receivedAt !== undefined ? (receivedAt ? new Date(receivedAt) : null) : currentTicket.receivedAt;
    const effectiveResolved = resolvedAt !== undefined ? (resolvedAt ? new Date(resolvedAt) : null) : currentTicket.resolvedAt;

    if (sentAt !== undefined) updateData.sentAt = effectiveSent;
    if (receivedAt !== undefined) updateData.receivedAt = effectiveReceived;
    if (resolvedAt !== undefined) updateData.resolvedAt = effectiveResolved;

    // Kiểm tra thứ tự mốc thời gian
    if (effectiveResolved && effectiveReceived && effectiveResolved.getTime() < effectiveReceived.getTime()) {
      return apiError("Thời điểm hoàn thành không được sớm hơn thời điểm tiếp nhận", 400, "INVALID_CHRONOLOGY");
    }

    // Tính lại thời lượng nếu có bất kỳ timestamp nào thay đổi
    if (sentAt !== undefined || receivedAt !== undefined || resolvedAt !== undefined) {
      const durations = await calculateTicketDurations(effectiveSent, effectiveReceived, effectiveResolved);
      updateData.processingSeconds = durations.processingSeconds;
      updateData.totalSeconds = durations.totalSeconds;
      updateData.timeGroupId = durations.timeGroupId;
    }

    // Lưu vào database
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: { id },
        data: updateData,
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          business: true,
          supportType: true,
          timeGroup: true,
        },
      });

      // Nếu cập nhật danh sách methods
      if (supportMethodIds && Array.isArray(supportMethodIds)) {
        await tx.supportTicketMethod.deleteMany({
          where: { ticketId: id },
        });
        for (const mId of supportMethodIds) {
          await tx.supportTicketMethod.create({
            data: {
              ticketId: id,
              methodId: mId,
            },
          });
        }
      }

      return ticket;
    });

    // Lấy thông tin người thao tác
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Người dùng";

    // Ghi nhật ký thay đổi
    await recordTicketHistory({
      ticketId: id,
      actorUserId: session.userId,
      actorName,
      action: "updated",
      beforeData: beforeSnapshot,
      afterData: {
        requesterName: updatedTicket.requesterName,
        businessId: updatedTicket.businessId,
        supportTypeId: updatedTicket.supportTypeId,
        description: updatedTicket.description,
        cause: updatedTicket.cause,
        resolution: updatedTicket.resolution,
        sentAt: updatedTicket.sentAt,
        receivedAt: updatedTicket.receivedAt,
        resolvedAt: updatedTicket.resolvedAt,
        processingSeconds: updatedTicket.processingSeconds,
        methodIds: supportMethodIds,
      },
      reason: changeReason || null,
    });

    const fullResult = await prisma.supportTicket.findUnique({
      where: { id },
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

    return apiSuccess({
      ...fullResult,
      processingMinutes: fullResult?.processingSeconds !== null ? Math.round((fullResult?.processingSeconds || 0) / 60) : null,
      totalMinutes: fullResult?.totalSeconds !== null ? Math.round((fullResult?.totalSeconds || 0) / 60) : null,
      methods: fullResult?.methods.map((m) => m.method) || [],
    });
  } catch (error: any) {
    console.error("PATCH /api/v1/support-tickets/[id] error:", error);
    return apiError("Lỗi hệ thống khi cập nhật ca", 500, "INTERNAL_ERROR");
  }
}
