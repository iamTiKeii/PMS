import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission, getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import {
  generateNextTicketCode,
  calculateTicketDurations,
  recordTicketHistory,
} from "@/lib/support-ticket";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/v1/tickets - Danh sách ca hỗ trợ (SRS 8D.4, UC-41, UC-49)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "MSG-05");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.view");
    if (!check.allowed) {
      return apiError("Bạn không có quyền thực hiện thao tác này.", 403, "MSG-06");
    }

    const searchParams = request.nextUrl.searchParams;

    const projectId = searchParams.get("project_id") || searchParams.get("projectId");
    const supportDate = searchParams.get("support_date") || searchParams.get("supportDate");
    const fromDate = searchParams.get("from") || searchParams.get("fromDate");
    const toDate = searchParams.get("to") || searchParams.get("toDate");
    const statusParam = searchParams.get("status");
    const mine = searchParams.get("mine") === "1" || searchParams.get("mine") === "true";
    const assigneeId = searchParams.get("assignee_id") || searchParams.get("assignedUserId");
    const businessId = searchParams.get("business_id") || searchParams.get("businessId");
    const channelId = searchParams.get("channel_id") || searchParams.get("supportMethodId");
    const declarationTypeId = searchParams.get("declaration_type_id") || searchParams.get("supportTypeId");
    const timeGroupId = searchParams.get("time_group_id") || searchParams.get("timeGroupId");
    const q = searchParams.get("q")?.trim();
    
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("size") || searchParams.get("pageSize") || "20", 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (mine) {
      where.assignedUserId = session.userId;
    } else if (assigneeId) {
      where.assignedUserId = assigneeId;
    }

    if (statusParam && statusParam !== "ALL") {
      if (statusParam === "done" || statusParam === "COMPLETED") {
        where.status = "COMPLETED";
      } else if (statusParam === "pending" || statusParam === "IN_PROGRESS") {
        where.status = "IN_PROGRESS";
      } else {
        where.status = statusParam;
      }
    }

    if (businessId) where.businessId = businessId;
    if (declarationTypeId) where.supportTypeId = declarationTypeId;
    if (timeGroupId) where.timeGroupId = timeGroupId;

    if (channelId) {
      where.methods = {
        some: { methodId: channelId },
      };
    }

    // Lọc theo ngày trực hoặc khoảng thời gian
    if (supportDate) {
      const dayStart = new Date(supportDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(supportDate);
      dayEnd.setHours(23, 59, 59, 999);
      where.sentAt = { gte: dayStart, lte: dayEnd };
    } else if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.sentAt = dateFilter;
    }

    if (q) {
      where.OR = [
        { ticketCode: { contains: q } },
        { requesterName: { contains: q } },
        { description: { contains: q } },
        { cause: { contains: q } },
        { resolution: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          createdByUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
          assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
          business: true,
          supportType: true,
          timeGroup: true,
          methods: { include: { method: true } },
        },
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    const formatted = items.map((t) => {
      const procMin = t.processingSeconds !== null ? Math.round(t.processingSeconds / 60) : null;
      const totMin = t.totalSeconds !== null ? Math.round(t.totalSeconds / 60) : null;
      const respMin = (t.receivedAt && t.sentAt) ? Math.round((t.receivedAt.getTime() - t.sentAt.getTime()) / 60000) : 0;
      const dateStr = t.sentAt.toISOString().slice(0, 10);

      return {
        id: t.id,
        ticket_no: t.ticketCode,
        ticketCode: t.ticketCode,
        version: t.version,
        project: {
          id: t.project.id,
          name: t.project.projectName,
          code: t.project.projectCode,
        },
        projectId: t.projectId,
        support_date: dateStr,
        supportDate: dateStr,
        requester_name: t.requesterName,
        requesterName: t.requesterName,
        business: t.business ? { id: t.business.id, name: t.business.name, code: t.business.code } : null,
        business_id: t.businessId,
        assignee: {
          id: t.assignedUser.id,
          username: t.assignedUser.username,
          full_name: t.assignedUser.staff?.fullName || t.assignedUser.username,
        },
        channel: t.methods[0]?.method ? { id: t.methods[0].method.id, name: t.methods[0].method.name, code: t.methods[0].method.code } : null,
        channels: t.methods.map((m) => ({ id: m.method.id, name: m.method.name, code: m.method.code })),
        declaration_type: t.supportType ? { id: t.supportType.id, name: t.supportType.name, code: t.supportType.code } : null,
        description: t.description,
        cause: t.cause,
        resolution: t.resolution,
        sent_at: t.sentAt.toISOString(),
        received_at: t.receivedAt ? t.receivedAt.toISOString() : null,
        resolved_at: t.resolvedAt ? t.resolvedAt.toISOString() : null,
        response_minutes: respMin >= 0 ? respMin : 0,
        total_minutes: procMin !== null ? procMin : totMin,
        time_group: t.timeGroup ? { id: t.timeGroup.id, code: t.timeGroup.code, name: t.timeGroup.name } : null,
        status: t.status === "COMPLETED" ? "done" : "pending",
        source: "extension",
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      };
    });

    return apiSuccess({
      items: formatted,
      total,
      page,
      size: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("GET /api/v1/tickets error:", error);
    return apiError("Lỗi hệ thống khi tải ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/v1/tickets - Tạo ca hỗ trợ mới (SRS 8D.4, UC-42)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "MSG-05");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.create");
    if (!check.allowed) {
      return apiError("Bạn không có quyền thực hiện thao tác này.", 403, "MSG-06");
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;

    // Chống tạo trùng lặp với Idempotency-Key
    if (idempotencyKey) {
      const existing = await prisma.supportTicket.findUnique({
        where: { idempotencyKey },
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          business: true,
          supportType: true,
          timeGroup: true,
          methods: { include: { method: true } },
          assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
        },
      });
      if (existing) {
        return apiSuccess({
          id: existing.id,
          ticket_no: existing.ticketCode,
          version: existing.version,
          project: { id: existing.project.id, name: existing.project.projectName },
          status: existing.status === "COMPLETED" ? "done" : "pending",
        }, 200);
      }
    }

    const body = await request.json();
    const projectId = body.project_id || body.projectId;
    const requesterName = body.requester_name || body.requesterName;
    const businessId = body.business_id || body.businessId;
    const channelId = body.channel_id;
    const supportMethodIds = body.supportMethodIds || (channelId ? [channelId] : []);
    const declarationTypeId = body.declaration_type_id || body.supportTypeId;
    const description = body.description;
    const cause = body.cause;
    const resolution = body.resolution;
    const sentAt = body.sent_at || body.sentAt;
    const receivedAt = body.received_at || body.receivedAt;
    const resolvedAt = body.resolved_at || body.resolvedAt;
    const statusParam = body.status;
    const totalMinutesInput = body.total_minutes;

    // Validation các trường bắt buộc
    if (!projectId) return apiError("Vui lòng chọn Dự án.", 422, "MSG-01");
    if (!requesterName?.trim()) return apiError("Vui lòng nhập Người dùng yêu cầu hỗ trợ.", 422, "MSG-01");
    if (!businessId) return apiError("Vui lòng chọn Nghiệp vụ cần hỗ trợ.", 422, "MSG-01");
    if (!description?.trim()) return apiError("Vui lòng nhập Mô tả vấn đề cần hỗ trợ.", 422, "MSG-01");
    if (!sentAt) return apiError("Vui lòng nhập Thời gian người dùng gửi ca (T1).", 422, "MSG-01");
    if (!supportMethodIds || supportMethodIds.length === 0) {
      return apiError("Vui lòng chọn ít nhất một Phương thức hỗ trợ.", 422, "MSG-01");
    }

    // Thời gian
    const sentDate = new Date(sentAt);
    const receivedDate = receivedAt ? new Date(receivedAt) : new Date(sentDate);
    const resolvedDate = resolvedAt ? new Date(resolvedAt) : null;

    if (isNaN(sentDate.getTime()) || isNaN(receivedDate.getTime())) {
      return apiError("Định dạng thời gian không hợp lệ. Vui lòng nhập hh:mm dd/mm/yyyy.", 422, "MSG-93");
    }

    // Ràng buộc thời gian: T1 <= T2
    if (receivedDate.getTime() < sentDate.getTime() - 60000) { // dung sai 1 phút
      return apiError("Thời điểm nhận ca không được trước thời gian người dùng gửi ca.", 422, "MSG-91");
    }

    // Ràng buộc: Không ở tương lai quá 5 phút so với máy chủ
    const nowMs = Date.now();
    if (sentDate.getTime() > nowMs + 5 * 60 * 1000 || receivedDate.getTime() > nowMs + 5 * 60 * 1000) {
      return apiError("Thời gian không được ở tương lai.", 422, "MSG-94");
    }

    const isDone = statusParam === "done" || statusParam === "COMPLETED" || !!resolvedDate;

    // Ca hoàn thành bắt buộc có T2, T3 và Cách xử lý (BR-41, MSG-96)
    if (isDone) {
      if (!resolvedDate) {
        return apiError("Ca hoàn thành cần có thời điểm xử lý xong.", 422, "MSG-96");
      }
      if (resolvedDate.getTime() < receivedDate.getTime() - 60000) {
        return apiError("Thời điểm xử lý xong không được trước thời điểm nhận ca.", 422, "MSG-92");
      }
      if (!resolution?.trim()) {
        return apiError("Ca hoàn thành cần có cách xử lý.", 422, "MSG-96");
      }
    }

    // Nhân sự ISOFH phụ trách: Hệ thống tự gán là user đang đăng nhập (BR-37)
    let assignedUserId = session.userId;
    if (body.assigned_user_id || body.assignedUserId) {
      const canAssign = await checkUserPermission(session.userId, "support_tickets.assign", { projectId });
      if (canAssign.allowed) {
        assignedUserId = body.assigned_user_id || body.assignedUserId;
      }
    }

    // Tính thời gian & nhóm thời gian
    const durations = await calculateTicketDurations(sentDate, receivedDate, resolvedDate);
    const status = isDone ? "COMPLETED" : "IN_PROGRESS";
    const ticketCode = await generateNextTicketCode(sentDate);

    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          ticketCode,
          projectId,
          requesterName: requesterName.trim(),
          createdById: session.userId,
          assignedUserId,
          businessId,
          supportTypeId: declarationTypeId || null,
          description: description.trim(),
          cause: cause?.trim() || null,
          resolution: resolution?.trim() || null,
          sentAt: sentDate,
          receivedAt: receivedDate,
          resolvedAt: resolvedDate,
          processingSeconds: durations.processingSeconds,
          totalSeconds: durations.totalSeconds,
          timeGroupId: durations.timeGroupId,
          status,
          idempotencyKey: idempotencyKey || null,
          version: 1,
        },
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          business: true,
          supportType: true,
          timeGroup: true,
        },
      });

      for (const mId of supportMethodIds) {
        await tx.supportTicketMethod.create({
          data: {
            ticketId: ticket.id,
            methodId: mId,
          },
        });
      }

      return ticket;
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Hệ thống";

    await recordTicketHistory({
      ticketId: newTicket.id,
      actorUserId: session.userId,
      actorName,
      action: "created",
      afterData: {
        ticketCode: newTicket.ticketCode,
        status: newTicket.status,
        projectId: newTicket.projectId,
        requesterName: newTicket.requesterName,
        assignedUserId: newTicket.assignedUserId,
      },
    });

    const fullTicket = await prisma.supportTicket.findUnique({
      where: { id: newTicket.id },
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

    if (!fullTicket) {
      return apiError("Lỗi hệ thống khi tải ca vừa tạo", 500, "INTERNAL_ERROR");
    }

    const procMinutes = fullTicket.processingSeconds !== null ? Math.round(fullTicket.processingSeconds / 60) : null;

    return apiSuccess({
      id: fullTicket.id,
      ticket_no: fullTicket.ticketCode,
      ticketCode: fullTicket.ticketCode,
      version: fullTicket.version,
      project: { id: fullTicket.project.id, name: fullTicket.project.projectName },
      support_date: fullTicket.sentAt.toISOString().slice(0, 10),
      requester_name: fullTicket.requesterName,
      business: fullTicket.business ? { id: fullTicket.business.id, name: fullTicket.business.name } : null,
      assignee: {
        id: fullTicket.assignedUser.id,
        full_name: fullTicket.assignedUser.staff?.fullName || fullTicket.assignedUser.username,
      },
      channel: fullTicket.methods[0]?.method ? { id: fullTicket.methods[0].method.id, name: fullTicket.methods[0].method.name } : null,
      declaration_type: fullTicket.supportType ? { id: fullTicket.supportType.id, name: fullTicket.supportType.name } : null,
      description: fullTicket.description,
      cause: fullTicket.cause,
      resolution: fullTicket.resolution,
      sent_at: fullTicket.sentAt.toISOString(),
      received_at: fullTicket.receivedAt?.toISOString() || null,
      resolved_at: fullTicket.resolvedAt?.toISOString() || null,
      total_minutes: procMinutes,
      time_group: fullTicket.timeGroup ? { id: fullTicket.timeGroup.id, code: fullTicket.timeGroup.code, name: fullTicket.timeGroup.name } : null,
      status: fullTicket.status === "COMPLETED" ? "done" : "pending",
      source: "extension",
      created_at: fullTicket.createdAt.toISOString(),
      updated_at: fullTicket.updatedAt.toISOString(),
    }, 201);
  } catch (error: any) {
    console.error("POST /api/v1/tickets error:", error);
    return apiError("Lỗi hệ thống khi tạo ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
