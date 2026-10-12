import { NextResponse } from "next/server";
import { requireAuth, requireRole, recordAuditLog } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/regions - Lấy danh sách phân loại khu vực
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const regions = await prisma.region.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: regions });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("GET /api/regions error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi lấy danh mục khu vực" }, { status: 500 });
  }
}

// POST /api/regions - Tạo khu vực mới (Admin/PM)
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin", "pm"]);

    const body = await request.json();
    const { code, name, sortOrder, isActive } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Mã và Tên khu vực không được để trống" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    // Kiểm tra trùng lặp
    const existing = await prisma.region.findFirst({
      where: {
        OR: [{ code: cleanCode }, { name: cleanName }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: existing.code === cleanCode ? "Mã khu vực đã tồn tại" : "Tên khu vực đã tồn tại" },
        { status: 409 }
      );
    }

    const region = await prisma.region.create({
      data: {
        code: cleanCode,
        name: cleanName,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: isActive !== false,
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "CREATE_REGION",
      targetEntity: "region",
      targetEntityId: region.id,
      contextJson: { code: cleanCode, name: cleanName },
    });

    return NextResponse.json({ success: true, data: region }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền thực hiện hành động này" }, { status: 403 });
    }
    console.error("POST /api/regions error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi tạo khu vực" }, { status: 500 });
  }
}
