import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/regions/[id] - Cập nhật khu vực
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin", "pm"]);
    const { id } = await params;

    const body = await request.json();
    const { code, name, sortOrder, isActive } = body;

    const existing = await prisma.region.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy khu vực" }, { status: 404 });
    }

    const cleanCode = code ? code.trim().toUpperCase() : existing.code;
    const cleanName = name ? name.trim() : existing.name;

    // Kiểm tra trùng lặp với bản ghi khác
    if (cleanCode !== existing.code || cleanName !== existing.name) {
      const duplicate = await prisma.region.findFirst({
        where: {
          id: { not: id },
          OR: [{ code: cleanCode }, { name: cleanName }],
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: duplicate.code === cleanCode ? "Mã khu vực đã tồn tại" : "Tên khu vực đã tồn tại" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.region.update({
      where: { id },
      data: {
        code: cleanCode,
        name: cleanName,
        sortOrder: typeof sortOrder === "number" ? sortOrder : existing.sortOrder,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "UPDATE_REGION",
      targetEntity: "region",
      targetEntityId: id,
      contextJson: { code: cleanCode, name: cleanName },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền thực hiện hành động này" }, { status: 403 });
    }
    console.error("PUT /api/regions/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi cập nhật khu vực" }, { status: 500 });
  }
}

// DELETE /api/regions/[id] - Xóa khu vực
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;

    const existing = await prisma.region.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy khu vực" }, { status: 404 });
    }

    if (existing._count.projects > 0) {
      return NextResponse.json(
        { error: `Không thể xóa khu vực đang được gán cho ${existing._count.projects} dự án. Vui lòng chuyển dự án sang khu vực khác trước.` },
        { status: 400 }
      );
    }

    await prisma.region.delete({
      where: { id },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "DELETE_REGION",
      targetEntity: "region",
      targetEntityId: id,
      contextJson: { code: existing.code, name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền thực hiện hành động này" }, { status: 403 });
    }
    console.error("DELETE /api/regions/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi xóa khu vực" }, { status: 500 });
  }
}
