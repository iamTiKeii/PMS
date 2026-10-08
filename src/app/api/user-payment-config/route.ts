import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/user-payment-config - Lấy cấu hình tài khoản nhận tiền của user
export async function GET() {
  try {
    const session = await requireAuth();

    const config = await prisma.userPaymentConfig.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      success: true,
      data: config || null,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải cấu hình thanh toán." } },
      { status: 500 }
    );
  }
}

// POST /api/user-payment-config - Lưu / Cập nhật cấu hình tài khoản nhận tiền
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { bankCode, bankName, accountNumber, accountName, defaultContent } = body;

    if (!bankCode || !bankCode.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-01", message: "Vui lòng chọn ngân hàng." } },
        { status: 400 }
      );
    }

    if (!accountNumber || !accountNumber.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-02", message: "Số tài khoản không được để trống." } },
        { status: 400 }
      );
    }

    if (!accountName || !accountName.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-03", message: "Tên chủ tài khoản không được để trống." } },
        { status: 400 }
      );
    }

    const cleanAccNo = accountNumber.trim().replace(/\s+/g, "");
    const cleanAccName = accountName.trim().toUpperCase();

    const config = await prisma.userPaymentConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        bankCode: bankCode.trim().toUpperCase(),
        bankName: (bankName || bankCode).trim(),
        accountNumber: cleanAccNo,
        accountName: cleanAccName,
        defaultContent: defaultContent ? defaultContent.trim() : "ORDER",
      },
      update: {
        bankCode: bankCode.trim().toUpperCase(),
        bankName: (bankName || bankCode).trim(),
        accountNumber: cleanAccNo,
        accountName: cleanAccName,
        defaultContent: defaultContent ? defaultContent.trim() : "ORDER",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình tài khoản nhận tiền.",
      data: config,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Save payment config error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi lưu cấu hình thanh toán." } },
      { status: 500 }
    );
  }
}
