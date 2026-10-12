import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Requested-With",
};

export function handleCorsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function apiSuccess(data: any, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: corsHeaders,
    }
  );
}

export function apiError(message: string, status = 400, code?: string, details?: any) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || `ERR_${status}`,
        message,
        details,
      },
    },
    {
      status,
      headers: corsHeaders,
    }
  );
}
