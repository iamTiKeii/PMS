import { NextResponse } from "next/server";
import { requireRole, recordAuditLog } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import prisma from "@/lib/prisma";

// GET /api/users - List users (Admin only)
export async function GET(request: Request) {
  try {
    const adminSession = await requireRole(["admin"]);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";

    const where: any = {
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { username: { contains: q } },
        { staff: { fullName: { contains: q } } },
        { staff: { corporateEmail: { contains: q } } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        failedAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        mustChangePassword: true,
        createdAt: true,
        staffId: true,
        staff: {
          select: {
            id: true,
            fullName: true,
            staffCode: true,
            corporateEmail: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("List users error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tải danh sách người dùng." } },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (Admin only)
export async function POST(request: Request) {
  try {
    const adminSession = await requireRole(["admin"]);
    const body = await request.json();
    const { username, password, role, status = "active", staffId } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và vai trò." } },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // Check unique username
    const existing = await prisma.user.findFirst({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-22", message: "Tên đăng nhập này đã tồn tại trong hệ thống." } },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        role: role as string,
        status: status as string,
        staffId: staffId || null,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        staffId: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      userId: adminSession.userId,
      actionCode: "USER_CREATED",
      targetEntity: "user",
      targetEntityId: newUser.id,
      contextJson: { username: cleanUsername, role, staffId },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: "Thêm người dùng mới thành công.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-06", message: "Bạn không có quyền thực hiện thao tác này." } },
        { status: 403 }
      );
    }
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi tạo người dùng mới." } },
      { status: 500 }
    );
  }
}
