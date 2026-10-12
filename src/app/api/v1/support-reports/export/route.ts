import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission, getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiError, handleCorsOptions, corsHeaders } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// GET /api/v1/support-reports/export - Xuất dữ liệu ca hỗ trợ ra file Excel (.xlsx)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.export");
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền xuất dữ liệu ca hỗ trợ", 403, "FORBIDDEN");
    }

    const effective = await getEffectiveUserPermissions(session.userId);
    const searchParams = request.nextUrl.searchParams;

    const regionId = searchParams.get("regionId");
    const projectId = searchParams.get("projectId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const dateField = searchParams.get("dateField") || "sentAt";
    const status = searchParams.get("status");
    const assignedUserId = searchParams.get("assignedUserId");
    const businessId = searchParams.get("businessId");
    const supportMethodId = searchParams.get("supportMethodId");
    const supportTypeId = searchParams.get("supportTypeId");
    const timeGroupId = searchParams.get("timeGroupId") || searchParams.get("timeGroup");
    const q = searchParams.get("q")?.trim();
    const format = searchParams.get("format")?.toLowerCase(); // "xlsx" (mặc định) hoặc "csv"

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

    if (regionId && regionId !== "all") {
      where.project = {
        ...(where.project || {}),
        regionId,
      };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (businessId) {
      where.businessId = businessId;
    }

    if (supportTypeId) {
      where.supportTypeId = supportTypeId;
    }

    if (timeGroupId) {
      where.timeGroupId = timeGroupId;
    }

    if (supportMethodId) {
      where.methods = {
        some: {
          methodId: supportMethodId,
        },
      };
    }

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        if (toDate.length === 10) end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where[dateField === "createdAt" ? "createdAt" : "sentAt"] = dateFilter;
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

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        project: { select: { projectCode: true, projectName: true } },
        createdByUser: { select: { username: true, staff: { select: { fullName: true } } } },
        assignedUser: { select: { username: true, staff: { select: { fullName: true } } } },
        business: { select: { name: true } },
        supportType: { select: { name: true } },
        timeGroup: { select: { name: true } },
        methods: { include: { method: { select: { name: true } } } },
      },
      orderBy: { sentAt: "desc" },
    });

    // Helper định dạng ngày giờ theo múi giờ Việt Nam
    const formatDateTime = (d: Date | string | null | undefined) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const map: Record<string, string> = {};
      parts.forEach((p) => {
        map[p.type] = p.value;
      });
      return `${map.hour}:${map.minute} ${map.day}/${map.month}/${map.year}`;
    };

    const formatDateOnly = (d: Date | string | null | undefined) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const parts = formatter.formatToParts(date);
      const map: Record<string, string> = {};
      parts.forEach((p) => {
        map[p.type] = p.value;
      });
      return `${map.day}/${map.month}/${map.year}`;
    };

    // 18 cột theo đúng yêu cầu:
    // STT, Ngày, CSYT, Người dùng yêu cầu hỗ trợ, Nghiệp vụ cần hỗ trợ, Nhân sự ISOFH phụ trách,
    // Phương thức hỗ trợ, Mô tả vấn đề cần hỗ trợ, Nguyên nhân, Cách xử lý,
    // Thời gian người dùng gửi ca hỗ trợ, Thời điểm nhận ca hỗ trợ, Thời điểm xử lý xong vấn đề,
    // Tổng thời gian xử lý (tính từ lúc người dùng nhắn đến khi xử lý xong), Nhóm Thời gian, Phân loại hỗ trợ, Trạng thái, CSYT
    const headers = [
      "STT",
      "Ngày",
      "CSYT",
      "Người dùng yêu cầu hỗ trợ",
      "Nghiệp vụ cần hỗ trợ",
      "Nhân sự ISOFH phụ trách",
      "Phương thức hỗ trợ",
      "Mô tả vấn đề cần hỗ trợ",
      "Nguyên nhân",
      "Cách xử lý",
      "Thời gian người dùng gửi ca hỗ trợ",
      "Thời điểm nhận ca hỗ trợ",
      "Thời điểm xử lý xong vấn đề",
      "Tổng thời gian xử lý (tính từ lúc người dùng nhắn đến khi xử lý xong)",
      "Nhóm Thời gian",
      "Phân loại hỗ trợ",
      "Trạng thái",
      "CSYT",
    ];

    const rows = tickets.map((t, index) => {
      let totalMinutes: number | string = "";
      if (t.totalSeconds !== null && t.totalSeconds !== undefined) {
        totalMinutes = Math.round(t.totalSeconds / 60);
      } else if (t.resolvedAt && t.sentAt) {
        totalMinutes = Math.round((new Date(t.resolvedAt).getTime() - new Date(t.sentAt).getTime()) / 60000);
      }

      return [
        index + 1,
        formatDateOnly(t.sentAt),
        t.project.projectName,
        t.requesterName || "",
        t.business?.name || "",
        t.assignedUser.staff?.fullName || t.assignedUser.username || "",
        t.methods.map((m) => m.method.name).join(", "),
        t.description || "",
        t.cause || "",
        t.resolution || "",
        formatDateTime(t.sentAt),
        formatDateTime(t.receivedAt),
        formatDateTime(t.resolvedAt),
        totalMinutes,
        t.timeGroup?.name || "",
        t.supportType?.name || "",
        t.status === "COMPLETED" ? "Hoàn thành" : "Đang xử lý",
        t.project.projectName,
      ];
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    // Xuất CSV nếu có tham số format=csv
    if (format === "csv") {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };
      const csvContent =
        "\uFEFF" +
        [
          headers.map(escapeCsv).join(","),
          ...rows.map((r) => r.map(escapeCsv).join(",")),
        ].join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Danh_sach_ghi_nhan_ho_tro_${todayStr}.csv"`,
        },
      });
    }

    // Mặc định xuất Excel (.xlsx)
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Đặt độ rộng các cột tối ưu hiển thị
    worksheet["!cols"] = [
      { wch: 6 },   // STT
      { wch: 14 },  // Ngày
      { wch: 35 },  // CSYT
      { wch: 30 },  // Người dùng yêu cầu hỗ trợ
      { wch: 32 },  // Nghiệp vụ cần hỗ trợ
      { wch: 26 },  // Nhân sự ISOFH phụ trách
      { wch: 22 },  // Phương thức hỗ trợ
      { wch: 45 },  // Mô tả vấn đề cần hỗ trợ
      { wch: 35 },  // Nguyên nhân
      { wch: 40 },  // Cách xử lý
      { wch: 20 },  // Thời gian người dùng gửi ca hỗ trợ
      { wch: 20 },  // Thời điểm nhận ca hỗ trợ
      { wch: 20 },  // Thời điểm xử lý xong vấn đề
      { wch: 24 },  // Tổng thời gian xử lý (tính từ lúc người dùng nhắn đến khi xử lý xong)
      { wch: 18 },  // Nhóm Thời gian
      { wch: 25 },  // Phân loại hỗ trợ
      { wch: 16 },  // Trạng thái
      { wch: 35 },  // CSYT
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ghi nhận hỗ trợ");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `Danh_sach_ghi_nhan_ho_tro_${todayStr}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/v1/support-reports/export error:", error);
    return apiError("Lỗi hệ thống khi xuất dữ liệu ca hỗ trợ", 500, "INTERNAL_ERROR");
  }
}

