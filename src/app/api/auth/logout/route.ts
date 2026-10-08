import { NextResponse } from "next/server";
import { getSessionUser, recordAuditLog, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSessionUser();

    if (session) {
      await recordAuditLog({
        userId: session.userId,
        actionCode: "AUTH_LOGOUT",
        targetEntity: "user",
        targetEntityId: session.userId,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công.",
    });

    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Đã xảy ra lỗi khi đăng xuất." } },
      { status: 500 }
    );
  }
}
