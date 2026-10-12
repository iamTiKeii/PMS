import { getSessionUser } from "@/lib/auth";
import { getEffectiveUserPermissions } from "@/lib/access-control";
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

    const effective = await getEffectiveUserPermissions(session.userId);
    if (!effective) {
      return apiError("Tài khoản không tồn tại hoặc đã bị khóa", 403, "FORBIDDEN");
    }

    let projects = [];

    // Nếu là admin hoặc có scope system thì xem được toàn bộ dự án
    if (effective.isSystemAdmin || effective.scopes.some((s) => s.scopeType === "system")) {
      projects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          projectCode: true,
          projectName: true,
          status: true,
          systemHisUrl: true,
          regionId: true,
          region: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { projectName: "asc" },
      });
    } else {
      // Tìm các project theo: 1) direct project scope; 2) ProjectAssignment của nhân sự
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

      projects = await prisma.project.findMany({
        where: {
          id: { in: combinedIds },
          deletedAt: null,
        },
        select: {
          id: true,
          projectCode: true,
          projectName: true,
          status: true,
          systemHisUrl: true,
          regionId: true,
          region: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { projectName: "asc" },
      });
    }

    return apiSuccess(projects);
  } catch (error: any) {
    console.error("GET /api/v1/me/projects error:", error);
    return apiError(error.message || "Lỗi hệ thống khi lấy danh sách dự án", 500, "INTERNAL_ERROR");
  }
}
