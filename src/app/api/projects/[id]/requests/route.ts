import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { isValidUrl } from "@/lib/url-parser";
import { createSystemNotification } from "@/lib/notifications";
import { logRequestActivity } from "@/lib/request-activities";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/projects/[id]/requests - UC-34, UC-39: List and search requests
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: projectId } = await props.params;
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const requesterId = searchParams.get("requesterId") || "";
    const department = searchParams.get("department") || "";
    const receiverId = searchParams.get("receiverId") || "";
    const followerId = searchParams.get("followerId") || "";
    const dueDate = searchParams.get("dueDate") || "";
    const hasJira = searchParams.get("hasJira"); // "true", "false", or empty

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectName: true, projectCode: true, shortName: true, deletedAt: true },
    });

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }

    const where: any = {
      projectId,
      deletedAt: null, // UC-38, BR-33: Không hiển thị yêu cầu bị xóa mềm
    };

    if (q) {
      where.OR = [
        { requestCode: { contains: q } },
        { content: { contains: q } },
        { requesterName: { contains: q } },
        { department: { contains: q } },
        { requester: { fullName: { contains: q } } },
        { receiver: { fullName: { contains: q } } },
      ];
    }

    if (requesterId && requesterId !== "all") {
      where.requesterId = requesterId;
    }

    if (department && department !== "all") {
      where.department = { contains: department };
    }

    if (receiverId && receiverId !== "all") {
      where.receiverId = receiverId;
    }

    if (followerId && followerId !== "all") {
      where.followers = {
        some: { staffId: followerId },
      };
    }

    if (dueDate && dueDate !== "all") {
      // Due Date dạng YYYY-MM-DD
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        const start = new Date(parsedDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(parsedDate);
        end.setUTCHours(23, 59, 59, 999);
        where.dueDate = {
          gte: start,
          lte: end,
        };
      }
    }

    if (hasJira === "true") {
      where.jiraUrl = { not: null, notIn: [""] };
    } else if (hasJira === "false") {
      where.OR = [
        { jiraUrl: null },
        { jiraUrl: "" },
      ];
    }

    // Default sort: requestCode desc (yêu cầu mới nhất nằm trên cùng - UC-34)
    const requests = await prisma.projectRequest.findMany({
      where,
      include: {
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
        createdByUser: {
          select: { id: true, username: true },
        },
      },
      orderBy: [
        { requestCode: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: requests,
      total: requests.length,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List project requests error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách yêu cầu dự án." } },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/requests - UC-35: Create new request (Server-generated sequential code)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId } = await props.params;
    const body = await request.json();

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

    // Validation BR-27: Người yêu cầu và Nội dung là bắt buộc
    const hasRequester = Boolean(requesterId || (requesterName && requesterName.trim()));
    if (!hasRequester) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-70", message: "Người yêu cầu không được để trống." } },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-71", message: "Nội dung yêu cầu không được để trống." } },
        { status: 400 }
      );
    }

    // Validation BR-29: Due Date không nhỏ hơn ngày tạo (ngày hiện tại)
    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-72", message: "Due Date không hợp lệ." } },
          { status: 400 }
        );
      }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dueStart = new Date(parsedDueDate);
      dueStart.setHours(0, 0, 0, 0);

      if (dueStart < todayStart) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-72", message: "Due Date không được nhỏ hơn ngày hiện tại." } },
          { status: 400 }
        );
      }
    }

    // Validation BR-31: Link Jira nếu có phải là URL http(s):// hợp lệ
    if (jiraUrl && jiraUrl.trim()) {
      if (!isValidUrl(jiraUrl.trim()) || jiraUrl.length > 2000) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-73", message: "Link Jira không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://." } },
          { status: 400 }
        );
      }
    }

    // Kiểm tra nhân sự theo dõi tồn tại (BR-30)
    let validFollowerIds: string[] = [];
    if (Array.isArray(followerIds) && followerIds.length > 0) {
      const uniqueFollowerIds = Array.from(new Set(followerIds.filter(Boolean) as string[]));
      if (uniqueFollowerIds.length > 0) {
        const foundStaff = await prisma.staff.findMany({
          where: {
            id: { in: uniqueFollowerIds },
            deletedAt: null,
          },
          select: { id: true },
        });
        validFollowerIds = foundStaff.map((s) => s.id);
      }
    }

    // Transaction sinh mã tự động theo BR-22, BR-23, BR-24, BR-25
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          projectName: true,
          shortName: true,
          requestSequence: true,
          deletedAt: true,
        },
      });

      if (!project || project.deletedAt) {
        throw new Error("NOT_FOUND");
      }

      // BR-20: Dự án phải có Tên viết tắt
      if (!project.shortName) {
        throw new Error("MISSING_SHORT_NAME");
      }

      // Tăng sequence
      const nextSequence = project.requestSequence + 1;
      const requestCode = `${project.shortName}${String(nextSequence).padStart(5, "0")}`;

      // Cập nhật sequence dự án
      await tx.project.update({
        where: { id: projectId },
        data: { requestSequence: nextSequence },
      });

      // Tạo yêu cầu
      const newRequest = await tx.projectRequest.create({
        data: {
          projectId,
          requestCode,
          requesterId: requesterId || null,
          requesterName: requesterName?.trim() || null,
          department: department?.trim() || null,
          receiverId: receiverId || null,
          content: content.trim(),
          dueDate: parsedDueDate,
          jiraUrl: jiraUrl?.trim() || null,
          status: status || "pending",
          createdById: session.userId,
          followers: {
            create: validFollowerIds.map((sId) => ({
              staffId: sId,
            })),
          },
        },
        include: {
          requester: true,
          receiver: true,
          followers: {
            include: { staff: true },
          },
        },
      });

      return { newRequest, project, requestCode };
    });

    // Ghi audit log (BR-34)
    await recordAuditLog({
      userId: session.userId,
      actionCode: "REQUEST_CREATED",
      targetEntity: "project_request",
      targetEntityId: result.newRequest.id,
      contextJson: {
        projectId,
        projectName: result.project.projectName,
        requestCode: result.requestCode,
        requester: result.newRequest.requester?.fullName || result.newRequest.requesterName,
      },
    });

    // Thông báo hệ thống & Telegram theo sự kiện chuẩn (13.4 & 13.6)
    createSystemNotification({
      eventCode: "REQUEST_CREATED",
      title: `📋 Yêu cầu mới: ${result.requestCode}`,
      content: `Dự án "${result.project.projectName}" vừa phát sinh yêu cầu ${result.requestCode}.\nNgười yêu cầu: ${result.newRequest.requester?.fullName || result.newRequest.requesterName || "N/A"}\nNội dung: ${result.newRequest.content.replace(/<[^>]*>?/gm, "").slice(0, 120)}...`,
      type: "request",
      severity: "info",
      objectType: "project_request",
      objectId: result.newRequest.id,
      targetUrl: `/projects/${projectId}`,
      createdById: session.userId,
      actorName: session.username,
    }).catch((e) => console.error("Notification error:", e));

    // Ghi nhận Activity Timeline cho QLYC (Mục 13 & Timeline)
    const actorName = (session as any).fullName || session.username;
    await logRequestActivity({
      requestId: result.newRequest.id,
      eventCode: "REQUEST_CREATED",
      actorId: session.userId,
      actorName,
      title: "Tạo yêu cầu",
      description: `${actorName} đã tạo yêu cầu ${result.requestCode}`,
      metadata: {
        requestCode: result.requestCode,
        requester: result.newRequest.requester?.fullName || result.newRequest.requesterName || "N/A",
        department: result.newRequest.department || null,
        dueDate: result.newRequest.dueDate ? result.newRequest.dueDate.toISOString().slice(0, 10) : null,
        jiraUrl: result.newRequest.jiraUrl || null,
        status: result.newRequest.status,
      },
    });

    // 13.6: Nếu có nhân sự theo dõi -> phát sinh sự kiện REQUEST_ASSIGNED
    if (result.newRequest.followers && result.newRequest.followers.length > 0) {
      const followerStaff = result.newRequest.followers.map((f: any) => f.staff?.fullName).filter(Boolean);
      const followerNames = followerStaff.join(", ");
      
      await logRequestActivity({
        requestId: result.newRequest.id,
        eventCode: "REQUEST_ASSIGNED",
        actorId: session.userId,
        actorName,
        title: "Phân công nhân sự theo dõi",
        description: `Đã phân công ${followerNames} theo dõi QLYC`,
        metadata: {
          assignedStaff: followerStaff,
        },
      });

      createSystemNotification({
        eventCode: "REQUEST_ASSIGNED",
        title: `📋 Phân công theo dõi QLYC: ${result.requestCode}`,
        content: `Nhân sự được phân công theo dõi QLYC ${result.requestCode} tại dự án "${result.project.projectName}": ${followerNames}.`,
        type: "request",
        severity: "important",
        objectType: "project_request",
        objectId: result.newRequest.id,
        targetUrl: `/projects/${projectId}`,
        createdById: session.userId,
        actorName: session.username,
      }).catch((e) => console.error("Notification error:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Đã thêm yêu cầu.", // MSG-68
      data: result.newRequest,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-04", message: "Dự án không tồn tại." } },
        { status: 404 }
      );
    }
    if (error.message === "MISSING_SHORT_NAME") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-20",
            message: "Dự án chưa được cấu hình Tên viết tắt (short_name). Vui lòng cập nhật thông tin dự án trước khi tạo yêu cầu.",
          },
        },
        { status: 400 }
      );
    }
    console.error("Create request error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-69", message: "Không thể sinh mã yêu cầu. Vui lòng thử lại." } },
      { status: 500 }
    );
  }
}
