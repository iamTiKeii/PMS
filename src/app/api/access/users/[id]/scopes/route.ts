import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { recordAccessAudit } from "@/lib/access-control";

export const dynamic = "force-dynamic";

// GET /api/access/users/[id]/scopes - Lấy phạm vi truy cập dữ liệu của người dùng
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        staff: true,
        userScopes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy người dùng." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        fullName: user.staff?.fullName || user.username,
        department: user.staff?.department || null,
        scopes: user.userScopes,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: "Lỗi tải phạm vi truy cập của người dùng" } },
      { status: 500 }
    );
  }
}

// PUT /api/access/users/[id]/scopes - Cập nhật phạm vi truy cập dữ liệu cho người dùng
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        staff: true,
        userScopes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Không tìm thấy người dùng." } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { scopes } = body; // Array of { scopeType, targetId?, targetName?, notes? }

    if (!Array.isArray(scopes)) {
      return NextResponse.json(
        { success: false, error: { message: "Tham số 'scopes' phải là một mảng." } },
        { status: 400 }
      );
    }

    const oldScopes = user.userScopes;

    // Xóa các scope cũ
    await prisma.userRoleScope.deleteMany({
      where: { userId: id },
    });

    // Thêm các scope mới
    for (const s of scopes) {
      if (s.scopeType) {
        await prisma.userRoleScope.create({
          data: {
            userId: id,
            scopeType: s.scopeType,
            targetId: s.targetId || null,
            targetName: s.targetName || null,
            notes: s.notes || null,
          },
        });
      }
    }

    const updatedScopes = await prisma.userRoleScope.findMany({
      where: { userId: id },
    });

    await recordAccessAudit({
      actor,
      action: "update_user_scope",
      targetType: "scope",
      targetId: id,
      targetName: user.staff?.fullName || user.username,
      summary: `Cập nhật phạm vi truy cập dữ liệu cho "${user.username}": ${updatedScopes.map((s) => s.scopeType).join(", ")}`,
      beforeData: oldScopes,
      afterData: updatedScopes,
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật phạm vi dữ liệu cho tài khoản "${user.username}".`,
      data: updatedScopes,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || "Lỗi cập nhật phạm vi truy cập" } },
      { status: 500 }
    );
  }
}
