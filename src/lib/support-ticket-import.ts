import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { generateNextTicketCode, getTicketDatePrefix, calculateTicketDurations, recordTicketHistory } from "@/lib/support-ticket";

export interface ImportTicketValidationError {
  rowNumber: number; // Dòng số mấy trên Excel (1-indexed, tính từ dòng 2 trở đi)
  column: string;    // Tên cột bị lỗi
  currentValue?: string; // Giá trị hiện tại người dùng nhập
  message: string;   // Nội dung chi tiết lỗi
  severity: "error" | "warning";
}

export interface ValidatedImportTicket {
  rowNumber: number;
  ticketCode?: string | null;
  projectId: string;
  projectName: string;
  requesterName: string;
  businessId: string;
  businessName: string;
  assignedUserId: string;
  assignedUserName: string;
  supportMethodIds: string[];
  supportMethodNames: string[];
  supportTypeId?: string | null;
  supportTypeName?: string | null;
  description: string;
  cause?: string | null;
  resolution?: string | null;
  sentAt: Date;
  receivedAt: Date;
  resolvedAt?: Date | null;
  status: "IN_PROGRESS" | "COMPLETED";
  // Các chỉ số tính toán
  waitingMinutes: number;
  processingMinutes: number | null;
  totalMinutes: number | null;
  timeGroupId: string | null;
  timeGroupName?: string | null;
}

export interface ImportValidationResult {
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  hasStructureError: boolean;
  structureErrorMessage?: string;
  errors: ImportTicketValidationError[];
  validTickets: ValidatedImportTicket[];
  rawRows: Record<string, any>[];
}

// Danh sách các cột chuẩn theo đặc tả
export const EXPECTED_COLUMNS = [
  "Mã ca",
  "Dự án",
  "Ngày ghi nhận",
  "Người dùng yêu cầu",
  "Nghiệp vụ",
  "Nhân sự phụ trách",
  "Phương thức hỗ trợ",
  "Mô tả vấn đề",
  "Nguyên nhân",
  "Cách xử lý",
  "Hỗ trợ khai báo",
  "Thời gian gửi",
  "Thời điểm nhận",
  "Thời điểm hoàn thành",
  "Thời gian chờ",
  "Thời gian xử lý",
  "Tổng thời gian",
  "Nhóm thời gian",
  "Trạng thái",
];

// Cột bắt buộc người dùng phải cung cấp
export const REQUIRED_COLUMNS = [
  "Dự án",
  "Ngày ghi nhận",
  "Người dùng yêu cầu",
  "Nghiệp vụ",
  "Phương thức hỗ trợ",
  "Mô tả vấn đề",
  "Thời gian gửi",
  "Thời điểm nhận",
];

/**
 * Chuẩn hóa chuỗi so sánh: bỏ khoảng trắng thừa, chữ thường, bỏ dấu nếu cần
 */
export function normalizeStr(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

/**
 * Phân tích và chuẩn hóa ngày giờ từ các định dạng Excel phổ biến
 * Hỗ trợ:
 * - Date object từ excel
 * - Số serial excel (SSF date code)
 * - Chuỗi "HH:mm dd/MM/yyyy", "dd/MM/yyyy HH:mm", "yyyy-MM-dd HH:mm:ss", "dd/MM/yyyy", "dd-MM-yyyy"
 */
export function parseExcelDateTime(val: any): Date | null {
  if (!val) return null;

  // Nếu là Date
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) return val;
    return null;
  }

  // Nếu là Excel serial number (ví dụ 45200.625)
  if (typeof val === "number") {
    try {
      const parsedSSF = XLSX.SSF.parse_date_code(val);
      if (parsedSSF) {
        const d = new Date(
          parsedSSF.y,
          parsedSSF.m - 1,
          parsedSSF.d,
          parsedSSF.H || 0,
          parsedSSF.M || 0,
          Math.floor(parsedSSF.S || 0)
        );
        if (!isNaN(d.getTime())) return d;
      }
    } catch {
      // fallback to epoch
    }
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. Thử dạng: "HH:mm dd/MM/yyyy" hoặc "HH:mm:ss dd/MM/yyyy" hoặc dấu '-'
  const timeDateMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (timeDateMatch) {
    const [, hour, min, sec, day, month, year] = timeDateMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec || 0));
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. Thử dạng: "dd/MM/yyyy HH:mm" hoặc "dd/MM/yyyy HH:mm:ss" hoặc dấu '-'
  const dateTimeMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (dateTimeMatch) {
    const [, day, month, year, hour, min, sec] = dateTimeMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec || 0));
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Thử dạng ngày chuẩn ISO: "yyyy-MM-dd HH:mm" hoặc "yyyy-MM-dd HH:mm:ss"
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (isoMatch) {
    const [, year, month, day, hour, min, sec] = isoMatch;
    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour || 0),
      Number(min || 0),
      Number(sec || 0)
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // 4. Thử dạng chỉ có ngày: "dd/MM/yyyy" hoặc "dd-MM-yyyy"
  const dateOnlyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dateOnlyMatch) {
    const [, day, month, year] = dateOnlyMatch;
    const d = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  // Cuối cùng thử Date.parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Định dạng ngày giờ chuẩn hiển thị: "HH:mm dd/MM/yyyy"
 */
export function formatDateTimeVN(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return `${map.hour}:${map.minute} ${map.day}/${map.month}/${map.year}`;
}

/**
 * Kiểm tra và đối chiếu dữ liệu import từ file Excel
 */
export async function validateSupportTicketsFromExcel(
  buffer: Buffer,
  currentUserId: string,
  allowedProjectIds?: string[] | null
): Promise<ImportValidationResult> {
  const result: ImportValidationResult = {
    totalRows: 0,
    validRowsCount: 0,
    errorRowsCount: 0,
    hasStructureError: false,
    errors: [],
    validTickets: [],
    rawRows: [],
  };

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch (err: any) {
    result.hasStructureError = true;
    result.structureErrorMessage = "File không đúng định dạng Excel (.xlsx) hoặc bị lỗi không thể đọc.";
    return result;
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    result.hasStructureError = true;
    result.structureErrorMessage = "File Excel không có bất kỳ sheet nào.";
    return result;
  }

  // Ưu tiên sheet tên "DuLieuCaHoTro" hoặc sheet đầu tiên
  const targetSheetName = workbook.SheetNames.includes("DuLieuCaHoTro")
    ? "DuLieuCaHoTro"
    : workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    result.hasStructureError = true;
    result.structureErrorMessage = "Không tìm thấy sheet dữ liệu trong file.";
    return result;
  }

  // Đọc dữ liệu dạng mảng JSON
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // Lấy mảng 2 chiều để kiểm tra header row
    defval: "",
    blankrows: false,
  });

  if (rows.length < 2) {
    result.hasStructureError = true;
    result.structureErrorMessage = "File Excel không có dữ liệu (cần ít nhất dòng tiêu đề và 1 dòng dữ liệu).";
    return result;
  }

  // Dòng 1: Headers
  const headerRow: string[] = (rows[0] || []).map((h: any) => String(h || "").trim());

  // Kiểm tra trùng tên cột trong dòng header
  const seenHeaderNames = new Set<string>();
  const duplicateHeaderList: string[] = [];
  headerRow.forEach((h) => {
    if (!h) return;
    const norm = normalizeStr(h);
    if (seenHeaderNames.has(norm)) {
      duplicateHeaderList.push(h);
    } else {
      seenHeaderNames.add(norm);
    }
  });

  if (duplicateHeaderList.length > 0) {
    result.hasStructureError = true;
    result.structureErrorMessage = `File Excel có các cột bị trùng tên: ${Array.from(new Set(duplicateHeaderList)).join(", ")}. Mỗi cột chỉ được xuất hiện một lần.`;
    return result;
  }

  // Kiểm tra các cột bắt buộc có trong header không
  const missingHeaders: string[] = [];
  const headerMap: Record<string, number> = {}; // Tên cột chuẩn -> index cột trong Excel

  for (const expCol of EXPECTED_COLUMNS) {
    const colIndex = headerRow.findIndex(
      (h) => normalizeStr(h) === normalizeStr(expCol) || h.toLowerCase().includes(expCol.toLowerCase())
    );
    if (colIndex !== -1) {
      headerMap[expCol] = colIndex;
    }
  }

  // Đối chiếu các cột bắt buộc
  for (const reqCol of REQUIRED_COLUMNS) {
    if (headerMap[reqCol] === undefined) {
      missingHeaders.push(reqCol);
    }
  }

  if (missingHeaders.length > 0) {
    result.hasStructureError = true;
    result.structureErrorMessage = `Cấu trúc file thiếu các cột bắt buộc: ${missingHeaders.join(", ")}. Vui lòng tải file mẫu để kiểm tra đúng tên cột.`;
    return result;
  }

  // Tải Master Data từ Database để đối chiếu
  const [projects, businesses, methods, types, timeGroups, users] = await Promise.all([
    prisma.project.findMany({
      where: allowedProjectIds ? { id: { in: allowedProjectIds } } : {},
      select: { id: true, projectCode: true, projectName: true, shortName: true },
    }),
    prisma.supportBusiness.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.supportMethod.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.supportType.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.supportTimeGroup.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, name: true, minSeconds: true, maxSeconds: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      select: {
        id: true,
        username: true,
        staff: { select: { id: true, fullName: true, staffCode: true } },
      },
    }),
  ]);

  // Lấy currentUser thông tin làm fallback
  const currentUser = users.find((u) => u.id === currentUserId);
  const fallbackAssignee = currentUser || users[0];

  // Thu thập các mã ca đã có trên hệ thống để kiểm tra trùng
  const existingTickets = await prisma.supportTicket.findMany({
    select: { ticketCode: true },
  });
  const existingCodesSet = new Set(existingTickets.map((t) => t.ticketCode.toUpperCase()));

  // Lấy các ca gần đây trong phạm vi dự án để cảnh báo nghi trùng dữ liệu đã có trên Hub (cùng dự án, người yêu cầu, thời gian gửi)
  const recentTickets = await prisma.supportTicket.findMany({
    where: {
      projectId: { in: projects.map((p) => p.id) },
    },
    select: { ticketCode: true, projectId: true, requesterName: true, sentAt: true },
    take: 2000,
  });
  const hubSignaturesMap = new Map<string, string>(); // signature -> ticketCode
  for (const rt of recentTickets) {
    if (rt.sentAt && rt.requesterName) {
      const sig = `${rt.projectId}|${normalizeStr(rt.requesterName)}|${new Date(rt.sentAt).getTime()}`;
      hubSignaturesMap.set(sig, rt.ticketCode);
    }
  }

  // Map theo dõi trùng lặp ngay trong file
  const fileCodesSet = new Set<string>();
  const fileSignaturesSet = new Set<string>(); // Chống trùng nội dung: projectId + requesterName + sentAt + description

  const dataRows = rows.slice(1);
  result.totalRows = dataRows.length;

  if (dataRows.length > 1000) {
    result.hasStructureError = true;
    result.structureErrorMessage = `Số dòng dữ liệu (${dataRows.length}) vượt quá giới hạn cho phép (tối đa 1.000 dòng/lần). Vui lòng tách nhỏ file.`;
    return result;
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // Dòng hiển thị trên Excel (dòng 1 là header)
    const rowErrors: ImportTicketValidationError[] = [];

    // Helper lấy giá trị cột
    const getVal = (colName: string): any => {
      const idx = headerMap[colName];
      if (idx === undefined || idx === -1) return "";
      return row[idx] !== undefined && row[idx] !== null ? row[idx] : "";
    };

    const rawRowObj: Record<string, any> = { _rowNumber: rowNumber };
    EXPECTED_COLUMNS.forEach((col) => {
      rawRowObj[col] = getVal(col);
    });
    result.rawRows.push(rawRowObj);

    // Bỏ qua dòng trống hoàn toàn
    const isAllBlank = Object.values(rawRowObj).every((v) => v === "" || v === null || v === undefined);
    if (isAllBlank) {
      continue;
    }

    const ticketCodeRaw = String(getVal("Mã ca") || "").trim();
    const projectRaw = String(getVal("Dự án") || "").trim();
    const requesterNameRaw = String(getVal("Người dùng yêu cầu") || "").trim();
    const businessRaw = String(getVal("Nghiệp vụ") || "").trim();
    const assigneeRaw = String(getVal("Nhân sự phụ trách") || "").trim();
    const methodsRaw = String(getVal("Phương thức hỗ trợ") || "").trim();
    const descRaw = String(getVal("Mô tả vấn đề") || "").trim();
    const causeRaw = String(getVal("Nguyên nhân") || "").trim();
    const resolutionRaw = String(getVal("Cách xử lý") || "").trim();
    const supportTypeRaw = String(getVal("Hỗ trợ khai báo") || "").trim();
    const sentAtRaw = getVal("Thời gian gửi");
    const receivedAtRaw = getVal("Thời điểm nhận");
    const resolvedAtRaw = getVal("Thời điểm hoàn thành");
    const statusRaw = String(getVal("Trạng thái") || "").trim();

    // 1. Kiểm tra Mã ca (nếu có)
    let validatedTicketCode: string | null = null;
    if (ticketCodeRaw) {
      const upperCode = ticketCodeRaw.toUpperCase();
      if (existingCodesSet.has(upperCode)) {
        rowErrors.push({
          rowNumber,
          column: "Mã ca",
          currentValue: ticketCodeRaw,
          message: `Mã ca "${ticketCodeRaw}" đã tồn tại trên hệ thống. Hệ thống không cho phép ghi đè trong chế độ tạo mới.`,
          severity: "error",
        });
      } else if (fileCodesSet.has(upperCode)) {
        rowErrors.push({
          rowNumber,
          column: "Mã ca",
          currentValue: ticketCodeRaw,
          message: `Mã ca "${ticketCodeRaw}" bị trùng lặp với một dòng khác ngay trong file Excel.`,
          severity: "error",
        });
      } else {
        fileCodesSet.add(upperCode);
        validatedTicketCode = upperCode;
      }
    }

    // 2. Kiểm tra Dự án
    if (!projectRaw) {
      rowErrors.push({
        rowNumber,
        column: "Dự án",
        currentValue: projectRaw,
        message: "Dự án là thông tin bắt buộc, không được để trống.",
        severity: "error",
      });
    }

    let matchedProject: (typeof projects)[0] | undefined;
    if (projectRaw) {
      const normP = normalizeStr(projectRaw);
      matchedProject = projects.find(
        (p) =>
          normalizeStr(p.projectName) === normP ||
          (p.projectCode && normalizeStr(p.projectCode) === normP) ||
          (p.shortName && normalizeStr(p.shortName) === normP) ||
          p.projectName.toLowerCase().includes(projectRaw.toLowerCase())
      );

      if (!matchedProject) {
        rowErrors.push({
          rowNumber,
          column: "Dự án",
          currentValue: projectRaw,
          message: `Dự án "${projectRaw}" không khớp với danh mục dự án trên hệ thống hoặc bạn không có quyền truy cập.`,
          severity: "error",
        });
      }
    }

    // 3. Ngày ghi nhận
    const recordedDateRaw = getVal("Ngày ghi nhận");
    if (!recordedDateRaw) {
      rowErrors.push({
        rowNumber,
        column: "Ngày ghi nhận",
        currentValue: "",
        message: "Ngày ghi nhận là thông tin bắt buộc.",
        severity: "error",
      });
    } else {
      const recDate = parseExcelDateTime(recordedDateRaw);
      if (!recDate) {
        rowErrors.push({
          rowNumber,
          column: "Ngày ghi nhận",
          currentValue: String(recordedDateRaw),
          message: `Định dạng ngày ghi nhận "${recordedDateRaw}" không hợp lệ. Chuẩn đề xuất: dd/MM/yyyy.`,
          severity: "error",
        });
      }
    }

    // 4. Người dùng yêu cầu
    if (!requesterNameRaw) {
      rowErrors.push({
        rowNumber,
        column: "Người dùng yêu cầu",
        currentValue: requesterNameRaw,
        message: "Người dùng yêu cầu hỗ trợ là bắt buộc.",
        severity: "error",
      });
    }

    // 4. Nghiệp vụ
    if (!businessRaw) {
      rowErrors.push({
        rowNumber,
        column: "Nghiệp vụ",
        currentValue: businessRaw,
        message: "Nghiệp vụ là thông tin bắt buộc.",
        severity: "error",
      });
    }

    let matchedBusiness: (typeof businesses)[0] | undefined;
    if (businessRaw) {
      const normB = normalizeStr(businessRaw);
      matchedBusiness = businesses.find(
        (b) =>
          normalizeStr(b.name) === normB ||
          normalizeStr(b.code) === normB ||
          b.name.toLowerCase().includes(businessRaw.toLowerCase())
      );

      if (!matchedBusiness) {
        rowErrors.push({
          rowNumber,
          column: "Nghiệp vụ",
          currentValue: businessRaw,
          message: `Nghiệp vụ "${businessRaw}" không tồn tại trong danh mục Master Data.`,
          severity: "error",
        });
      }
    }

    // 5. Nhân sự phụ trách (Tùy chọn: nếu trống thì gán người import)
    let matchedAssignee: (typeof users)[0] | undefined = fallbackAssignee;
    if (assigneeRaw) {
      const normA = normalizeStr(assigneeRaw);
      matchedAssignee = users.find((u) => {
        const staffName = u.staff?.fullName ? normalizeStr(u.staff.fullName) : "";
        const staffCode = u.staff?.staffCode ? normalizeStr(u.staff.staffCode) : "";
        const username = normalizeStr(u.username);
        return (
          staffName === normA ||
          staffCode === normA ||
          username === normA ||
          (u.staff?.fullName && u.staff.fullName.toLowerCase().includes(assigneeRaw.toLowerCase()))
        );
      });

      if (!matchedAssignee) {
        rowErrors.push({
          rowNumber,
          column: "Nhân sự phụ trách",
          currentValue: assigneeRaw,
          message: `Không tìm thấy nhân sự "${assigneeRaw}" trong hệ thống nhân viên đang hoạt động.`,
          severity: "error",
        });
      }
    }

    // 6. Phương thức hỗ trợ (Bắt buộc: cho phép nhiều phương thức cách nhau bởi ; hoặc ,)
    const matchedMethodIds: string[] = [];
    const matchedMethodNames: string[] = [];
    if (!methodsRaw) {
      rowErrors.push({
        rowNumber,
        column: "Phương thức hỗ trợ",
        currentValue: methodsRaw,
        message: "Phương thức hỗ trợ là bắt buộc (ví dụ: Zalo, Hotline, UltraViewer...).",
        severity: "error",
      });
    } else {
      const tokens = methodsRaw
        .split(/[;,+]/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const tok of tokens) {
        const normM = normalizeStr(tok);
        const m = methods.find(
          (item) =>
            normalizeStr(item.name) === normM ||
            normalizeStr(item.code) === normM ||
            item.name.toLowerCase().includes(tok.toLowerCase())
        );
        if (m) {
          if (!matchedMethodIds.includes(m.id)) {
            matchedMethodIds.push(m.id);
            matchedMethodNames.push(m.name);
          }
        } else {
          rowErrors.push({
            rowNumber,
            column: "Phương thức hỗ trợ",
            currentValue: tok,
            message: `Phương thức "${tok}" không tồn tại trong danh mục Phương thức hỗ trợ.`,
            severity: "error",
          });
        }
      }
    }

    // 7. Mô tả vấn đề
    if (!descRaw) {
      rowErrors.push({
        rowNumber,
        column: "Mô tả vấn đề",
        currentValue: descRaw,
        message: "Mô tả vấn đề hỗ trợ là bắt buộc.",
        severity: "error",
      });
    }

    // 8. Hỗ trợ khai báo (Phân loại hỗ trợ - SupportType - Không bắt buộc)
    let matchedType: (typeof types)[0] | undefined;
    if (supportTypeRaw) {
      const normT = normalizeStr(supportTypeRaw);
      // Nếu nhập dạng boolean hoặc "có" -> tìm type có tên 'Hỗ trợ khai báo'
      if (["co", "x", "1", "true", "yes", "ho tro khai bao"].includes(normT)) {
        matchedType = types.find((t) => normalizeStr(t.name).includes("khai bao"));
      }

      if (!matchedType) {
        matchedType = types.find(
          (t) =>
            normalizeStr(t.name) === normT ||
            normalizeStr(t.code) === normT ||
            t.name.toLowerCase().includes(supportTypeRaw.toLowerCase())
        );
      }

      if (!matchedType) {
        rowErrors.push({
          rowNumber,
          column: "Hỗ trợ khai báo",
          currentValue: supportTypeRaw,
          message: `Loại hỗ trợ khai báo "${supportTypeRaw}" không tồn tại trong danh mục loại hỗ trợ. Vui lòng tham khảo sheet Danh Mục Tham Chiếu.`,
          severity: "error",
        });
      }
    }

    // 9. Thời gian gửi & Thời điểm nhận & Thời điểm hoàn thành
    if (!sentAtRaw) {
      rowErrors.push({
        rowNumber,
        column: "Thời gian gửi",
        currentValue: String(sentAtRaw || ""),
        message: "Thời gian gửi yêu cầu là bắt buộc.",
        severity: "error",
      });
    }
    const sentDate = parseExcelDateTime(sentAtRaw);
    if (sentAtRaw && !sentDate) {
      rowErrors.push({
        rowNumber,
        column: "Thời gian gửi",
        currentValue: String(sentAtRaw),
        message: `Định dạng thời gian gửi "${sentAtRaw}" không hợp lệ. Chuẩn đề xuất: HH:mm dd/MM/yyyy.`,
        severity: "error",
      });
    }

    if (!receivedAtRaw) {
      rowErrors.push({
        rowNumber,
        column: "Thời điểm nhận",
        currentValue: String(receivedAtRaw || ""),
        message: "Thời điểm nhân sự tiếp nhận là bắt buộc.",
        severity: "error",
      });
    }
    const receivedDate = parseExcelDateTime(receivedAtRaw);
    if (receivedAtRaw && !receivedDate) {
      rowErrors.push({
        rowNumber,
        column: "Thời điểm nhận",
        currentValue: String(receivedAtRaw),
        message: `Định dạng thời điểm nhận "${receivedAtRaw}" không hợp lệ. Chuẩn đề xuất: HH:mm dd/MM/yyyy.`,
        severity: "error",
      });
    }

    let resolvedDate: Date | null = null;
    if (resolvedAtRaw) {
      resolvedDate = parseExcelDateTime(resolvedAtRaw);
      if (!resolvedDate) {
        rowErrors.push({
          rowNumber,
          column: "Thời điểm hoàn thành",
          currentValue: String(resolvedAtRaw),
          message: `Định dạng thời điểm hoàn thành "${resolvedAtRaw}" không hợp lệ. Chuẩn đề xuất: HH:mm dd/MM/yyyy.`,
          severity: "error",
        });
      }
    }

    // Kiểm tra thứ tự mốc thời gian: Gửi <= Nhận <= Hoàn thành
    if (sentDate && receivedDate) {
      if (receivedDate.getTime() < sentDate.getTime()) {
        rowErrors.push({
          rowNumber,
          column: "Thời điểm nhận",
          currentValue: `${formatDateTimeVN(receivedDate)} < ${formatDateTimeVN(sentDate)}`,
          message: "Thời điểm nhận ca không được nhỏ hơn thời gian người dùng gửi yêu cầu.",
          severity: "error",
        });
      }
    }

    if (receivedDate && resolvedDate) {
      if (resolvedDate.getTime() < receivedDate.getTime()) {
        rowErrors.push({
          rowNumber,
          column: "Thời điểm hoàn thành",
          currentValue: `${formatDateTimeVN(resolvedDate)} < ${formatDateTimeVN(receivedDate)}`,
          message: "Thời điểm hoàn thành không được nhỏ hơn thời điểm tiếp nhận ca.",
          severity: "error",
        });
      }
    }

    // 10. Trạng thái và tính nhất quán
    let finalStatus: "IN_PROGRESS" | "COMPLETED" = resolvedDate ? "COMPLETED" : "IN_PROGRESS";
    if (statusRaw) {
      const normStatus = normalizeStr(statusRaw);
      const isCompletedText = normStatus.includes("hoan thanh") && !normStatus.includes("chua");
      const isInProgressText = normStatus.includes("chua") || normStatus.includes("dang");

      if (isCompletedText && !resolvedDate) {
        rowErrors.push({
          rowNumber,
          column: "Trạng thái",
          currentValue: statusRaw,
          message: "Trạng thái ghi 'Hoàn thành' nhưng không có mốc 'Thời điểm hoàn thành'.",
          severity: "error",
        });
      } else if (isInProgressText && resolvedDate) {
        rowErrors.push({
          rowNumber,
          column: "Trạng thái",
          currentValue: statusRaw,
          message: "Trạng thái ghi 'Chưa hoàn thành' nhưng lại có điền 'Thời điểm hoàn thành'.",
          severity: "error",
        });
      }
    }

    // 11. Kiểm tra trùng lặp signature trong file (Dự án + Người yêu cầu + Thời gian gửi + Mô tả)
    if (matchedProject && sentDate && requesterNameRaw && descRaw) {
      const signature = `${matchedProject.id}|${normalizeStr(requesterNameRaw)}|${sentDate.getTime()}|${normalizeStr(descRaw.slice(0, 50))}`;
      if (fileSignaturesSet.has(signature)) {
        rowErrors.push({
          rowNumber,
          column: "Mô tả vấn đề",
          currentValue: descRaw.slice(0, 30) + "...",
          message: "Ca này có dấu hiệu trùng hoàn toàn với một ca khác trong cùng file Excel.",
          severity: "error",
        });
      } else {
        fileSignaturesSet.add(signature);
      }
    }

    // 12. Kiểm tra nghi ngờ trùng với dữ liệu đã có trên Hub
    if (matchedProject && sentDate && requesterNameRaw) {
      const hubSig = `${matchedProject.id}|${normalizeStr(requesterNameRaw)}|${sentDate.getTime()}`;
      const existingHubTicketCode = hubSignaturesMap.get(hubSig);
      if (existingHubTicketCode && (!validatedTicketCode || existingHubTicketCode !== validatedTicketCode)) {
        rowErrors.push({
          rowNumber,
          column: "Mã ca",
          currentValue: ticketCodeRaw || "(Tạo mới)",
          message: `Nghi ngờ trùng với ca ${existingHubTicketCode} đã có trên hệ thống (cùng CSYT, người yêu cầu và thời gian gửi).`,
          severity: "error",
        });
      }
    }

    // Tổng kết dòng này
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
    } else if (matchedProject && matchedBusiness && matchedAssignee && sentDate && receivedDate) {
      // Dòng hợp lệ: Tính toán các chỉ số thời gian
      const waitingMs = receivedDate.getTime() - sentDate.getTime();
      const waitingMinutes = Math.max(0, Math.round(waitingMs / 60000));

      let processingMinutes: number | null = null;
      let totalMinutes: number | null = null;
      let timeGroupId: string | null = null;
      let timeGroupName: string | null = null;

      if (resolvedDate) {
        const procSec = Math.max(0, Math.round((resolvedDate.getTime() - receivedDate.getTime()) / 1000));
        processingMinutes = Math.round(procSec / 60);

        const totSec = Math.max(0, Math.round((resolvedDate.getTime() - sentDate.getTime()) / 1000));
        totalMinutes = Math.round(totSec / 60);

        // Khớp nhóm thời gian theo Master Data
        for (const tg of timeGroups) {
          const minOk = procSec >= tg.minSeconds;
          const maxOk = tg.maxSeconds === null || tg.maxSeconds === undefined || procSec < tg.maxSeconds;
          if (minOk && maxOk) {
            timeGroupId = tg.id;
            timeGroupName = tg.name;
            break;
          }
        }
        if (!timeGroupId && timeGroups.length > 0) {
          timeGroupId = timeGroups[timeGroups.length - 1].id;
          timeGroupName = timeGroups[timeGroups.length - 1].name;
        }
      }

      result.validTickets.push({
        rowNumber,
        ticketCode: validatedTicketCode,
        projectId: matchedProject.id,
        projectName: matchedProject.projectName,
        requesterName: requesterNameRaw,
        businessId: matchedBusiness.id,
        businessName: matchedBusiness.name,
        assignedUserId: matchedAssignee.id,
        assignedUserName: matchedAssignee.staff?.fullName || matchedAssignee.username,
        supportMethodIds: matchedMethodIds,
        supportMethodNames: matchedMethodNames,
        supportTypeId: matchedType?.id || null,
        supportTypeName: matchedType?.name || null,
        description: descRaw,
        cause: causeRaw || null,
        resolution: resolutionRaw || null,
        sentAt: sentDate,
        receivedAt: receivedDate,
        resolvedAt: resolvedDate,
        status: finalStatus,
        waitingMinutes,
        processingMinutes,
        totalMinutes,
        timeGroupId,
        timeGroupName,
      });
    }
  }

  // Đếm số dòng có ít nhất 1 lỗi
  const errorRowNumbers = new Set(result.errors.map((e) => e.rowNumber));
  result.errorRowsCount = errorRowNumbers.size;
  result.validRowsCount = result.validTickets.length;

  return result;
}

/**
 * Sinh file Excel mẫu (.xlsx) 2 sheet chuẩn nghiệp vụ
 */
export async function generateSupportTicketImportTemplate(): Promise<Buffer> {
  const [projects, businesses, methods, types, users] = await Promise.all([
    prisma.project.findMany({
      where: { status: "active" },
      orderBy: { projectName: "asc" },
      select: { projectCode: true, projectName: true },
      take: 100,
    }),
    prisma.supportBusiness.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true },
    }),
    prisma.supportMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true },
    }),
    prisma.supportType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      select: {
        username: true,
        staff: { select: { fullName: true, staffCode: true } },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: Dữ liệu ca hỗ trợ (DuLieuCaHoTro)
  // ─────────────────────────────────────────────────────────────
  const headers = [
    "Mã ca",
    "Dự án",
    "Ngày ghi nhận",
    "Người dùng yêu cầu",
    "Nghiệp vụ",
    "Nhân sự phụ trách",
    "Phương thức hỗ trợ",
    "Mô tả vấn đề",
    "Nguyên nhân",
    "Cách xử lý",
    "Hỗ trợ khai báo",
    "Thời gian gửi",
    "Thời điểm nhận",
    "Thời điểm hoàn thành",
    "Thời gian chờ",
    "Thời gian xử lý",
    "Tổng thời gian",
    "Nhóm thời gian",
    "Trạng thái",
  ];

  // Các dòng dữ liệu mẫu sinh động, đúng thực tế y tế
  const sampleProject1 = projects[0]?.projectName || "Bệnh viện đa khoa Trung ương";
  const sampleProject2 = projects[1]?.projectName || "Bệnh viện Sản Nhi";
  const sampleBusiness1 = businesses[0]?.name || "Khám chữa bệnh (Ngoại trú, Nội trú)";
  const sampleBusiness2 = businesses[1]?.name || "Viện phí & Tài chính kế toán";
  const sampleUser1 = users[0]?.staff?.fullName || users[0]?.username || "Nguyễn Trung Kiên";
  const sampleType1 = types[2]?.name || types[0]?.name || "Khai báo & Cấu hình tham số";
  const sampleType2 = types[1]?.name || types[0]?.name || "Lỗi phần mềm / Báo lỗi phát sinh";
  const sampleType3 = types[0]?.name || "Hướng dẫn sử dụng";

  const sampleRows = [
    [
      "", // Mã ca để trống
      sampleProject1,
      "15/10/2026",
      "BS. Nguyễn Văn A (Khoa Cấp cứu)",
      sampleBusiness1,
      sampleUser1,
      "Zalo; UltraViewer",
      "Bác sĩ không kê được đơn thuốc ngoại trú, phần mềm báo lỗi xung đột liều dùng",
      "Dữ liệu danh mục thuốc chưa cập nhật giới hạn liều tối đa cho trẻ em",
      "Đã hướng dẫn và hỗ trợ cập nhật lại cấu hình liều dùng danh mục dược",
      sampleType1,
      "08:15 15/10/2026",
      "08:20 15/10/2026",
      "08:32 15/10/2026",
      "(Tự tính: 5 phút)",
      "(Tự tính: 12 phút)",
      "(Tự tính: 17 phút)",
      "(Tự tính: < 15 phút)",
      "Hoàn thành",
    ],
    [
      "", // Mã ca để trống
      sampleProject2,
      "15/10/2026",
      "Thu ngân Trần Thị B",
      sampleBusiness2,
      sampleUser1,
      "Hotline",
      "Không in được biên lai thu tạm ứng viện phí bệnh nhân",
      "Lỗi kết nối máy in nhiệt và kẹt hàng đợi in",
      "Khởi động lại dịch vụ spooler và in thử thành công",
      sampleType2,
      "09:00 15/10/2026",
      "09:05 15/10/2026",
      "09:40 15/10/2026",
      "(Tự tính: 5 phút)",
      "(Tự tính: 35 phút)",
      "(Tự tính: 40 phút)",
      "(Tự tính: ≥ 30 phút)",
      "Hoàn thành",
    ],
    [
      "", // Mã ca để trống
      sampleProject1,
      "15/10/2026",
      "Điều dưỡng Lê Văn C (Khoa Ngoại)",
      sampleBusiness1,
      "", // Nhân sự để trống -> Tự động lấy người import
      "Zalo",
      "Yêu cầu mở quyền xem bệnh án nội trú khoa khác cho trưởng khoa",
      "",
      "",
      sampleType3,
      "10:00 15/10/2026",
      "10:10 15/10/2026",
      "", // Chưa hoàn thành
      "(Tự tính: 10 phút)",
      "",
      "",
      "",
      "Đang xử lý",
    ],
  ];

  const wsData = [headers, ...sampleRows];
  const ws1 = XLSX.utils.aoa_to_sheet(wsData);

  // Đặt độ rộng cột cho dễ nhìn
  ws1["!cols"] = [
    { wch: 12 }, // Mã ca
    { wch: 32 }, // Dự án
    { wch: 14 }, // Ngày
    { wch: 26 }, // Người dùng
    { wch: 28 }, // Nghiệp vụ
    { wch: 22 }, // Nhân sự
    { wch: 22 }, // Phương thức
    { wch: 40 }, // Mô tả
    { wch: 30 }, // Nguyên nhân
    { wch: 30 }, // Cách xử lý
    { wch: 25 }, // Hỗ trợ khai báo
    { wch: 18 }, // Gửi
    { wch: 18 }, // Nhận
    { wch: 18 }, // Hoàn thành
    { wch: 16 }, // Thời gian chờ
    { wch: 16 }, // Thời gian xử lý
    { wch: 16 }, // Tổng thời gian
    { wch: 18 }, // Nhóm thời gian
    { wch: 14 }, // Trạng thái
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "DuLieuCaHoTro");

  // ─────────────────────────────────────────────────────────────
  // SHEET 2: Danh mục tham chiếu (DanhMucThamChieu)
  // ─────────────────────────────────────────────────────────────
  const refRows: any[][] = [
    ["HƯỚNG DẪN VÀ DANH MỤC THAM CHIẾU NHẬP LIỆU PMS HUB"],
    ["1. Các cột có dấu bắt buộc: Dự án, Người dùng yêu cầu, Nghiệp vụ, Phương thức, Mô tả, Thời gian gửi, Thời điểm nhận."],
    ["2. Định dạng ngày giờ: HH:mm dd/MM/yyyy (ví dụ: 08:30 15/10/2026)."],
    ["3. Phương thức hỗ trợ có thể nhập nhiều giá trị cách nhau bằng dấu chấm phẩy (;)."],
    ["4. Các cột tính toán (Thời gian chờ, xử lý, nhóm thời gian) hệ thống sẽ tự tính tự động."],
    [],
    ["DANH MỤC DỰ ÁN (CSYT)", "", "DANH MỤC NGHIỆP VỤ", "", "PHƯƠNG THỨC HỖ TRỢ", "", "HỖ TRỢ KHAI BÁO", "", "NHÂN SỰ PHỤ TRÁCH"],
    ["Mã dự án", "Tên dự án", "Mã", "Tên nghiệp vụ", "Mã", "Tên phương thức", "Mã", "Tên loại", "Mã NV / Username", "Họ tên"],
  ];

  const maxRows = Math.max(
    projects.length,
    businesses.length,
    methods.length,
    types.length,
    users.length
  );

  for (let idx = 0; idx < maxRows; idx++) {
    const p = projects[idx];
    const b = businesses[idx];
    const m = methods[idx];
    const t = types[idx];
    const u = users[idx];

    refRows.push([
      p ? p.projectCode || "" : "",
      p ? p.projectName : "",
      b ? b.code : "",
      b ? b.name : "",
      m ? m.code : "",
      m ? m.name : "",
      t ? t.code : "",
      t ? t.name : "",
      u ? u.staff?.staffCode || u.username : "",
      u ? u.staff?.fullName || u.username : "",
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(refRows);
  ws2["!cols"] = [
    { wch: 12 }, { wch: 32 },
    { wch: 12 }, { wch: 28 },
    { wch: 14 }, { wch: 22 },
    { wch: 12 }, { wch: 25 },
    { wch: 18 }, { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "DanhMucThamChieu");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Xuất file Excel các dòng lỗi để người dùng sửa lại
 */
export function generateSupportTicketErrorExport(
  rawRows: Record<string, any>[],
  errors: ImportTicketValidationError[]
): Buffer {
  const wb = XLSX.utils.book_new();

  // Nhóm lỗi theo số dòng Excel
  const errorsByRow: Record<number, string[]> = {};
  for (const err of errors) {
    if (!errorsByRow[err.rowNumber]) {
      errorsByRow[err.rowNumber] = [];
    }
    errorsByRow[err.rowNumber].push(`[${err.column}]: ${err.message}`);
  }

  const headers = [
    "Dòng Excel",
    ...EXPECTED_COLUMNS,
    "CHI TIẾT LỖI CẦN SỬA",
  ];

  const exportData: any[][] = [headers];

  for (const row of rawRows) {
    const rowNum = row._rowNumber;
    const rowErrors = errorsByRow[rowNum];
    if (rowErrors && rowErrors.length > 0) {
      const rowCols = EXPECTED_COLUMNS.map((c) => row[c] ?? "");
      exportData.push([
        rowNum,
        ...rowCols,
        rowErrors.join(" | "),
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 10 },
    ...EXPECTED_COLUMNS.map(() => ({ wch: 20 })),
    { wch: 60 }, // Cột chi tiết lỗi
  ];

  XLSX.utils.book_append_sheet(wb, ws, "DanhSachDongLoi");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Thực thi lưu danh sách ca hỗ trợ đã được kiểm tra hợp lệ vào Database
 */
export async function executeSupportTicketImport(
  tickets: ValidatedImportTicket[],
  currentUserId: string,
  actorName?: string | null
): Promise<{ successCount: number; createdTicketCodes: string[]; batchCode: string }> {
  const createdTicketCodes: string[] = [];
  const batchCode = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Map lưu trữ sequence tiếp theo cho từng ngày (HTyymmdd -> nextSequence)
  const prefixSeqMap = new Map<string, number>();

  // Thực hiện import tuần tự hoặc theo chunk để đảm bảo code không trùng và transaction an toàn
  const chunkSize = 20;
  for (let i = 0; i < tickets.length; i += chunkSize) {
    const chunk = tickets.slice(i, i + chunkSize);

    await prisma.$transaction(async (tx) => {
      for (const t of chunk) {
        let code = t.ticketCode;
        if (!code) {
          const prefix = getTicketDatePrefix(t.sentAt || new Date());
          let nextSequence = prefixSeqMap.get(prefix);

          if (nextSequence === undefined) {
            // Tìm ca gần nhất trong ngày có prefix tương ứng
            const latestTicketInDay = await tx.supportTicket.findFirst({
              where: {
                ticketCode: {
                  startsWith: prefix,
                },
              },
              orderBy: { ticketCode: "desc" },
              select: { ticketCode: true },
            });

            if (latestTicketInDay && latestTicketInDay.ticketCode) {
              const suffix = latestTicketInDay.ticketCode.slice(prefix.length);
              const num = parseInt(suffix, 10);
              nextSequence = !isNaN(num) ? num + 1 : 1;
            } else {
              nextSequence = 1;
            }
          }

          code = `${prefix}${String(nextSequence).padStart(4, "0")}`;
          prefixSeqMap.set(prefix, nextSequence + 1);
        }

        // Tính toán các thông số giây
        let processingSeconds: number | null = null;
        let totalSeconds: number | null = null;

        if (t.resolvedAt) {
          processingSeconds = Math.max(0, Math.round((t.resolvedAt.getTime() - t.receivedAt.getTime()) / 1000));
          totalSeconds = Math.max(0, Math.round((t.resolvedAt.getTime() - t.sentAt.getTime()) / 1000));
        }

        const created = await tx.supportTicket.create({
          data: {
            ticketCode: code,
            projectId: t.projectId,
            requesterName: t.requesterName,
            createdById: currentUserId,
            assignedUserId: t.assignedUserId,
            businessId: t.businessId,
            supportTypeId: t.supportTypeId || null,
            timeGroupId: t.timeGroupId || null,
            description: t.description,
            cause: t.cause || null,
            resolution: t.resolution || null,
            sentAt: t.sentAt,
            receivedAt: t.receivedAt,
            resolvedAt: t.resolvedAt || null,
            processingSeconds,
            totalSeconds,
            status: t.status,
            methods: {
              create: t.supportMethodIds.map((mId) => ({
                methodId: mId,
              })),
            },
          },
        });

        // Ghi nhật ký lịch sử
        await tx.supportTicketHistory.create({
          data: {
            ticketId: created.id,
            actorUserId: currentUserId,
            actorName: actorName || "Người dùng Import",
            action: "created",
            beforeData: null,
            afterData: JSON.stringify({
              ticketCode: created.ticketCode,
              source: "excel_import",
              batchCode,
              sentAt: created.sentAt,
              receivedAt: created.receivedAt,
              resolvedAt: created.resolvedAt,
              status: created.status,
            }),
            reason: `Nhập dữ liệu hàng loạt từ file Excel (Lô: ${batchCode})`,
          },
        });

        createdTicketCodes.push(code);
      }
    });
  }

  return {
    successCount: createdTicketCodes.length,
    createdTicketCodes,
    batchCode,
  };
}
