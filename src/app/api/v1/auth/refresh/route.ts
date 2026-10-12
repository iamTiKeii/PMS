import prisma from "@/lib/prisma";
import { signSessionToken } from "@/lib/crypto";
import { apiSuccess, apiError, handleCorsOptions } from "@/lib/api-helper";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "pms_jwt_secret_token_default_fallback_2026";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * POST /api/v1/auth/refresh - Làm mới access token bằng refresh token (SRS 8D.2, BR-45)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return apiError("Thiếu refresh_token", 400, "MISSING_TOKEN");
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refresh_token, JWT_SECRET);
    } catch (e) {
      return apiError("Refresh token không hợp lệ hoặc đã hết hạn", 401, "INVALID_TOKEN");
    }

    if (decoded.tokenType !== "refresh" || !decoded.userId) {
      return apiError("Loại token không đúng", 401, "INVALID_TOKEN_TYPE");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
      include: { staff: true },
    });

    if (!user || user.status === "locked" || user.status === "inactive") {
      return apiError("Tài khoản đã bị khóa hoặc ngừng hoạt động", 403, "MSG-04");
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role as "admin" | "pm" | "user",
      staffId: user.staffId,
      fullName: user.staff?.fullName || user.username,
    };

    const newAccessToken = signSessionToken(sessionPayload);
    // Xoay vòng (rotate) refresh token
    const newRefreshToken = jwt.sign(
      { userId: user.id, username: user.username, tokenType: "refresh" },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    return apiSuccess({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 1800,
      refresh_token: newRefreshToken,
      refresh_expires_in: 1209600,
    });
  } catch (error: any) {
    console.error("POST /api/v1/auth/refresh error:", error);
    return apiError("Lỗi hệ thống khi làm mới token", 500, "INTERNAL_ERROR");
  }
}
