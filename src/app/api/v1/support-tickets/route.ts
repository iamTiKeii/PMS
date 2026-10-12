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

// GET /api/v1/support-tickets - Danh sách và tìm kiếm ca hỗ trợ
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.view");
    if (!check.allowed) {
      return apiError(check.reason || "Không đủ quyền truy cập", 403, "FORBIDDEN");
    }

    const effective = await getEffectiveUserPermissions(session.userId);
    const searchParams = request.nextUrl.searchParams;

    const projectId = searchParams.get("projectId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const dateField = searchParams.get("dateField") || "sentAt"; // sentAt hoặc createdAt
    const status = searchParams.get("status");
    const assignedUserId = searchParams.get("assignedUserId");
    const businessId = searchParams.get("businessId");
    const supportMethodId = searchParams.get("supportMethodId");
    const supportTypeId = searchParams.get("supportTypeId");
    const timeGroupId = searchParams.get("timeGroupId") || searchParams.get("timeGroup");
    const q = searchParams.get("q")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const skip = (page - 1) * pageSize;

    // Xác định danh sách dự án được phép truy cập
    let allowedProjectIds: string[] | null = null;
    if (!effective?.isSystemAdmin && !effective?.scopes.some((s) => s.scopeType === "system")) {
      const projectScopeIds =
        effective?.scopes.filter((s) => s.scopeType === "project" && s.targetId).map((s) => s.targetId as string) ||
        [];

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

    // Xây dựng điều kiện lọc Prisma
    const where: any = {};

    // 1. Phân quyền dự án
    if (allowedProjectIds !== null) {
      if (projectId) {
        if (!allowedProjectIds.includes(projectId)) {
          return apiError("Bạn không có quyền truy cập dự án này", 403, "FORBIDDEN");
        }
        where.projectId = projectId;
      } else {
        where.projectId = { in: allowedProjectIds };
      }
    } else if (projectId) {
      where.projectId = projectId;
    }

    // 2. Trạng thái
    if (status && status !== "ALL") {
      where.status = status;
    }

    // 3. Nhân sự phụ trách
    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    // 4. Nghiệp vụ
    if (businessId) {
      where.businessId = businessId;
    }

    // 5. Loại hỗ trợ
    if (supportTypeId) {
      where.supportTypeId = supportTypeId;
    }

    // 6. Nhóm thời gian
    if (timeGroupId) {
      where.timeGroupId = timeGroupId;
    }

    // 7. Phương thức hỗ trợ
    if (supportMethodId) {
      where.methods = {
        some: {
          methodId: supportMethodId,
        },
      };
    }

    // 8. Khoảng thời gian
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        dateFilter.gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) {
          // Chỉ có YYYY-MM-DD -> lấy hết ngày
          end.setHours(23, 59, 59, 999);
        }
        dateFilter.lte = end;
      }
      where[dateField === "createdAt" ? "createdAt" : "sentAt"] = dateFilter;
    }

    // 9. Từ khóa tìm kiếm q
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
          project: {
            select: { id: true, projectCode: true, projectName: true },
          },
          createdByUser: {
            select: { id: true, username: true, staff: { select: { fullName: true } } },
          },
          assignedUser: {
            select: { id: true, username: true, staff: { select: { fullName: true } } },
          },
          business: {
            select: { id: true, code: true, name: true },
          },
          supportType: {
            select: { id: true, code: true, name: true },
          },
          timeGroup: {
            select: { id: true, code: true, name: true },
          },
          methods: {
            include: {
              method: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    // Format kết quả trả về
    const formattedItems = items.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      projectId: t.projectId,
      project: t.project,
      requesterName: t.requesterName,
      createdById: t.createdById,
      createdBy: {
        id: t.createdByUser.id,
        username: t.createdByUser.username,
        fullName: t.createdByUser.staff?.fullName || t.createdByUser.username,
      },
      assignedUserId: t.assignedUserId,
      assignedUser: {
        id: t.assignedUser.id,
        username: t.assignedUser.username,
        fullName: t.assignedUser.staff?.fullName || t.assignedUser.username,
      },
      businessId: t.businessId,
      business: t.business,
      supportTypeId: t.supportTypeId,
      supportType: t.supportType,
      timeGroupId: t.timeGroupId,
      timeGroup: t.timeGroup,
      methods: t.methods.map((m) => m.method),
      description: t.description,
      cause: t.cause,
      resolution: t.resolution,
      status: t.status,
      sentAt: t.sentAt,
      receivedAt: t.receivedAt,
      resolvedAt: t.resolvedAt,
      processingSeconds: t.processingSeconds,
      totalSeconds: t.totalSeconds,
      processingMinutes: t.processingSeconds !== null ? Math.round(t.processingSeconds / 60) : null,
      totalMinutes: t.totalSeconds !== null ? Math.round(t.totalSeconds / 60) : null,
      version: t.version,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return apiSuccess({
      items: formattedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("GET /api/v1/support-tickets error:", error);
    return apiError("Lỗi hệ thống khi tải danh sách ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}

// POST /api/v1/support-tickets - Tạo ca hỗ trợ mới
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.create");
    if (!check.allowed) {
      return apiError(check.reason || "Không đủ quyền tạo ca hỗ trợ", 403, "FORBIDDEN");
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;

    // Chống tạo trùng nếu cùng Idempotency-Key
    if (idempotencyKey) {
      const existing = await prisma.supportTicket.findUnique({
        where: { idempotencyKey },
        include: {
          project: { select: { id: true, projectCode: true, projectName: true } },
          business: true,
          supportType: true,
          timeGroup: true,
          methods: { include: { method: true } },
        },
      });
      if (existing) {
        return apiSuccess(existing, 200);
      }
    }

    const body = await request.json();
    const {
      projectId,
      requesterName,
      businessId,
      supportMethodIds,
      description,
      cause,
      resolution,
      sentAt,
      receivedAt,
      resolvedAt,
      supportTypeId,
      assignedUserId: requestedAssignedUserId,
    } = body;

    // Validate bắt buộc
    if (!projectId) return apiError("Vui lòng chọn Dự án", 400, "VALIDATION_ERROR");
    if (!requesterName?.trim()) return apiError("Vui lòng nhập Người dùng yêu cầu hỗ trợ", 400, "VALIDATION_ERROR");
    if (!businessId) return apiError("Vui lòng chọn Nghiệp vụ", 400, "VALIDATION_ERROR");
    if (!description?.trim()) return apiError("Vui lòng nhập Mô tả vấn đề", 400, "VALIDATION_ERROR");
    if (!sentAt) return apiError("Vui lòng cung cấp Thời điểm gửi yêu cầu", 400, "VALIDATION_ERROR");
    if (!supportMethodIds || !Array.isArray(supportMethodIds) || supportMethodIds.length === 0) {
      return apiError("Vui lòng chọn ít nhất một Phương thức hỗ trợ", 400, "VALIDATION_ERROR");
    }

    // Kiểm tra quyền dự án của người dùng
    const projectCheck = await checkUserPermission(session.userId, "support_tickets.create", { projectId });
    if (!projectCheck.allowed) {
      return apiError(projectCheck.reason || "Bạn không có quyền thao tác trên dự án này", 403, "FORBIDDEN");
    }

    // Xử lý phân công nhân sự (Quy tắc 2.5)
    let assignedUserId = session.userId;
    if (requestedAssignedUserId && requestedAssignedUserId !== session.userId) {
      // Chỉ người có quyền support_tickets.assign mới được gán cho người khác
      const assignCheck = await checkUserPermission(session.userId, "support_tickets.assign", { projectId });
      if (assignCheck.allowed) {
        assignedUserId = requestedAssignedUserId;
      }
    }

    // Kiểm tra tính hợp lệ của timestamp
    const sentDate = new Date(sentAt);
    const receivedDate = receivedAt ? new Date(receivedAt) : new Date();
    const resolvedDate = resolvedAt ? new Date(resolvedAt) : null;

    if (isNaN(sentDate.getTime())) {
      return apiError("Thời điểm gửi yêu cầu không hợp lệ", 400, "INVALID_TIMESTAMP");
    }
    if (isNaN(receivedDate.getTime())) {
      return apiError("Thời điểm nhận yêu cầu không hợp lệ", 400, "INVALID_TIMESTAMP");
    }
    if (resolvedDate && isNaN(resolvedDate.getTime())) {
      return apiError("Thời điểm hoàn thành không hợp lệ", 400, "INVALID_TIMESTAMP");
    }

    // Thứ tự thời gian: resolvedAt >= receivedAt >= sentAt (trừ ngoại lệ cho phép, nhưng cảnh báo)
    if (resolvedDate && resolvedDate.getTime() < receivedDate.getTime()) {
      return apiError("Thời điểm hoàn thành không được sớm hơn thời điểm tiếp nhận", 400, "INVALID_CHRONOLOGY");
    }

    // Tính thời lượng
    const durations = await calculateTicketDurations(sentDate, receivedDate, resolvedDate);
    const status = resolvedDate ? "COMPLETED" : "IN_PROGRESS";
    const ticketCode = await generateNextTicketCode();

    // Lưu vào database với transaction
    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          ticketCode,
          projectId,
          requesterName: requesterName.trim(),
          createdById: session.userId,
          assignedUserId,
          businessId,
          supportTypeId: supportTypeId || null,
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

      // Tạo liên kết methods
      for (const methodId of supportMethodIds) {
        await tx.supportTicketMethod.create({
          data: {
            ticketId: ticket.id,
            methodId,
          },
        });
      }

      return ticket;
    });

    // Lấy tên người thao tác
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Hệ thống";

    // Ghi lịch sử tạo ca
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

    // Trả về bản ghi mới tạo kèm methods
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

    return apiSuccess(fullTicket, 201);
  } catch (error: any) {
    console.error("POST /api/v1/support-tickets error:", error);
    return apiError("Lỗi hệ thống khi tạo ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
