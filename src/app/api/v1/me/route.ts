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

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            staffCode: true,
            department: true,
            corporateEmail: true,
            phoneNumber: true,
          },
        },
      },
    });

    return apiSuccess({
      id: user?.id,
      username: user?.username,
      fullName: user?.staff?.fullName || user?.username,
      role: user?.role,
      department: user?.staff?.department || null,
      isSystemAdmin: effective.isSystemAdmin,
      roles: effective.roles,
      permissions: effective.permissions,
      scopes: effective.scopes,
    });
  } catch (error: any) {
    console.error("GET /api/v1/me error:", error);
    return apiError("Lỗi hệ thống khi lấy thông tin người dùng", 500, "INTERNAL_ERROR");
  }
}
