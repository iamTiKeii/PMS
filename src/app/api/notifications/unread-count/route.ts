import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const now = new Date();
    const count = await prisma.notification.count({
      where: {
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        reads: {
          none: {
            userId: user.userId,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (err: any) {
    console.error("GET /api/notifications/unread-count error:", err);
    return NextResponse.json({ success: true, count: 0 });
  }
}
