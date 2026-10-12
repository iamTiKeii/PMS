import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/[id]/payment-profile - Lấy thông tin thanh toán phục vụ lời nhắc theo quyền hiện hành
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: targetUserId } = await props.params;

    // Check target user exists and active
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      include: {
        staff: { select: { fullName: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Người dùng không tồn tại." } },
        { status: 404 }
      );
    }

    // Permission check:
    // 1. User accessing their own profile
    // 2. Admin
    // 3. User sharing a group order (payment reminder workflow)
    const isSelf = session.userId === targetUserId;
    const isAdmin = session.role === "admin";

    if (!isSelf && !isAdmin) {
      // Check if targetUser is leader or member in a common active group order
      const commonOrder = await prisma.groupOrder.findFirst({
        where: {
          deletedAt: null,
          OR: [
            // Current user is leader and target is member
            {
              createdById: session.userId,
              members: { some: { userId: targetUserId } },
            },
            // Target user is leader and current user is member
            {
              createdById: targetUserId,
              members: { some: { userId: session.userId } },
            },
            // Both are members of same order
            {
              members: {
                some: { userId: session.userId },
              },
              AND: {
                members: {
                  some: { userId: targetUserId },
                },
              },
            },
          ],
        },
      });

      if (!commonOrder) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MSG-06",
              message: "Bạn không có quyền truy cập thông tin tài khoản ngân hàng của người dùng này.",
            },
          },
          { status: 403 }
        );
      }
    }

    const profile = await prisma.userPaymentConfig.findUnique({
      where: { userId: targetUserId },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Người nhận chưa cấu hình thông tin tài khoản ngân hàng.",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: profile.userId,
        userName: targetUser.staff?.fullName || targetUser.username,
        bankCode: profile.bankCode,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountHolderName: profile.accountName,
        accountName: profile.accountName,
        branch: profile.branch || "",
        defaultContent: profile.defaultContent || "ORDER",
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get user payment profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin thanh toán của người dùng." } },
      { status: 500 }
    );
  }
}
