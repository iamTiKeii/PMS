import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { parseUrlInfo, isValidUrl } from "@/lib/url-parser";
import prisma from "@/lib/prisma";

// GET /api/doc-links - List doc links
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category") || "";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { targetUrl: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    if (category && category !== "all") {
      where.linkCategory = category;
    }

    const links = await prisma.docLink.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            role: true,
            staff: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: links,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List doc links error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách tài liệu." } },
      { status: 500 }
    );
  }
}

// POST /api/doc-links - Create new doc link
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { title, targetUrl, description, tags = [], forceSave = false } = body;

    if (!title || !targetUrl) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập tên tài liệu và đường dẫn URL." } },
        { status: 400 }
      );
    }

    if (!isValidUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-32", message: "Đường dẫn không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://." } },
        { status: 400 }
      );
    }

    const parsed = parseUrlInfo(targetUrl);

    // Smart duplicate check (BR-09)
    if (!forceSave) {
      const existing = await prisma.docLink.findFirst({
        where: {
          targetUrl: targetUrl.trim(),
          deletedAt: null,
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            isDuplicateWarning: true,
            code: "MSG-31",
            message: `Đường dẫn này đã được lưu trong hệ thống với tên "${existing.title}". Bạn có muốn tiếp tục lưu thêm bản ghi này không?`,
            existingId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    const tagsArray = Array.isArray(tags) ? tags : [];

    const newLink = await prisma.docLink.create({
      data: {
        title: title.trim(),
        targetUrl: targetUrl.trim(),
        linkCategory: parsed.category,
        tags: JSON.stringify(tagsArray),
        description: description ? description.trim() : null,
        createdByUserId: session.userId,
      },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "DOC_LINK_CREATED",
      targetEntity: "doc_link",
      targetEntityId: newLink.id,
      contextJson: { title: newLink.title, category: newLink.linkCategory },
    });

    return NextResponse.json({
      success: true,
      data: newLink,
      message: "Thêm link tài liệu thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Create doc link error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo link tài liệu mới." } },
      { status: 500 }
    );
  }
}
