import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/access/permissions - Danh mục quyền hệ thống
export async function GET() {
  try {
    await requireAuth();

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { resource: "asc" }, { code: "asc" }],
    });

    // Gom nhóm theo module
    const moduleMap: Record<string, { module: string; moduleName: string; permissions: any[] }> = {};

    const moduleNameMap: Record<string, string> = {
      projects: "Quản lý Dự án",
      doc_links: "Kho Link Docs / Sheets",
      staff: "Danh mục Nhân sự",
      group_orders: "Đơn đặt nhóm",
      vault: "Két Mật khẩu Site",
      access: "Quản trị truy cập",
      system: "Hệ thống & Cấu hình",
    };

    for (const p of permissions) {
      if (!moduleMap[p.module]) {
        moduleMap[p.module] = {
          module: p.module,
          moduleName: moduleNameMap[p.module] || p.module,
          permissions: [],
        };
      }
      moduleMap[p.module].permissions.push(p);
    }

    return NextResponse.json({
      success: true,
      data: {
        total: permissions.length,
        modules: Object.values(moduleMap),
        allPermissions: permissions,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: { message: "Chưa đăng nhập" } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { message: "Lỗi tải danh mục quyền" } }, { status: 500 });
  }
}
