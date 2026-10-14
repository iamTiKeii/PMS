export interface ParsedUrlInfo {
  category: "docs" | "sheets" | "drive" | "other";
  googleFileId?: string;
  isGoogle: boolean;
  cleanUrl: string;
}

/**
 * Normalize and auto-prefix protocol if missing
 */
export function normalizeUrl(url: string): string {
  let trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Parse and categorize URL
 */
export function parseUrlInfo(url: string): ParsedUrlInfo {
  const clean = normalizeUrl(url);

  // Google Docs regex: docs.google.com/document/d/{id}
  const docsMatch = clean.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docsMatch) {
    return {
      category: "docs",
      googleFileId: docsMatch[1],
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  // Google Sheets regex: docs.google.com/spreadsheets/d/{id}
  const sheetsMatch = clean.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetsMatch) {
    return {
      category: "sheets",
      googleFileId: sheetsMatch[1],
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  // Google Drive Folder: drive.google.com/drive/(u/\d+/)?folders/{id}
  const driveFolderMatch = clean.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i);
  if (driveFolderMatch) {
    return {
      category: "drive",
      googleFileId: driveFolderMatch[1],
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  // Google Drive File: drive.google.com/file/d/{id}
  const driveFileMatch = clean.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch) {
    return {
      category: "drive",
      googleFileId: driveFileMatch[1],
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  // Google Drive open / uc links: drive.google.com/(open|uc)?id={id}
  const driveOpenMatch = clean.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]+&)*id=([a-zA-Z0-9_-]+)/i);
  if (driveOpenMatch) {
    return {
      category: "drive",
      googleFileId: driveOpenMatch[1],
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  // General Google link
  if (clean.includes("google.com") || clean.includes("goo.gl")) {
    return {
      category: "other",
      isGoogle: true,
      cleanUrl: clean,
    };
  }

  return {
    category: "other",
    isGoogle: false,
    cleanUrl: clean,
  };
}

/**
 * Validate URL scheme
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

