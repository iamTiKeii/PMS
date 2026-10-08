import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: any = {};

    if (q) {
      where.OR = [
        { code: { contains: q } },
        { name: { contains: q } },
        { address: { contains: q } },
      ];
    }

    const hospitals = await prisma.hospitalFacility.findMany({
      where,
      orderBy: [{ code: "asc" }],
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        technicalLine: true,
        hospitalRank: true,
        technicalLevel: true,
        score: true,
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: hospitals,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Phiên đăng nhập hết hạn." } },
        { status: 401 }
      );
    }
    console.error("GET /api/hospitals error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh mục cơ sở khám chữa bệnh." } },
      { status: 500 }
    );
  }
}
