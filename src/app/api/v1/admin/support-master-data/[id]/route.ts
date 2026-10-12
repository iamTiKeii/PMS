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

// PATCH /api/v1/admin/support-master-data/{id} - Sửa hoặc kích hoạt/vô hiệu hóa danh mục
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_master_data.manage");
    if (!check.allowed) {
      return apiError(check.reason || "Bạn không có quyền quản lý danh mục hỗ trợ", 403, "FORBIDDEN");
    }

    const { id } = await params;
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return apiError("Thiếu thông tin loại danh mục hoặc dữ liệu", 400, "MISSING_DATA");
    }

    let beforeRecord: any = null;
    let updatedRecord: any = null;

    if (type === "business") {
      beforeRecord = await prisma.supportBusiness.findUnique({ where: { id } });
      if (!beforeRecord) return apiError("Không tìm thấy bản ghi nghiệp vụ", 404, "NOT_FOUND");
      updatedRecord = await prisma.supportBusiness.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
          sortOrder: data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : undefined,
        },
      });
    } else if (type === "method") {
      beforeRecord = await prisma.supportMethod.findUnique({ where: { id } });
      if (!beforeRecord) return apiError("Không tìm thấy bản ghi phương thức", 404, "NOT_FOUND");
      updatedRecord = await prisma.supportMethod.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
          sortOrder: data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : undefined,
        },
      });
    } else if (type === "type") {
      beforeRecord = await prisma.supportType.findUnique({ where: { id } });
      if (!beforeRecord) return apiError("Không tìm thấy bản ghi loại hỗ trợ", 404, "NOT_FOUND");
      updatedRecord = await prisma.supportType.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
          sortOrder: data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : undefined,
        },
      });
    } else if (type === "time_group") {
      beforeRecord = await prisma.supportTimeGroup.findUnique({ where: { id } });
      if (!beforeRecord) return apiError("Không tìm thấy bản ghi nhóm thời gian", 404, "NOT_FOUND");
      updatedRecord = await prisma.supportTimeGroup.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          minSeconds: data.minSeconds !== undefined ? parseInt(data.minSeconds, 10) : undefined,
          maxSeconds:
            data.maxSeconds !== undefined
              ? data.maxSeconds === null
                ? null
                : parseInt(data.maxSeconds, 10)
              : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
          sortOrder: data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : undefined,
        },
      });
    } else if (type === "region") {
      beforeRecord = await prisma.region.findUnique({ where: { id } });
      if (!beforeRecord) return apiError("Không tìm thấy bản ghi khu vực", 404, "NOT_FOUND");
      updatedRecord = await prisma.region.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name.trim() : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
          sortOrder: data.sortOrder !== undefined ? parseInt(data.sortOrder, 10) : undefined,
        },
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
      recordId: id,
      actorUserId: session.userId,
      actorName,
      beforeData: beforeRecord,
      afterData: updatedRecord,
    });

    return apiSuccess(updatedRecord);
  } catch (error: any) {
    console.error("PATCH /api/v1/admin/support-master-data/[id] error:", error);
    return apiError("Lỗi hệ thống khi cập nhật danh mục", 500, "INTERNAL_ERROR");
  }
}
