import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/me/payment-profile - Lấy thông tin ngân hàng cá nhân mặc định
export async function GET() {
  try {
    const session = await requireAuth();

    const profile = await prisma.userPaymentConfig.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        userId: profile.userId,
        bankCode: profile.bankCode,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountHolderName: profile.accountName,
        accountName: profile.accountName,
        branch: profile.branch || "",
        defaultContent: profile.defaultContent || "ORDER",
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get payment profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin thanh toán cá nhân." } },
      { status: 500 }
    );
  }
}

// PUT /api/me/payment-profile - Tạo mới hoặc cập nhật thông tin ngân hàng mặc định
export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { bankCode, bankName, accountNumber, accountHolderName, accountName, branch, defaultContent } = body;

    const finalAccountName = (accountHolderName || accountName || "").trim();

    if (!bankCode || !bankCode.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PAY-01", message: "Vui lòng chọn hoặc nhập mã ngân hàng." } },
        { status: 400 }
      );
    }

    if (!accountNumber || !accountNumber.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PAY-02", message: "Số tài khoản không được để trống." } },
        { status: 400 }
      );
    }

    if (!finalAccountName) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-PAY-03", message: "Tên chủ tài khoản không được để trống." } },
        { status: 400 }
      );
    }

    // Preserve leading zeros: store strictly as string
    const cleanAccNo = String(accountNumber).trim().replace(/\s+/g, "");
    const cleanAccHolder = finalAccountName.toUpperCase();
    const cleanBankCode = bankCode.trim().toUpperCase();
    const cleanBankName = (bankName || bankCode).trim();
    const cleanBranch = branch ? String(branch).trim() : null;
    const cleanDefaultContent = defaultContent ? String(defaultContent).trim() : "ORDER";

    const updated = await prisma.userPaymentConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        bankCode: cleanBankCode,
        bankName: cleanBankName,
        accountNumber: cleanAccNo,
        accountName: cleanAccHolder,
        branch: cleanBranch,
        defaultContent: cleanDefaultContent,
      },
      update: {
        bankCode: cleanBankCode,
        bankName: cleanBankName,
        accountNumber: cleanAccNo,
        accountName: cleanAccHolder,
        branch: cleanBranch,
        defaultContent: cleanDefaultContent,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu thông tin tài khoản ngân hàng mặc định thành công.",
      data: {
        id: updated.id,
        userId: updated.userId,
        bankCode: updated.bankCode,
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountHolderName: updated.accountName,
        accountName: updated.accountName,
        branch: updated.branch || "",
        defaultContent: updated.defaultContent,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Save payment profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi lưu thông tin thanh toán cá nhân." } },
      { status: 500 }
    );
  }
}

// POST /api/me/payment-profile - Hỗ trợ cả method POST
export async function POST(request: Request) {
  return PUT(request);
}

// DELETE /api/me/payment-profile - Xóa thông tin ngân hàng cá nhân
export async function DELETE() {
  try {
    const session = await requireAuth();

    await prisma.userPaymentConfig.deleteMany({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa thông tin ngân hàng cá nhân.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Delete payment profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa thông tin ngân hàng cá nhân." } },
      { status: 500 }
    );
  }
}
