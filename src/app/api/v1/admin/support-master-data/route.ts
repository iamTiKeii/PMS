import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import { recordMasterDataHistory } from "@/lib/support-ticket";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

// POST /api/v1/admin/support-master-data - Thêm mới danh mục Master Data
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_master_data.manage");
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền quản lý danh mục hỗ trợ", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return apiError("Thiếu thông tin loại danh mục hoặc dữ liệu", 400, "MISSING_DATA");
    }

    if (!data.code?.trim() || !data.name?.trim()) {
      return apiError("Mã và tên danh mục là bắt buộc", 400, "VALIDATION_ERROR");
    }

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const sortOrder = data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : 0;

    let createdRecord: any = null;

    if (type === "business") {
      createdRecord = await prisma.supportBusiness.create({
        data: { code, name, sortOrder, isActive: data.isActive ?? true },
      });
    } else if (type === "method") {
      createdRecord = await prisma.supportMethod.create({
        data: { code, name, sortOrder, isActive: data.isActive ?? true },
      });
    } else if (type === "type") {
      createdRecord = await prisma.supportType.create({
        data: { code, name, sortOrder, isActive: data.isActive ?? true },
      });
    } else if (type === "time_group") {
      createdRecord = await prisma.supportTimeGroup.create({
        data: {
          code,
          name,
          minSeconds: parseInt(data.minSeconds, 10) || 0,
          maxSeconds: data.maxSeconds !== undefined && data.maxSeconds !== null ? parseInt(data.maxSeconds, 10) : null,
          sortOrder,
          isActive: data.isActive ?? true,
        },
      });
    } else if (type === "region") {
      createdRecord = await prisma.region.create({
        data: { code, name, sortOrder, isActive: data.isActive ?? true },
      });
    } else {
      return apiError("Loại danh mục không hợp lệ", 400, "INVALID_TYPE");
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { staff: true },
    });
    const actorName = currentUser?.staff?.fullName || currentUser?.username || "Quản trị viên";

    await recordMasterDataHistory({
      masterDataType: type,
      recordId: createdRecord.id,
      actorUserId: session.userId,
      actorName,
      afterData: createdRecord,
    });

    return apiSuccess(createdRecord, 201);
  } catch (error: any) {
    console.error("POST /api/v1/admin/support-master-data error:", error);
    if (error.code === "P2002") {
      return apiError("Mã danh mục này đã tồn tại trong hệ thống", 409, "DUPLICATE_CODE");
    }
    return apiError("Lỗi hệ thống khi tạo danh mục", 500, "INTERNAL_ERROR");
  }
}
