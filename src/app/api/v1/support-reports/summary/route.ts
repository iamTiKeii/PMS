import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission, getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// GET /api/v1/support-reports/summary - Thống kê số liệu tổng hợp & báo cáo Pivot
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.report");
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền xem báo cáo hỗ trợ", 403, "FORBIDDEN");
    }

    const effective = await getEffectiveUserPermissions(session.userId);
    const searchParams = request.nextUrl.searchParams;

    const regionId = searchParams.get("regionId");
    const projectId = searchParams.get("projectId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const assignedUserId = searchParams.get("assignedUserId");

    // Xác định quyền phạm vi dự án
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

    const where: any = {};
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

    // Lọc theo Khu vực nếu có
    if (regionId && regionId !== "all") {
      where.project = {
        ...(where.project || {}),
        regionId: regionId,
      };
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.sentAt = dateFilter;
    }

    // Lấy song song dữ liệu danh mục master data và tickets
    const [allRegions, allBusinesses, allTypes, allTimeGroups, tickets] = await Promise.all([
      prisma.region.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.supportBusiness.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.supportType.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.supportTimeGroup.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
      prisma.supportTicket.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              projectName: true,
              projectCode: true,
              shortName: true,
              regionId: true,
              region: { select: { id: true, code: true, name: true } },
            },
          },
          assignedUser: { select: { id: true, username: true, staff: { select: { fullName: true } } } },
          business: { select: { id: true, name: true, code: true } },
          supportType: { select: { id: true, name: true, code: true } },
          timeGroup: { select: { id: true, name: true, code: true, sortOrder: true } },
        },
      }),
    ]);

    const totalTickets = tickets.length;
    const completedTickets = tickets.filter((t) => t.status === "COMPLETED");
    const inProgressTickets = tickets.filter((t) => t.status === "IN_PROGRESS");
    const completionRate = totalTickets > 0 ? Math.round((completedTickets.length / totalTickets) * 100) : 0;

    // Tính thời gian trung bình (phút)
    let totalProcessingSeconds = 0;
    let countProcessing = 0;
    let totalTotalSeconds = 0;
    let countTotal = 0;
    let totalWaitingSeconds = 0;
    let countWaiting = 0;

    for (const t of completedTickets) {
      if (t.processingSeconds !== null && t.processingSeconds !== undefined) {
        totalProcessingSeconds += t.processingSeconds;
        countProcessing++;
      }
      if (t.totalSeconds !== null && t.totalSeconds !== undefined) {
        totalTotalSeconds += t.totalSeconds;
        countTotal++;
      }
      if (t.receivedAt && t.sentAt) {
        const waitSec = Math.max(0, Math.round((t.receivedAt.getTime() - t.sentAt.getTime()) / 1000));
        totalWaitingSeconds += waitSec;
        countWaiting++;
      }
    }

    const avgProcessingMinutes = countProcessing > 0 ? Math.round(totalProcessingSeconds / countProcessing / 60) : 0;
    const avgTotalMinutes = countTotal > 0 ? Math.round(totalTotalSeconds / countTotal / 60) : 0;
    const avgWaitingMinutes = countWaiting > 0 ? Math.round(totalWaitingSeconds / countWaiting / 60) : 0;

    // =========================================================================
    // 1. BÁO CÁO NGHIỆP VỤ CẦN HỖ TRỢ (Hình 1)
    // =========================================================================
    const businessCountMap = new Map<string, number>();
    let emptyBusinessCount = 0;

    for (const t of tickets) {
      if (t.business?.name) {
        businessCountMap.set(t.business.name, (businessCountMap.get(t.business.name) || 0) + 1);
      } else {
        emptyBusinessCount++;
      }
    }

    // Danh sách nghiệp vụ có số lượng hoặc trong danh mục
    const businessRows: { name: string; count: number }[] = [];
    const seenBusinessNames = new Set<string>();

    for (const b of allBusinesses) {
      const count = businessCountMap.get(b.name) || 0;
      if (count > 0) {
        businessRows.push({ name: b.name, count });
        seenBusinessNames.add(b.name);
      }
    }

    // Các nghiệp vụ phát sinh khác ngoài danh mục chuẩn
    businessCountMap.forEach((count, name) => {
      if (!seenBusinessNames.has(name) && count > 0) {
        businessRows.push({ name, count });
      }
    });

    // Sắp xếp giảm dần theo số lượng
    businessRows.sort((a, b) => b.count - a.count);

    // Thêm dòng (trống) nếu có
    if (emptyBusinessCount > 0) {
      businessRows.push({ name: "(trống)", count: emptyBusinessCount });
    }

    const businessTotal = businessRows.reduce((sum, r) => sum + r.count, 0);

    // =========================================================================
    // 2. BÁO CÁO CSYT THEO TRẠNG THÁI (Hình 2)
    // =========================================================================
    interface HospitalStatusRow {
      csyt: string;
      fullName: string;
      completed: number;
      pending: number;
      total: number;
    }

    const hospitalMap = new Map<string, HospitalStatusRow>();
    let emptyHospitalCompleted = 0;
    let emptyHospitalPending = 0;

    for (const t of tickets) {
      if (t.project) {
        const key = t.project.id;
        const displayName = t.project.shortName || t.project.projectName;
        if (!hospitalMap.has(key)) {
          hospitalMap.set(key, {
            csyt: displayName,
            fullName: t.project.projectName,
            completed: 0,
            pending: 0,
            total: 0,
          });
        }
        const row = hospitalMap.get(key)!;
        if (t.status === "COMPLETED") {
          row.completed++;
        } else {
          row.pending++;
        }
        row.total++;
      } else {
        if (t.status === "COMPLETED") emptyHospitalCompleted++;
        else emptyHospitalPending++;
      }
    }

    const hospitalRows = Array.from(hospitalMap.values()).sort((a, b) =>
      a.csyt.localeCompare(b.csyt, "vi", { sensitivity: "base" })
    );

    if (emptyHospitalCompleted > 0 || emptyHospitalPending > 0) {
      hospitalRows.push({
        csyt: "(trống)",
        fullName: "(trống)",
        completed: emptyHospitalCompleted,
        pending: emptyHospitalPending,
        total: emptyHospitalCompleted + emptyHospitalPending,
      });
    }

    const hospitalTotals = {
      completed: hospitalRows.reduce((sum, r) => sum + r.completed, 0),
      pending: hospitalRows.reduce((sum, r) => sum + r.pending, 0),
      total: hospitalRows.reduce((sum, r) => sum + r.total, 0),
    };

    // =========================================================================
    // 3. MA TRẬN PHÂN LOẠI HỖ TRỢ X NHÓM THỜI GIAN (Hình 3 & Hình 4)
    // =========================================================================
    // Phân loại nhóm thời gian:
    // - under15: <15p xử lý
    // - to30:    <30p xử lý (từ 15 đến dưới 30p)
    // - over30:  >30p xử lý (từ 30p trở lên)
    // - empty:   (trống) - chưa hoàn thành hoặc chưa xếp nhóm
    interface TypeMatrixRow {
      typeName: string;
      under15: number;
      to30: number;
      over30: number;
      empty: number;
      total: number;
    }

    const typeMatrixMap = new Map<string, TypeMatrixRow>();
    let emptyTypeMatrix: TypeMatrixRow = {
      typeName: "(trống)",
      under15: 0,
      to30: 0,
      over30: 0,
      empty: 0,
      total: 0,
    };

    for (const t of tickets) {
      let bucket: "under15" | "to30" | "over30" | "empty" = "empty";

      if (t.status === "COMPLETED") {
        if (t.timeGroup?.code === "UNDER_15" || (t.totalSeconds !== null && t.totalSeconds < 900)) {
          bucket = "under15";
        } else if (
          t.timeGroup?.code === "15_TO_30" ||
          (t.totalSeconds !== null && t.totalSeconds >= 900 && t.totalSeconds < 1800)
        ) {
          bucket = "to30";
        } else if (t.timeGroup?.code === "OVER_30" || (t.totalSeconds !== null && t.totalSeconds >= 1800)) {
          bucket = "over30";
        } else {
          bucket = "empty";
        }
      } else {
        bucket = "empty";
      }

      const tName = t.supportType?.name;
      if (tName) {
        if (!typeMatrixMap.has(tName)) {
          typeMatrixMap.set(tName, {
            typeName: tName,
            under15: 0,
            to30: 0,
            over30: 0,
            empty: 0,
            total: 0,
          });
        }
        const row = typeMatrixMap.get(tName)!;
        row[bucket]++;
        row.total++;
      } else {
        emptyTypeMatrix[bucket]++;
        emptyTypeMatrix.total++;
      }
    }

    // Danh sách các loại công việc có số liệu hoặc từ danh mục
    const typeMatrixRows: TypeMatrixRow[] = [];
    const seenTypeNames = new Set<string>();

    for (const st of allTypes) {
      const existing = typeMatrixMap.get(st.name);
      if (existing && existing.total > 0) {
        typeMatrixRows.push(existing);
        seenTypeNames.add(st.name);
      }
    }

    // Thêm các loại phát sinh khác ngoài danh mục chuẩn
    typeMatrixMap.forEach((row, name) => {
      if (!seenTypeNames.has(name) && row.total > 0) {
        typeMatrixRows.push(row);
      }
    });

    // Sắp xếp theo tên tiếng Việt
    typeMatrixRows.sort((a, b) => a.typeName.localeCompare(b.typeName, "vi", { sensitivity: "base" }));

    if (emptyTypeMatrix.total > 0) {
      typeMatrixRows.push(emptyTypeMatrix);
    }

    const typeMatrixTotals = {
      under15: typeMatrixRows.reduce((sum, r) => sum + r.under15, 0),
      to30: typeMatrixRows.reduce((sum, r) => sum + r.to30, 0),
      over30: typeMatrixRows.reduce((sum, r) => sum + r.over30, 0),
      empty: typeMatrixRows.reduce((sum, r) => sum + r.empty, 0),
      total: typeMatrixRows.reduce((sum, r) => sum + r.total, 0),
    };

    return apiSuccess({
      summary: {
        totalTickets,
        completedTickets: completedTickets.length,
        inProgressTickets: inProgressTickets.length,
        completionRate,
        avgProcessingMinutes,
        avgTotalMinutes,
        avgWaitingMinutes,
      },
      regions: allRegions.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      businessReport: {
        rows: businessRows,
        total: businessTotal,
      },
      hospitalStatusReport: {
        rows: hospitalRows,
        totals: hospitalTotals,
      },
      typeTimeGroupMatrix: {
        columns: [
          { key: "under15", label: "<15p xử lý" },
          { key: "to30", label: "<30p xử lý" },
          { key: "over30", label: ">30p xử lý" },
          { key: "empty", label: "(trống)" },
        ],
        rows: typeMatrixRows,
        totals: typeMatrixTotals,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/support-reports/summary error:", error);
    return apiError("Lỗi hệ thống khi tạo báo cáo hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
