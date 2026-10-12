import { getSessionUser } from "@/lib/auth";
import { getEffectiveUserPermissions } from "@/lib/access-control";
import prisma from "@/lib/prisma";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/v1/projects/options - Danh sách dự án rút gọn cho Extension và các dropdown (BR-36, UC-49)
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return apiError("Chưa đăng nhập hoặc phiên đã hết hạn", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const effective = await getEffectiveUserPermissions(session.userId);

    let whereClause: any = {
      deletedAt: null,
    };

    if (q) {
      whereClause.OR = [
        { projectName: { contains: q } },
        { projectCode: { contains: q } },
        { shortName: { contains: q } },
      ];
    }

    // Nếu không phải admin hoặc scope system, giới hạn dự án được cấp quyền
    if (effective && !effective.isSystemAdmin && !effective.scopes.some((s) => s.scopeType === "system")) {
      const projectScopeIds = effective.scopes
        .filter((s) => s.scopeType === "project" && s.targetId)
        .map((s) => s.targetId as string);

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

      const combinedIds = Array.from(new Set([...projectScopeIds, ...assignedProjectIds]));
      whereClause.id = { in: combinedIds };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      select: {
        id: true,
        projectName: true,
        projectCode: true,
        shortName: true,
        status: true,
      },
      orderBy: { projectName: "asc" },
      take: 100,
    });

    const formatted = projects.map((p) => ({
      id: p.id,
      name: p.projectName,
      code: p.projectCode || p.shortName || "",
      status: p.status,
    }));

    return apiSuccess(formatted);
  } catch (error: any) {
    console.error("GET /api/v1/projects/options error:", error);
    return apiError("Lỗi hệ thống khi lấy danh sách dự án", 500, "INTERNAL_ERROR");
  }
}
