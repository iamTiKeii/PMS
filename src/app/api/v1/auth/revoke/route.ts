import { getSessionUser, recordAuditLog } from "@/lib/auth";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/v1/auth/revoke - Thu hồi phiên đăng nhập Extension (SRS 8D.2, UC-48, UC-51)
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (session) {
      await recordAuditLog({
        userId: session.userId,
        actionCode: "ext_revoke",
        targetEntity: "session",
        targetEntityId: session.userId,
        contextJson: { reason: "User logged out from Extension" },
      });
    }

    const response = apiSuccess({ revoked: true, message: "Đã thu hồi phiên đăng nhập" });
    response.cookies.delete("pms_session");
    return response;
  } catch (error: any) {
    console.error("POST /api/v1/auth/revoke error:", error);
    return apiError("Lỗi hệ thống khi thu hồi phiên", 500, "INTERNAL_ERROR");
  }
}
