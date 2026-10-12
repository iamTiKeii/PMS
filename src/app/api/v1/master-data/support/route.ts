import { getSessionUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const check = await checkUserPermission(session.userId, "support_tickets.view");
    if (!check.allowed) {
      return apiError(check.reason || "Không đủ quyền truy cập", 403, "FORBIDDEN");
    }

    const [businesses, methods, types, timeGroups, regions, users] = await Promise.all([
      prisma.supportBusiness.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.supportMethod.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.supportType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.supportTimeGroup.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.region.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          username: true,
          staff: {
            select: { fullName: true },
          },
        },
        orderBy: { username: "asc" },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.staff?.fullName || u.username,
    }));

    return apiSuccess({
      businesses,
      methods,
      types,
      timeGroups,
      regions,
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("GET /api/v1/master-data/support error:", error);
    return apiError(error.message || "Lỗi hệ thống khi tải danh mục hỗ trợ", 500, "INTERNAL_ERROR");
  }
}
