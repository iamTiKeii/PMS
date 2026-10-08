import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function getMasterKey(): Buffer {
  const secret = process.env.APP_MASTER_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(text: string) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu (Seeding database)...");

  // Clean old data if any
  await prisma.auditLog.deleteMany();
  await prisma.staffAccount.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.docLink.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.staff.deleteMany();

  // 1. Tạo danh mục Nhân sự (Staff)
  const staff1 = await prisma.staff.create({
    data: {
      fullName: "Lê Văn An",
      staffCode: "EMP001",
      corporateEmail: "an.le@company.com",
      phoneNumber: "0901234567",
      department: "Khối Kỹ thuật & Công nghệ",
      status: "working",
      joinDate: new Date("2024-01-15"),
    },
  });

  const staff2 = await prisma.staff.create({
    data: {
      fullName: "Trần Thị Bình",
      staffCode: "EMP002",
      corporateEmail: "binh.tran@company.com",
      phoneNumber: "0912345678",
      department: "Ban Quản lý Dự án (PMO)",
      status: "working",
      joinDate: new Date("2023-08-01"),
    },
  });

  const staff3 = await prisma.staff.create({
    data: {
      fullName: "Hoàng Đức Chi",
      staffCode: "EMP003",
      corporateEmail: "chi.hoang@company.com",
      phoneNumber: "0987654321",
      department: "Ban Giám đốc Vận hành",
      status: "working",
      joinDate: new Date("2022-03-10"),
    },
  });

  const staff4 = await prisma.staff.create({
    data: {
      fullName: "Phạm Minh Dũng",
      staffCode: "EMP004",
      corporateEmail: "dung.pham@company.com",
      phoneNumber: "0934567890",
      department: "Khối Kỹ thuật & Công nghệ",
      status: "working",
      joinDate: new Date("2024-06-01"),
    },
  });

  console.log("✅ Đã tạo 4 hồ sơ nhân sự.");

  // 2. Tạo Người dùng Tool (Users)
  const passwordHashAdmin = await bcrypt.hash("Admin@123", 10);
  const passwordHashUser = await bcrypt.hash("User@123", 10);

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: passwordHashAdmin,
      role: "admin",
      status: "active",
      staffId: staff3.id, // Liên kết với Giám đốc Hoàng Đức Chi
    },
  });

  const userAn = await prisma.user.create({
    data: {
      username: "user_an",
      passwordHash: passwordHashUser,
      role: "user",
      status: "active",
      staffId: staff1.id, // Liên kết với Lê Văn An
    },
  });

  const userDung = await prisma.user.create({
    data: {
      username: "user_dung",
      passwordHash: passwordHashUser,
      role: "user",
      status: "active",
      staffId: staff4.id, // Liên kết với Phạm Minh Dũng
    },
  });

  console.log("✅ Đã tạo 3 tài khoản đăng nhập tool: admin, user_an, user_dung.");

  // 3. Tạo Danh mục Dự án (Projects)
  const project1 = await prisma.project.create({
    data: {
      projectName: "Bệnh viện Đa khoa Quốc tế (HIS)",
      projectCode: "PRJ-MED-01",
      systemHisUrl: "https://his.hospital-demo.vn/portal/dashboard",
      status: "active",
      description: "Hệ thống quản lý thông tin bệnh viện tổng thể, hồ sơ bệnh án điện tử EMR và cổng chỉ số PACS.",
      assignments: {
        create: [
          { staffId: staff1.id, tierLevel: 1, isPrimary: true }, // Level 1: Lê Văn An
          { staffId: staff2.id, tierLevel: 2, isPrimary: true }, // Level 2: Trần Thị Bình
          { staffId: staff3.id, tierLevel: 3, isPrimary: true }, // Level 3: Hoàng Đức Chi
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      projectName: "Hệ thống Phòng khám Smart Clinic",
      projectCode: "PRJ-MED-02",
      systemHisUrl: "https://clinic.smartcare.vn/operator",
      status: "active",
      description: "Nền tảng quản lý tiếp đón bệnh nhân từ xa, phân luồng phòng khám và dược lâm sàng.",
      assignments: {
        create: [
          { staffId: staff4.id, tierLevel: 1, isPrimary: true }, // Level 1: Phạm Minh Dũng
          { staffId: staff2.id, tierLevel: 2, isPrimary: true }, // Level 2: Trần Thị Bình
        ],
      },
    },
  });

  console.log("✅ Đã tạo 2 dự án với đầy đủ phân cấp Level 1, 2, 3.");

  // 4. Tạo Kho Link Docs/Sheets (DocLinks)
  await prisma.docLink.createMany({
    data: [
      {
        title: "Tài liệu Quy trình Vận hành HIS Bệnh viện",
        targetUrl: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
        linkCategory: "docs",
        tags: JSON.stringify(["Quy trình", "Kỹ thuật", "HIS"]),
        description: "Tài liệu hướng dẫn trực ca và quy trình khắc phục sự cố khẩn cấp cho đội kỹ thuật L1.",
        createdByUserId: adminUser.id,
      },
      {
        title: "Kế hoạch Phân bổ Nhân sự & Sprint Roadmap",
        targetUrl: "https://docs.google.com/spreadsheets/d/154m98C-D1L-07W6W1V2V3T4_SampleSpreadsheetId/edit",
        linkCategory: "sheets",
        tags: JSON.stringify(["Kế hoạch", "PMO", "Sprint"]),
        description: "Bảng theo dõi tiến độ công việc theo tuần của các dự án trọng điểm.",
        createdByUserId: adminUser.id,
      },
      {
        title: "Thư mục Bàn giao & Tài sản Kiến trúc Hệ thống",
        targetUrl: "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
        linkCategory: "drive",
        tags: JSON.stringify(["Bàn giao", "Tài sản số"]),
        description: "Lưu trữ sơ đồ kiến trúc, tài liệu bàn giao API và hợp đồng kỹ thuật.",
        createdByUserId: userAn.id,
      },
    ],
  });

  console.log("✅ Đã tạo 3 link tài liệu mẫu (Docs, Sheets, Drive).");

  // 5. Tạo Tài khoản Site Dự án (Staff Accounts) với AES-256-GCM
  const pass1 = encrypt("Hospital#MasterPass2026!");
  await prisma.staffAccount.create({
    data: {
      projectId: project1.id,
      staffId: staff1.id,
      accountLabel: "Tài khoản Root Server HIS Bệnh viện",
      siteLoginUsername: "admin_his_sysroot",
      sitePasswordEncrypted: pass1.ciphertext,
      encryptionIv: pass1.iv,
      encryptionAuthTag: pass1.authTag,
      status: "in_use",
      notes: "Tài khoản có quyền cao nhất trên môi trường Production của Bệnh viện.",
    },
  });

  const pass2 = encrypt("BinhPM@HospitalManager$");
  await prisma.staffAccount.create({
    data: {
      projectId: project1.id,
      staffId: staff2.id,
      accountLabel: "Tài khoản Điều phối Lịch khám HIS",
      siteLoginUsername: "pm_binh_coordination",
      sitePasswordEncrypted: pass2.ciphertext,
      encryptionIv: pass2.iv,
      encryptionAuthTag: pass2.authTag,
      status: "in_use",
      notes: "Dùng để kiểm tra dashboard điều phối lưu lượng bệnh nhân.",
    },
  });

  const pass3 = encrypt("ClinicSupportDev$999!");
  await prisma.staffAccount.create({
    data: {
      projectId: project2.id,
      staffId: staff4.id,
      accountLabel: "Tài khoản Kỹ thuật viên Smart Clinic",
      siteLoginUsername: "tech_dung_clinic",
      sitePasswordEncrypted: pass3.ciphertext,
      encryptionIv: pass3.iv,
      encryptionAuthTag: pass3.authTag,
      status: "in_use",
      notes: "Tài khoản hỗ trợ cấu hình phòng khám chuyên khoa.",
    },
  });

  console.log("✅ Đã tạo 3 tài khoản site dự án mã hóa AES-256-GCM.");

  // 6. Ghi Audit Log ban đầu
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      actionCode: "SYSTEM_SEED_INITIALIZED",
      targetEntity: "system",
      contextJson: JSON.stringify({ message: "Dữ liệu mẫu khởi tạo hoàn tất theo tiêu chuẩn SRS v2.1" }),
      ipAddress: "127.0.0.1",
      userAgent: "PMS System Initializer",
    },
  });

  console.log("🎉 Seeding database hoàn tất thành công 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
