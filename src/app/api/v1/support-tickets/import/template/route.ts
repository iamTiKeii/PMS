import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import { apiError, handleCorsOptions } from "@/lib/api-helper";
import { generateSupportTicketImportTemplate } from "@/lib/support-ticket-import";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// GET /api/v1/support-tickets/import/template - Tải file mẫu Excel 2 sheet
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.view");
    if (!check.allowed) {
      return apiError("Bạn không có quyền truy cập chức năng này", 403, "FORBIDDEN");
    }

    const buffer = await generateSupportTicketImportTemplate();
    const filename = `Mau_Import_Ca_Ho_Tro_PMS_Hub_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Lỗi tạo file mẫu Excel import ca hỗ trợ:", err);
    return apiError(err.message || "Không thể tạo file mẫu", 500, "INTERNAL_ERROR");
  }
}
