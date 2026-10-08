import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { parseUrlInfo, isValidUrl } from "@/lib/url-parser";
import prisma from "@/lib/prisma";

// PUT /api/doc-links/[id] - Update doc link
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;
    const body = await request.json();
    const { title, targetUrl, description, tags } = body;

    const existingLink = await prisma.docLink.findUnique({
      where: { id },
    });

    if (!existingLink || existingLink.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài liệu không tồn tại." } },
        { status: 404 }
      );
    }

    // Permission check: Admin or creator
    if (session.role !== "admin" && session.role !== "pm" && existingLink.createdByUserId !== session.userId) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn chỉ có thể chỉnh sửa link tài liệu do chính mình tạo." } },
        { status: 403 }
      );
    }

    if (targetUrl && !isValidUrl(targetUrl)) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-32", message: "Đường dẫn không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://." } },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (targetUrl) {
      updateData.targetUrl = targetUrl.trim();
      const parsed = parseUrlInfo(targetUrl);
      updateData.linkCategory = parsed.category;
    }
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);

    const updated = await prisma.docLink.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "DOC_LINK_UPDATED",
      targetEntity: "doc_link",
      targetEntityId: updated.id,
      contextJson: { changes: updateData },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Cập nhật link tài liệu thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Update doc link error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật link tài liệu." } },
      { status: 500 }
    );
  }
}

// DELETE /api/doc-links/[id] - Soft-delete doc link
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await props.params;

    const existingLink = await prisma.docLink.findUnique({
      where: { id },
    });

    if (!existingLink || existingLink.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Tài liệu không tồn tại." } },
        { status: 404 }
      );
    }

    // Permission check
    if (session.role !== "admin" && session.role !== "pm" && existingLink.createdByUserId !== session.userId) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn chỉ có thể xóa link tài liệu do chính mình tạo." } },
        { status: 403 }
      );
    }

    await prisma.docLink.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      userId: session.userId,
      actionCode: "DOC_LINK_DELETED_SOFT",
      targetEntity: "doc_link",
      targetEntityId: existingLink.id,
      contextJson: { title: existingLink.title },
    });

    return NextResponse.json({
      success: true,
      message: "Xóa link tài liệu thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Delete doc link error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi khi xóa link tài liệu." } },
      { status: 500 }
    );
  }
}
