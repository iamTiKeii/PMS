export interface ParsedUrlInfo {
  category: "docs" | "sheets" | "drive" | "other";
  googleFileId?: string;
  isGoogle: boolean;
  cleanUrl: string;
}

/**
 * Parse and categorize URL
 */
export function parseUrlInfo(url: string): ParsedUrlInfo {
  const trimmed = url.trim();

  // Google Docs regex: docs.google.com/document/d/{id}
  const docsMatch = trimmed.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return {
      category: "docs",
      googleFileId: docsMatch[1],
      isGoogle: true,
      cleanUrl: trimmed,
    };
  }

  // Google Sheets regex: docs.google.com/spreadsheets/d/{id}
  const sheetsMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    return {
      category: "sheets",
      googleFileId: sheetsMatch[1],
      isGoogle: true,
      cleanUrl: trimmed,
    };
  }

  // Google Drive Folder: drive.google.com/drive/folders/{id}
  const driveMatch = trimmed.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return {
      category: "drive",
      googleFileId: driveMatch[1],
      isGoogle: true,
      cleanUrl: trimmed,
    };
  }

  // General Google link
  if (trimmed.includes("google.com") || trimmed.includes("goo.gl")) {
    return {
      category: "other",
      isGoogle: true,
      cleanUrl: trimmed,
    };
  }

  return {
    category: "other",
    isGoogle: false,
    cleanUrl: trimmed,
  };
}

/**
 * Validate URL scheme
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
