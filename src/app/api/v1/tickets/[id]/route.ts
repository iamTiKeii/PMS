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

/**
 * GET /api/v1/tickets/[id] - Chi tiết ca hỗ trợ
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "MSG-05");
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, projectCode: true, projectName: true } },
        createdByUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
        assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
        business: true,
        supportType: true,
        timeGroup: true,
        methods: { include: { method: true } },
        history: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!ticket) {
      return apiError("Ca hỗ trợ không tồn tại hoặc đã bị xóa.", 404, "MSG-113");
    }

    return apiSuccess({
      ...ticket,
      ticket_no: ticket.ticketCode,
      status: ticket.status === "COMPLETED" ? "done" : "pending",
    });
  } catch (error: any) {
    console.error("GET /api/v1/tickets/[id] error:", error);
    return apiError("Lỗi hệ thống khi tải chi tiết ca", 500, "INTERNAL_ERROR");
  }
}

/**
 * PUT /api/v1/tickets/[id] - Cập nhật ca hỗ trợ (Optimistic locking version, BR-51)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "MSG-05");
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      include: { methods: true },
    });

    if (!existing) {
      return apiError("Ca hỗ trợ không tồn tại hoặc đã bị xóa.", 404, "MSG-113");
    }

    // Kiểm tra quyền: Chỉ chủ ca hoặc Admin mới được sửa (BR-43)
    const isAdmin = session.role === "admin";
    const isOwner = existing.createdById === session.userId || existing.assignedUserId === session.userId;
    if (!isAdmin && !isOwner) {
      return apiError("Bạn không có quyền thực hiện thao tác này.", 403, "MSG-06");
    }

    // Kiểm tra khóa lạc quan version (BR-51, MSG-97)
    if (body.version !== undefined && body.version !== existing.version) {
      return apiError("Ca hỗ trợ đã được người khác thay đổi. Vui lòng tải lại bản mới nhất.", 409, "MSG-97");
    }

    const requesterName = body.requester_name || body.requesterName || existing.requesterName;
    const businessId = body.business_id || body.businessId || existing.businessId;
    const declarationTypeId = body.declaration_type_id !== undefined ? body.declaration_type_id : (body.supportTypeId !== undefined ? body.supportTypeId : existing.supportTypeId);
    const description = body.description || existing.description;
    const cause = body.cause !== undefined ? body.cause : existing.cause;
    const resolution = body.resolution !== undefined ? body.resolution : existing.resolution;
    const sentAt = body.sent_at || body.sentAt ? new Date(body.sent_at || body.sentAt) : existing.sentAt;
    const receivedAt = body.received_at || body.receivedAt ? new Date(body.received_at || body.receivedAt) : existing.receivedAt;
    const resolvedAt = body.resolved_at !== undefined ? (body.resolved_at ? new Date(body.resolved_at) : null) : (body.resolvedAt !== undefined ? (body.resolvedAt ? new Date(body.resolvedAt) : null) : existing.resolvedAt);
    
    let isDone = existing.status === "COMPLETED";
    if (body.status) {
      isDone = body.status === "done" || body.status === "COMPLETED";
    } else if (resolvedAt) {
      isDone = true;
    }

    // Validate logic khi hoàn thành
    if (isDone) {
      if (!resolvedAt) {
        return apiError("Ca hoàn thành cần có thời điểm xử lý xong.", 422, "MSG-96");
      }
      if (receivedAt && resolvedAt.getTime() < receivedAt.getTime() - 60000) {
        return apiError("Thời điểm xử lý xong không được trước thời điểm nhận ca.", 422, "MSG-92");
      }
      if (!resolution?.trim()) {
        return apiError("Ca hoàn thành cần có cách xử lý.", 422, "MSG-96");
      }
    }

    // Đổi người phụ trách: chỉ Admin được đổi (BR-37)
    let assignedUserId = existing.assignedUserId;
    if (body.assigned_user_id || body.assignedUserId) {
      if (isAdmin) {
        assignedUserId = body.assigned_user_id || body.assignedUserId;
      }
    }

    const durations = await calculateTicketDurations(sentAt, receivedAt, isDone ? resolvedAt : null);

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: { id },
        data: {
          requesterName: requesterName.trim(),
          businessId,
          supportTypeId: declarationTypeId || null,
          description: description.trim(),
          cause: cause?.trim() || null,
          resolution: resolution?.trim() || null,
          sentAt,
          receivedAt,
          resolvedAt: isDone ? resolvedAt : null,
          processingSeconds: durations.processingSeconds,
          totalSeconds: durations.totalSeconds,
          timeGroupId: durations.timeGroupId,
          status: isDone ? "COMPLETED" : "IN_PROGRESS",
          assignedUserId,
          version: existing.version + 1,
        },
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          business: true,
          supportType: true,
          timeGroup: true,
          methods: { include: { method: true } },
        },
      });

      // Cập nhật phương thức nếu có gửi
      const newMethodIds = body.supportMethodIds || (body.channel_id ? [body.channel_id] : null);
      if (newMethodIds && Array.isArray(newMethodIds)) {
        await tx.supportTicketMethod.deleteMany({ where: { ticketId: id } });
        for (const mId of newMethodIds) {
          await tx.supportTicketMethod.create({
            data: { ticketId: id, methodId: mId },
          });
        }
      }

      return ticket;
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Hệ thống";

    await recordTicketHistory({
      ticketId: id,
      actorUserId: session.userId,
      actorName,
      action: "updated",
      beforeData: { version: existing.version, status: existing.status },
      afterData: { version: updated.version, status: updated.status },
    });

    return apiSuccess({
      ...updated,
      ticket_no: updated.ticketCode,
      status: updated.status === "COMPLETED" ? "done" : "pending",
    });
  } catch (error: any) {
    console.error("PUT /api/v1/tickets/[id] error:", error);
    return apiError("Lỗi hệ thống khi cập nhật ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}

/**
 * DELETE /api/v1/tickets/[id] - Xóa ca hỗ trợ (Xóa mềm hoặc cascade, BR-43)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "MSG-05");
    }

    const { id } = await params;
    const existing = await prisma.supportTicket.findUnique({ where: { id } });

    if (!existing) {
      return apiError("Ca hỗ trợ không tồn tại hoặc đã bị xóa.", 404, "MSG-113");
    }

    const isAdmin = session.role === "admin";
    const isOwner = existing.createdById === session.userId || existing.assignedUserId === session.userId;
    if (!isAdmin && !isOwner) {
      return apiError("Bạn không có quyền thực hiện thao tác này.", 403, "MSG-06");
    }

    await prisma.$transaction([
      prisma.supportTicketMethod.deleteMany({ where: { ticketId: id } }),
      prisma.supportTicketHistory.deleteMany({ where: { ticketId: id } }),
      prisma.supportTicket.delete({ where: { id } }),
    ]);

    return apiSuccess({ deleted: true, message: "Đã xóa ca hỗ trợ thành công." });
  } catch (error: any) {
    console.error("DELETE /api/v1/tickets/[id] error:", error);
    return apiError("Lỗi hệ thống khi xóa ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
