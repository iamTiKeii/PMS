import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  checkAndDispatchDueReminders,
  checkAndDispatchAttendanceReminders,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/notifications/reminders/run - Trigger due & attendance checks
export async function POST(request: Request) {
  try {
    await requireAuth();
    let body = {};
    try {
      body = await request.json();
    } catch {}

    const { type, forceAttendance } = body as any;

    let dueResults = null;
    let attendanceResults = null;

    if (!type || type === "due" || type === "all") {
      dueResults = await checkAndDispatchDueReminders();
    }

    if (!type || type === "attendance" || type === "all" || forceAttendance) {
      attendanceResults = await checkAndDispatchAttendanceReminders(forceAttendance);
    }

    return NextResponse.json({
      success: true,
      message: "Đã kích hoạt quét nhắc việc và kiểm tra thông báo.",
      data: {
        dueReminders: dueResults,
        attendanceReminders: attendanceResults,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Run reminders error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi chạy trình kiểm tra nhắc việc." } },
      { status: 500 }
    );
  }
}
