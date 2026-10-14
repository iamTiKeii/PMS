import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseUrlInfo, isValidUrl, normalizeUrl } from "@/lib/url-parser";

export const dynamic = "force-dynamic";

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Clean up title from common platform brand suffixes
 */
function cleanDocTitle(title: string): string {
  let cleaned = decodeHtmlEntities(title);
  // Remove Google Docs/Sheets/Drive/Slides branding
  cleaned = cleaned.replace(
    /\s*[-–—|]\s*Google\s*(?:Docs|Sheets|Drive|Slides|Trang tính|Tài liệu|Bản trình bày).*$/i,
    ""
  );
  // Remove common generic suffix
  cleaned = cleaned.replace(/\s*[-–—|]\s*(?:Notion|Figma|Jira|Confluence).*$/i, "");
  return cleaned.trim();
}

/**
 * POST /api/doc-links/fetch-title
 * Hỗ trợ tự động trích xuất tiêu đề tài liệu từ URL (Google Docs, Sheets, Webpages)
 */
export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json().catch(() => ({}));
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: { code: "MSG-01", message: "Vui lòng cung cấp URL tài liệu." } },
        { status: 400 }
      );
    }

    const cleanUrl = normalizeUrl(rawUrl);

    if (!isValidUrl(cleanUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MSG-32",
            message: "Đường dẫn không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://.",
          },
        },
        { status: 400 }
      );
    }

    const parsedInfo = parseUrlInfo(cleanUrl);
    let extractedTitle = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(cleanUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        // Read only first 64KB of HTML to find title quickly without downloading large files
        const reader = res.body?.getReader();
        let htmlChunk = "";

        if (reader) {
          let totalBytes = 0;
          while (totalBytes < 65536) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            htmlChunk += new TextDecoder().decode(value);
            // If we found both head end or title, stop early
            if (htmlChunk.includes("</title>") || htmlChunk.includes("</head>")) {
              break;
            }
          }
          reader.cancel().catch(() => {});
        } else {
          htmlChunk = await res.text();
        }

        // Try extracting og:title first
        const ogTitleMatch = htmlChunk.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          extractedTitle = cleanDocTitle(ogTitleMatch[1]);
        }

        // Fallback to <title>
        if (!extractedTitle) {
          const titleTagMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            extractedTitle = cleanDocTitle(titleTagMatch[1]);
          }
        }
      }
    } catch (fetchErr) {
      // Network timeout or private doc - still return parsed metadata smoothly
      console.warn("Could not fetch remote title for URL:", cleanUrl, (fetchErr as any)?.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        title: extractedTitle,
        cleanUrl,
        category: parsedInfo.category,
        googleFileId: parsedInfo.googleFileId || null,
        isGoogle: parsedInfo.isGoogle,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: { code: "MSG-05", message: "Vui lòng đăng nhập lại." } },
        { status: 401 }
      );
    }
    console.error("Fetch doc title error:", error);
    return NextResponse.json(
      { success: false, error: { code: "MSG-500", message: "Lỗi trích xuất thông tin liên kết." } },
      { status: 500 }
    );
  }
}
