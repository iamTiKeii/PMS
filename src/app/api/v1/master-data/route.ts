import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/v1/master-data - Danh mục dùng chung hỗ trợ categories, ETag (SRS 8D.3, UC-50)
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const catQuery = searchParams.get("categories");
    const requestedCats = catQuery ? catQuery.split(",").map((c) => c.trim().toUpperCase()) : null;

    const [businesses, methods, types, timeGroups] = await Promise.all([
      (!requestedCats || requestedCats.includes("BUSINESS"))
        ? prisma.supportBusiness.findMany({
            orderBy: { sortOrder: "asc" },
          })
        : [],
      (!requestedCats || requestedCats.includes("CHANNEL"))
        ? prisma.supportMethod.findMany({
            orderBy: { sortOrder: "asc" },
          })
        : [],
      (!requestedCats || requestedCats.includes("DECLARATION"))
        ? prisma.supportType.findMany({
            orderBy: { sortOrder: "asc" },
          })
        : [],
      (!requestedCats || requestedCats.includes("TIME_GROUP"))
        ? prisma.supportTimeGroup.findMany({
            orderBy: { sortOrder: "asc" },
          })
        : [],
    ]);

    const categories: Record<string, any[]> = {};

    if (!requestedCats || requestedCats.includes("BUSINESS")) {
      categories.BUSINESS = businesses.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        sort_order: b.sortOrder,
        is_active: b.isActive,
      }));
    }

    if (!requestedCats || requestedCats.includes("CHANNEL")) {
      categories.CHANNEL = methods.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        sort_order: m.sortOrder,
        is_active: m.isActive,
      }));
    }

    if (!requestedCats || requestedCats.includes("DECLARATION")) {
      categories.DECLARATION = types.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        sort_order: t.sortOrder,
        is_active: t.isActive,
      }));
    }

    if (!requestedCats || requestedCats.includes("TIME_GROUP")) {
      categories.TIME_GROUP = timeGroups.map((tg) => ({
        id: tg.id,
        code: tg.code,
        name: tg.name,
        min_minutes: Math.floor(tg.minSeconds / 60),
        max_minutes: tg.maxSeconds !== null ? Math.floor(tg.maxSeconds / 60) : null,
        is_active: tg.isActive,
      }));
    }

    return apiSuccess({
      version: "1.0",
      categories,
    });
  } catch (error: any) {
    console.error("GET /api/v1/master-data error:", error);
    return apiError("Lỗi hệ thống khi tải danh mục dùng chung", 500, "INTERNAL_ERROR");
  }
}
