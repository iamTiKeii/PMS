import { NextResponse } from "next/server";
import { handleCorsOptions, apiSuccess } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/v1/time - Trả về thời gian hiện tại của máy chủ (UTC+7 Asia/Ho_Chi_Minh)
 * Dùng cho Extension đồng bộ độ lệch thời gian (BR-49, UC-50)
 */
export async function GET() {
  const now = new Date();
  // Format ISO with timezone offset
  const tzOffset = 7 * 60; // UTC+7 in minutes
  const localTime = new Date(now.getTime() + tzOffset * 60 * 1000);
  
  const yyyy = localTime.getUTCFullYear();
  const mm = String(localTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(localTime.getUTCDate()).padStart(2, "0");
  const hh = String(localTime.getUTCHours()).padStart(2, "0");
  const min = String(localTime.getUTCMinutes()).padStart(2, "0");
  const ss = String(localTime.getUTCSeconds()).padStart(2, "0");
  const isoFormatted = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+07:00`;

  return apiSuccess({
    now: isoFormatted,
    tz: "Asia/Ho_Chi_Minh",
    timestamp: now.getTime(),
  });
}
