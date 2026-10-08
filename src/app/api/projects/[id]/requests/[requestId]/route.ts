import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { isValidUrl } from "@/lib/url-parser";
import { createSystemNotification } from "@/lib/notifications";
import { logRequestActivity } from "@/lib/request-activities";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "(trống)";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "(trống)";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// GET /api/projects/[id]/requests/[requestId] - UC-36: View request details & timeline
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    await requireAuth();
    const { id: projectId, requestId } = await props.params;

    const item = await prisma.projectRequest.findFirst({
      where: {
        id: requestId,
        projectId,
        deletedAt: null,
      },
      include: {
        project: {
          select: { id: true, projectName: true, projectCode: true, shortName: true },
        },
        requester: {
          select: { id: true, fullName: true, staffCode: true, corporateEmail: true, department: true },
        },
        receiver: {
          select: { id: true, fullName: true, staffCode: true, corporateEmail: true, department: true },
        },
        followers: {
          include: {
            staff: {
              select: { id: true, fullName: true, staffCode: true, corporateEmail: true },
            },
          },
        },
        activities: {
          orderBy: { eventTime: "desc" },
        },
        createdByUser: {
          select: { id: true, username: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-76", message: "Yêu cầu không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    // Parse metadataJson cho timeline activities
    const formattedActivities = (item.activities || []).map((act) => {
      let metadata = null;
      if (act.metadataJson) {
        try {
          metadata = JSON.parse(act.metadataJson);
        } catch {}
      }
      return {
        ...act,
        metadata,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        activities: formattedActivities,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Get request error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải thông tin yêu cầu." } },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/requests/[requestId] - UC-37: Update request (requestCode cannot be changed)
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId, requestId } = await props.params;
    const body = await request.json();

    const existing = await prisma.projectRequest.findFirst({
      where: {
        id: requestId,
        projectId,
        deletedAt: null,
      },
      include: {
        followers: {
          include: { staff: true },
        },
        project: true,
        requester: true,
        receiver: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-76", message: "Yêu cầu không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    const {
      requesterId,
      requesterName,
      department,
      receiverId,
      content,
      dueDate,
      followerIds,
      jiraUrl,
      status,
    } = body;

    // BR-27: Người yêu cầu và Nội dung bắt buộc
    const hasRequester = Boolean(requesterId || (requesterName && requesterName.trim()) || existing.requesterId || existing.requesterName);
    if (!hasRequester) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-70", message: "Người yêu cầu không được để trống." } },
        { status: 400 }
      );
    }

    if (content !== undefined && (!content || !content.trim())) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-71", message: "Nội dung yêu cầu không được để trống." } },
        { status: 400 }
      );
    }

    // BR-29: Due date validation
    let parsedDueDate: Date | null = existing.dueDate;
    if (dueDate !== undefined) {
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          return NextResponse.json(
            { success: false, error: { code: "MSG-72", message: "Due Date không hợp lệ." } },
            { status: 400 }
          );
        }
      } else {
        parsedDueDate = null;
      }
    }

    // BR-31: Jira URL
    if (jiraUrl !== undefined && jiraUrl && jiraUrl.trim()) {
      if (!isValidUrl(jiraUrl.trim()) || jiraUrl.length > 2000) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-73", message: "Link Jira không hợp lệ." } },
          { status: 400 }
        );
      }
    }

    // Update followers if provided
    let addedFollowerNames: string[] = [];
    let removedFollowerNames: string[] = [];
    if (followerIds !== undefined && Array.isArray(followerIds)) {
      const oldFollowerIds = existing.followers.map((f) => f.staffId);
      const uniqueFollowerIds = Array.from(new Set(followerIds.filter(Boolean) as string[]));

      const addedIds = uniqueFollowerIds.filter((id) => !oldFollowerIds.includes(id));
      const removedIds = oldFollowerIds.filter((id) => !uniqueFollowerIds.includes(id));

      if (addedIds.length > 0) {
        const addedStaff = await prisma.staff.findMany({
          where: { id: { in: addedIds } },
          select: { fullName: true },
        });
        addedFollowerNames = addedStaff.map((s) => s.fullName);
      }

      if (removedIds.length > 0) {
        const removedStaff = existing.followers
          .filter((f) => removedIds.includes(f.staffId))
          .map((f) => f.staff?.fullName || "Nhân sự");
        removedFollowerNames = removedStaff;
      }

      await prisma.requestFollower.deleteMany({
        where: { requestId },
      });
      if (uniqueFollowerIds.length > 0) {
        await prisma.requestFollower.createMany({
          data: uniqueFollowerIds.map((sId) => ({
            requestId,
            staffId: sId,
          })),
        });
      }
    }

    const updated = await prisma.projectRequest.update({
      where: { id: requestId },
      data: {
        // BR-32: Không bao giờ cập nhật requestCode
        requesterId: requesterId !== undefined ? (requesterId || null) : existing.requesterId,
        requesterName: requesterName !== undefined ? (requesterName ? requesterName.trim() : null) : existing.requesterName,
        department: department !== undefined ? (department ? department.trim() : null) : existing.department,
        receiverId: receiverId !== undefined ? (receiverId || null) : existing.receiverId,
        content: content !== undefined ? content.trim() : existing.content,
        dueDate: parsedDueDate,
        jiraUrl: jiraUrl !== undefined ? (jiraUrl ? jiraUrl.trim() : null) : existing.jiraUrl,
        status: status || existing.status,
      },
      include: {
        requester: true,
        receiver: true,
        followers: {
          include: { staff: true },
        },
      },
    });

    const actorName = (session as any).fullName || session.username;

    // GHI NHẬN ACTIVITY TIMELINE (Mục 13 & 8 Event Engine)
    // 1. Thay đổi trạng thái / Hoàn thành / Mở lại
    if (status && status !== existing.status) {
      if (status === "completed") {
        await logRequestActivity({
          requestId,
          eventCode: "REQUEST_COMPLETED",
          actorId: session.userId,
          actorName,
          title: "QLYC hoàn thành",
          description: `${actorName} đã chuyển trạng thái yêu cầu sang Hoàn thành`,
          metadata: { old_status: existing.status, new_status: "completed" },
        });

        createSystemNotification({
          eventCode: "REQUEST_COMPLETED",
          title: `✅ QLYC hoàn thành: ${existing.requestCode}`,
          content: `QLYC ${existing.requestCode} tại dự án "${existing.project.projectName}" đã được đánh dấu Hoàn thành bởi ${actorName}.`,
          type: "request",
          severity: "success",
          objectType: "project_request",
          objectId: requestId,
          targetUrl: `/projects/${projectId}`,
          createdById: session.userId,
          actorName,
        }).catch((e) => console.error("Notification error:", e));
      } else if (existing.status === "completed") {
        await logRequestActivity({
          requestId,
          eventCode: "REQUEST_REOPENED",
          actorId: session.userId,
          actorName,
          title: "QLYC được mở lại",
          description: `${actorName} đã mở lại QLYC (Hoàn thành → ${status})`,
          metadata: { old_status: "completed", new_status: status },
        });

        createSystemNotification({
          eventCode: "REQUEST_REOPENED",
          title: `🔄 QLYC được mở lại: ${existing.requestCode}`,
          content: `QLYC ${existing.requestCode} tại dự án "${existing.project.projectName}" đã được mở lại bởi ${actorName}.`,
          type: "request",
          severity: "warning",
          objectType: "project_request",
          objectId: requestId,
          targetUrl: `/projects/${projectId}`,
          createdById: session.userId,
          actorName,
        }).catch((e) => console.error("Notification error:", e));
      } else {
        await logRequestActivity({
          requestId,
          eventCode: "REQUEST_STATUS_CHANGED",
          actorId: session.userId,
          actorName,
          title: "QLYC chuyển trạng thái",
          description: `Trạng thái: ${existing.status} → ${status}`,
          metadata: { old_value: existing.status, new_value: status },
        });
      }
    }

    // 2. Thay đổi hạn xử lý (Due Date)
    const oldDueStr = existing.dueDate ? new Date(existing.dueDate).toISOString().slice(0, 10) : "";
    const newDueStr = parsedDueDate ? new Date(parsedDueDate).toISOString().slice(0, 10) : "";
    if (dueDate !== undefined && oldDueStr !== newDueStr) {
      await logRequestActivity({
        requestId,
        eventCode: "REQUEST_DUE_DATE_CHANGED",
        actorId: session.userId,
        actorName,
        title: "Thay đổi hạn xử lý",
        description: `Hạn xử lý: ${formatDateShort(existing.dueDate)} → ${formatDateShort(parsedDueDate)}`,
        metadata: {
          old_value: formatDateShort(existing.dueDate),
          new_value: formatDateShort(parsedDueDate),
        },
      });
    }

    // 3. Thay đổi liên kết Jira
    const oldJira = existing.jiraUrl || "";
    const newJira = updated.jiraUrl || "";
    if (jiraUrl !== undefined && oldJira !== newJira) {
      await logRequestActivity({
        requestId,
        eventCode: "REQUEST_JIRA_CHANGED",
        actorId: session.userId,
        actorName,
        title: "Thay đổi liên kết Jira",
        description: `Jira: ${oldJira || "(trống)"} → ${newJira || "(trống)"}`,
        metadata: {
          old_value: oldJira || null,
          new_value: newJira || null,
        },
      });
    }

    // 4. Phân công / Hủy phân công nhân sự theo dõi
    if (addedFollowerNames.length > 0) {
      await logRequestActivity({
        requestId,
        eventCode: "REQUEST_ASSIGNED",
        actorId: session.userId,
        actorName,
        title: "Thêm nhân sự theo dõi",
        description: `Nhân sự được thêm: ${addedFollowerNames.join(", ")}`,
        metadata: {
          added_staff: addedFollowerNames,
        },
      });

      createSystemNotification({
        eventCode: "REQUEST_ASSIGNED",
        title: `📋 Phân công theo dõi QLYC: ${existing.requestCode}`,
        content: `Nhân sự được phân công theo dõi QLYC ${existing.requestCode} tại dự án "${existing.project.projectName}": ${addedFollowerNames.join(", ")}.`,
        type: "request",
        severity: "important",
        objectType: "project_request",
        objectId: requestId,
        targetUrl: `/projects/${projectId}`,
        createdById: session.userId,
        actorName,
      }).catch((e) => console.error("Notification error:", e));
    }

    if (removedFollowerNames.length > 0) {
      await logRequestActivity({
        requestId,
        eventCode: "REQUEST_UNASSIGNED",
        actorId: session.userId,
        actorName,
        title: "Hủy nhân sự theo dõi",
        description: `Nhân sự không còn theo dõi: ${removedFollowerNames.join(", ")}`,
        metadata: {
          removed_staff: removedFollowerNames,
        },
      });
    }

    // 5. Cập nhật nội dung / thông tin chung
    const fieldChanges: string[] = [];
    if (content !== undefined && content.trim() !== existing.content.trim()) {
      fieldChanges.push("Nội dung yêu cầu");
    }
    if (department !== undefined && (department || "").trim() !== (existing.department || "").trim()) {
      fieldChanges.push("Khoa / phòng");
    }
    if (requesterId !== undefined && requesterId !== existing.requesterId) {
      fieldChanges.push("Người yêu cầu");
    } else if (requesterName !== undefined && requesterName !== existing.requesterName) {
      fieldChanges.push("Tên người yêu cầu");
    }
    if (receiverId !== undefined && receiverId !== existing.receiverId) {
      fieldChanges.push("Nhân viên tiếp nhận");
    }

    if (fieldChanges.length > 0) {
      await logRequestActivity({
        requestId,
        eventCode: "REQUEST_UPDATED",
        actorId: session.userId,
        actorName,
        title: "Cập nhật thông tin yêu cầu",
        description: `Đã cập nhật: ${fieldChanges.join(", ")}`,
        metadata: {
          changes: fieldChanges,
        },
      });
    }

    // Record audit log with before/after state (BR-34, UC-37)
    await recordAuditLog({
      userId: session.userId,
      actionCode: "REQUEST_UPDATED",
      targetEntity: "project_request",
      targetEntityId: requestId,
      contextJson: {
        requestCode: existing.requestCode,
        projectId,
        before: {
          department: existing.department,
          status: existing.status,
          dueDate: existing.dueDate,
          jiraUrl: existing.jiraUrl,
        },
        after: {
          department: updated.department,
          status: updated.status,
          dueDate: updated.dueDate,
          jiraUrl: updated.jiraUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật yêu cầu.", // MSG-74
      data: updated,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Update request error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi cập nhật yêu cầu." } },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/requests/[requestId] - UC-38: Soft delete request
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId, requestId } = await props.params;

    const existing = await prisma.projectRequest.findFirst({
      where: {
        id: requestId,
        projectId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-76", message: "Yêu cầu không tồn tại hoặc đã bị xóa." } },
        { status: 404 }
      );
    }

    const actorName = (session as any).fullName || session.username;

    // UC-38, BR-24, BR-33: Soft delete, do NOT reuse or decrement sequence
    await prisma.projectRequest.update({
      where: { id: requestId },
      data: { deletedAt: new Date() },
    });

    // Ghi timeline activity xóa yêu cầu
    await logRequestActivity({
      requestId,
      eventCode: "REQUEST_DELETED",
      actorId: session.userId,
      actorName,
      title: "Xóa yêu cầu",
      description: `${actorName} đã xóa yêu cầu ${existing.requestCode}`,
      metadata: { requestCode: existing.requestCode },
    });

    // Audit log (BR-34)
    await recordAuditLog({
      userId: session.userId,
      actionCode: "REQUEST_DELETED",
      targetEntity: "project_request",
      targetEntityId: requestId,
      contextJson: {
        requestCode: existing.requestCode,
        projectId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa yêu cầu.", // MSG-75
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Delete request error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi xóa yêu cầu." } },
      { status: 500 }
    );
  }
}
