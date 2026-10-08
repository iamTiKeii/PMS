import { NextResponse } from "next/server";
import { requireAuth, recordAuditLog } from "@/lib/auth";
import { logGroupOrderActivity } from "@/lib/group-orders";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Sinh mã đơn tự động dạng ORD<YYMMDD><3 số>
async function generateOrderCode(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `ORD${yy}${mm}${dd}`;

  // Tìm đơn có prefix ngày hôm nay lớn nhất
  const latest = await prisma.groupOrder.findFirst({
    where: {
      orderCode: { startsWith: prefix },
    },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });

  let seq = 1;
  if (latest && latest.orderCode.length >= prefix.length + 3) {
    const lastSeq = parseInt(latest.orderCode.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// GET /api/group-orders - Danh sách đơn đặt nhóm
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "all";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { orderCode: { contains: q } },
        { createdByUser: { username: { contains: q } } },
        { createdByUser: { staff: { fullName: { contains: q } } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const orders = await prisma.groupOrder.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            staff: { select: { fullName: true } },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                staff: { select: { fullName: true } },
              },
            },
          },
        },
        items: {
          select: { id: true, userId: true, quantity: true, unitPrice: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = orders.map((ord: any) => {
      const isLeader = ord.createdById === session.userId;
      const isMember = ord.members.some((m: any) => m.userId === session.userId);

      // Thống kê đơn
      const totalItemsCount = ord.items.reduce((sum: number, it: any) => sum + it.quantity, 0);
      const paidMembersCount = ord.members.filter((m: any) => m.paymentStatus === "paid").length;

      return {
        ...ord,
        createdByUser: {
          id: ord.createdByUser.id,
          username: ord.createdByUser.username,
          fullName: ord.createdByUser.staff?.fullName || ord.createdByUser.username,
        },
        members: ord.members.map((m: any) => ({
          ...m,
          user: {
            id: m.user.id,
            username: m.user.username,
            fullName: m.user.staff?.fullName || m.user.username,
          },
        })),
        isLeader,
        isMember,
        membersCount: ord.members.length,
        paidMembersCount,
        totalItemsCount,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("List group orders error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}

// POST /api/group-orders - Tạo đơn đặt nhóm mới (BR-GO-01, BR-GO-02)
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { title, description, orderDeadline } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-GO-04", message: "Tên đơn không được để trống." } },
        { status: 400 }
      );
    }

    let parsedDeadline: Date | null = null;
    if (orderDeadline) {
      parsedDeadline = new Date(orderDeadline);
      if (isNaN(parsedDeadline.getTime())) {
        return NextResponse.json(
          { success: false, error: { code: "MSG-GO-05", message: "Hạn order không hợp lệ." } },
          { status: 400 }
        );
      }
    }

    const orderCode = await generateOrderCode();
    const actorName = (session as any).fullName || session.username;

    // Transaction tạo đơn và gán trưởng nhóm vào danh sách thành viên
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.groupOrder.create({
        data: {
          orderCode,
          title: title.trim(),
          description: description ? description.trim() : null,
          createdById: session.userId,
          status: "open",
          orderDeadline: parsedDeadline,
          members: {
            create: [
              {
                userId: session.userId,
                paymentStatus: "pending",
              },
            ],
          },
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              username: true,
              staff: { select: { fullName: true } },
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  staff: { select: { fullName: true } },
                },
              },
            },
          },
        },
      });

      return order;
    });

    // Ghi nhận Activity Timeline
    await logGroupOrderActivity({
      groupOrderId: newOrder.id,
      eventCode: "GROUP_ORDER_CREATED",
      actorId: session.userId,
      actorName,
      title: "Tạo đơn đặt nhóm",
      description: `${actorName} đã tạo đơn "${newOrder.title}" (${newOrder.orderCode})`,
      metadata: {
        orderCode: newOrder.orderCode,
        title: newOrder.title,
        orderDeadline: newOrder.orderDeadline,
      },
    });

    // Ghi audit log
    await recordAuditLog({
      userId: session.userId,
      actionCode: "GROUP_ORDER_CREATED",
      targetEntity: "group_order",
      targetEntityId: newOrder.id,
      contextJson: { orderCode: newOrder.orderCode, title: newOrder.title },
    });

    return NextResponse.json({
      success: true,
      message: "Đã tạo đơn đặt nhóm thành công.",
      data: newOrder,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Create group order error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo đơn đặt nhóm." } },
      { status: 500 }
    );
  }
}
