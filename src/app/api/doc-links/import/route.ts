import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { parseUrlInfo, isValidUrl } from "@/lib/url-parser";
import prisma from "@/lib/prisma";

// POST /api/doc-links/import - Batch import doc links from Excel
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Danh sách dữ liệu import trống." } },
        { status: 400 }
      );
    }

    const validLinks: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = String(item.title || "").trim();
      const targetUrl = String(item.targetUrl || "").trim();
      const description = item.description ? String(item.description).trim() : null;

      let tagsArray: string[] = [];
      if (Array.isArray(item.tags)) {
        tagsArray = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === "string") {
        tagsArray = item.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }

      if (!title) {
        errors.push(`Dòng ${i + 1}: Thiếu tên tài liệu.`);
        continue;
      }

      if (!targetUrl || !isValidUrl(targetUrl)) {
        errors.push(`Dòng ${i + 1}: URL không hợp lệ (${targetUrl || "trống"}).`);
        continue;
      }

      const parsed = parseUrlInfo(targetUrl);

      validLinks.push({
        title,
        targetUrl,
        linkCategory: parsed.category,
        tags: JSON.stringify(tagsArray),
        description,
        createdByUserId: session.userId,
      });
    }

    if (validLinks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-400",
            message: "Không có bản ghi nào hợp lệ để nhập vào hệ thống.",
            details: errors,
          },
        },
        { status: 400 }
      );
    }

    await prisma.docLink.createMany({
      data: validLinks,
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "DOC_LINKS_IMPORTED_EXCEL",
      targetEntity: "doc_link",
      contextJson: {
        importedCount: validLinks.length,
        skippedCount: errors.length,
        errors: errors.slice(0, 5),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        importedCount: validLinks.length,
        skippedCount: errors.length,
        errors,
      },
      message: `Đã nhập thành công ${validLinks.length} link tài liệu từ Excel!${errors.length > 0 ? ` (Bỏ qua ${errors.length} dòng lỗi)` : ""}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Import doc links error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trong quá trình import Excel." } },
      { status: 500 }
    );
  }
}
