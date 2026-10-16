import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import { apiError, handleCorsOptions } from "@/lib/api-helper";
import { generateSupportTicketErrorExport } from "@/lib/support-ticket-import";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/support-tickets/import/export-errors - Xuất file Excel các dòng bị lỗi kèm giải thích
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.create");
    if (!check.allowed) {
      return apiError("Bạn không có quyền thực hiện thao tác này", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { rawRows, errors } = body;

    if (!Array.isArray(rawRows) || !Array.isArray(errors)) {
      return apiError("Dữ liệu xuất lỗi không hợp lệ", 400, "INVALID_DATA");
    }

    const buffer = generateSupportTicketErrorExport(rawRows, errors);
    const filename = `Danh_sach_dong_loi_import_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Lỗi xuất file lỗi import ca hỗ trợ:", err);
    return apiError(err.message || "Lỗi tạo file báo cáo lỗi", 500, "INTERNAL_ERROR");
  }
}
