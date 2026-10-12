import prisma from "@/lib/prisma";

export interface DurationCalculation {
  processingSeconds: number | null;
  totalSeconds: number | null;
  processingMinutes: number | null;
  totalMinutes: number | null;
  timeGroupId: string | null;
}

/**
 * Tự động tạo mã ca tiếp theo: HT-00001, HT-00002...
 */
export async function generateNextTicketCode(): Promise<string> {
  const latestTicket = await prisma.supportTicket.findFirst({
    orderBy: { createdAt: "desc" },
    select: { ticketCode: true },
  });

  if (!latestTicket || !latestTicket.ticketCode) {
    return "HT-00001";
  }

  // Tách số từ HT-XXXXX
  const match = latestTicket.ticketCode.match(/^HT-(\d+)$/);
  if (!match) {
    const count = await prisma.supportTicket.count();
    return `HT-${String(count + 1).padStart(5, "0")}`;
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `HT-${String(nextNum).padStart(5, "0")}`;
}

/**
 * Tính toán thời gian xử lý, tổng thời gian và tự động xác định nhóm thời gian
 * Căn cứ phân nhóm chính là: Thời gian xử lý T_xử_lý = T_hoàn_thành - T_nhận
 */
export async function calculateTicketDurations(
  sentAt: Date,
  receivedAt?: Date | null,
  resolvedAt?: Date | null
): Promise<DurationCalculation> {
  if (!resolvedAt) {
    return {
      processingSeconds: null,
      totalSeconds: null,
      processingMinutes: null,
      totalMinutes: null,
      timeGroupId: null,
    };
  }

  // T_tổng = T_hoàn_thành - T_gửi
  const totalMs = resolvedAt.getTime() - sentAt.getTime();
  const totalSec = Math.max(0, Math.round(totalMs / 1000));
  const totalMin = Math.round(totalSec / 60);

  // T_xử_lý = T_hoàn_thành - T_nhận (nếu không có T_nhận thì dùng T_gửi)
  const baseReceiveTime = receivedAt ? receivedAt.getTime() : sentAt.getTime();
  const processingMs = resolvedAt.getTime() - baseReceiveTime;
  const processingSec = Math.max(0, Math.round(processingMs / 1000));
  const processingMin = Math.round(processingSec / 60);

  // Tìm nhóm thời gian tương ứng từ Master Data
  const timeGroups = await prisma.supportTimeGroup.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  let matchedGroupId: string | null = null;
  for (const tg of timeGroups) {
    const minMatch = processingSec >= tg.minSeconds;
    const maxMatch = tg.maxSeconds === null || tg.maxSeconds === undefined || processingSec < tg.maxSeconds;
    if (minMatch && maxMatch) {
      matchedGroupId = tg.id;
      break;
    }
  }

  // Fallback nếu không khớp nhóm nào: gán nhóm cuối cùng
  if (!matchedGroupId && timeGroups.length > 0) {
    matchedGroupId = timeGroups[timeGroups.length - 1].id;
  }

  return {
    processingSeconds: processingSec,
    totalSeconds: totalSec,
    processingMinutes: processingMin,
    totalMinutes: totalMin,
    timeGroupId: matchedGroupId,
  };
}

/**
 * Ghi nhật ký thay đổi ca hỗ trợ (Support Ticket History)
 */
export async function recordTicketHistory(params: {
  ticketId: string;
  actorUserId: string;
  actorName?: string | null;
  action: "created" | "updated" | "completed" | "reopened" | "assigned" | "status_changed";
  beforeData?: any;
  afterData?: any;
  reason?: string | null;
}) {
  try {
    await prisma.supportTicketHistory.create({
      data: {
        ticketId: params.ticketId,
        actorUserId: params.actorUserId,
        actorName: params.actorName || null,
        action: params.action,
        beforeData: params.beforeData ? JSON.stringify(params.beforeData) : null,
        afterData: params.afterData ? JSON.stringify(params.afterData) : null,
        reason: params.reason || null,
      },
    });
  } catch (err) {
    console.error("Lỗi ghi nhật ký SupportTicketHistory:", err);
  }
}

/**
 * Ghi nhật ký thay đổi danh mục Master Data (Support Master Data History)
 */
export async function recordMasterDataHistory(params: {
  masterDataType: "business" | "method" | "type" | "time_group";
  recordId: string;
  actorUserId: string;
  actorName?: string | null;
  beforeData?: any;
  afterData?: any;
}) {
  try {
    await prisma.supportMasterDataHistory.create({
      data: {
        masterDataType: params.masterDataType,
        recordId: params.recordId,
        actorUserId: params.actorUserId,
        actorName: params.actorName || null,
        beforeData: params.beforeData ? JSON.stringify(params.beforeData) : null,
        afterData: params.afterData ? JSON.stringify(params.afterData) : null,
      },
    });
  } catch (err) {
    console.error("Lỗi ghi nhật ký SupportMasterDataHistory:", err);
  }
}
