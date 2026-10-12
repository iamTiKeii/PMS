const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, eqIdx).trim()] = val;
    }
  });
}

const { PrismaClient } = require(path.resolve(__dirname, "../node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function main() {
  console.log("=== BẮT ĐẦU CHUẨN BỊ DỮ LIỆU BÁO CÁO 119 CA HỖ TRỢ ===");

  // 1. Lấy danh mục khu vực
  const hnRegion = await prisma.region.findFirst({ where: { code: "HN" } });
  const hcmRegion = await prisma.region.findFirst({ where: { code: "HCM" } });
  const ctRegion = await prisma.region.findFirst({ where: { code: "CT" } });

  // 2. Chuẩn hóa/Tạo 16 CSYT theo đúng tên trong Hình 2
  const hospitalConfigs = [
    { code: "01043", shortName: "BV 198", name: "Bệnh viện 198 (Bộ Công An)", regionId: hnRegion?.id, count: 8 },
    { code: "01880", shortName: "BV Nội tiết TW-Tứ Hiệp", name: "Bệnh viện Nội tiết Trung ương Cơ sở 2", regionId: hnRegion?.id, count: 4 },
    { code: "01910", shortName: "BV Phổi TW", name: "Bệnh viện Phổi Trung ương", regionId: hnRegion?.id, count: 3 },
    { code: "01901", shortName: "BV Việt Đức CS1", name: "Bệnh viện Hữu nghị Việt Đức - CS1", regionId: hnRegion?.id, count: 12 },
    { code: "01902", shortName: "BV Việt Đức CS2", name: "Bệnh viện Hữu nghị Việt Đức - CS2", regionId: hnRegion?.id, count: 10 },
    { code: "01903", shortName: "BV Việt Đức CS3", name: "Bệnh viện Hữu nghị Việt Đức - CS3", regionId: hnRegion?.id, count: 6 },
    { code: "01007", shortName: "BVE", name: "Bệnh viện E", regionId: hnRegion?.id, count: 13 },
    { code: "38280", shortName: "ĐK Thanh Hóa", name: "Bệnh viện đa khoa tỉnh Thanh Hóa", regionId: hnRegion?.id, count: 13 },
    { code: "01920", shortName: "HHTW", name: "Viện Huyết học - Truyền máu Trung ương", regionId: hnRegion?.id, count: 11 },
    { code: "HPLUS", shortName: "Hplus", name: "Phòng Khám H PLUS", regionId: hnRegion?.id, count: 1 },
    { code: "22001", shortName: "Mắt Việt Nga Hạ Long", name: "Bệnh viện Mắt Quốc tế Việt - Nga Hạ Long", regionId: hnRegion?.id, count: 1 },
    { code: "01904", shortName: "PSHN", name: "Bệnh viện Phụ sản Hà Nội", regionId: hnRegion?.id, count: 8 },
    { code: "01905", shortName: "PSTW", name: "Bệnh viện Phụ sản Trung ương", regionId: hnRegion?.id, count: 15 },
    { code: "YDLD", shortName: "YDLD", name: "Phòng Khám YDLD", regionId: hcmRegion?.id || hnRegion?.id, count: 1 },
    { code: "01062", shortName: "YHCT BCA", name: "Bệnh viện YHCT Bộ Công an", regionId: hnRegion?.id, count: 8 },
    { code: "10168", shortName: "YKHN", name: "Phòng Khám Đa Khoa YKHN", regionId: hnRegion?.id, count: 5 },
  ];

  const hospitalMap = {};
  for (const h of hospitalConfigs) {
    let p = await prisma.project.findFirst({
      where: { OR: [{ projectCode: h.code }, { shortName: h.shortName }] },
    });
    if (p) {
      p = await prisma.project.update({
        where: { id: p.id },
        data: { shortName: h.shortName, regionId: h.regionId || p.regionId },
      });
    } else {
      p = await prisma.project.create({
        data: {
          projectCode: h.code,
          projectName: h.name,
          shortName: h.shortName,
          status: "active",
          systemHisUrl: `http://his.${h.code.toLowerCase()}.local`,
          regionId: h.regionId,
        },
      });
    }
    hospitalMap[h.shortName] = p;
  }

  // 3. Đảm bảo các Support Business (Nghiệp vụ) có sẵn
  const businessDistribution = [
    { name: "Form phiếu", count: 20 },
    { name: "Nhà thuốc", count: 1 },
    { name: "Nội trú", count: 35 },
    { name: "Thu Ngân", count: 9 },
    { name: "Truy xuất dữ liệu", count: 2 },
    { name: "Báo cáo", count: 10 },
    { name: "CĐHA-TDCN", count: 2 },
    { name: "Danh Mục", count: 2 },
    { name: "Dịch vụ CLS", count: 3 },
    { name: "Hội Chẩn", count: 1 },
    { name: "Isofhtool", count: 1 },
    { name: "Kết nối với bên thứ 3", count: 1 },
    { name: "Khám bệnh", count: 8 },
    { name: "Khám Sức Khoẻ", count: 5 },
    { name: "Kho", count: 7 },
    { name: "PTTT", count: 4 },
    { name: "Tiếp đón", count: 8 },
  ];

  const businessMap = {};
  for (const b of businessDistribution) {
    let biz = await prisma.supportBusiness.findFirst({ where: { name: b.name } });
    if (!biz) {
      biz = await prisma.supportBusiness.create({
        data: {
          code: b.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase(),
          name: b.name,
          sortOrder: 1,
          isActive: true,
        },
      });
    }
    businessMap[b.name] = biz;
  }

  // 4. Đảm bảo Support Types (Phân loại hỗ trợ) có sẵn
  const typeDistribution = [
    { name: "Hỗ trợ chỉnh sửa form phiếu báo cáo", under15: 0, to30: 1, over30: 1, total: 2 },
    { name: "Hỗ trợ khai báo", under15: 4, to30: 0, over30: 0, total: 4 },
    { name: "Hỗ trợ kiểm tra", under15: 57, to30: 8, over30: 2, total: 67 },
    { name: "Hỗ trợ update, chỉnh sửa dữ liệu", under15: 3, to30: 0, over30: 2, total: 5 },
    { name: "Hướng dẫn sử dụng", under15: 34, to30: 1, over30: 0, total: 35 },
    { name: "Lấy số liệu, báo cáo từ DB", under15: 1, to30: 1, over30: 2, total: 4 },
    { name: "Update dữ liệu", under15: 0, to30: 0, over30: 2, total: 2 },
  ];

  const typeMap = {};
  for (const t of typeDistribution) {
    let tp = await prisma.supportType.findFirst({ where: { name: t.name } });
    if (!tp) {
      tp = await prisma.supportType.create({
        data: {
          code: t.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase(),
          name: t.name,
          sortOrder: 1,
          isActive: true,
        },
      });
    }
    typeMap[t.name] = tp;
  }

  // 5. Lấy Time Groups
  const under15Tg = await prisma.supportTimeGroup.findFirst({ where: { code: "UNDER_15" } });
  const to30Tg = await prisma.supportTimeGroup.findFirst({ where: { code: "15_TO_30" } });
  const over30Tg = await prisma.supportTimeGroup.findFirst({ where: { code: "OVER_30" } });

  // 6. Lấy 1 admin user / staff để làm assignee
  const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });

  // 7. Xây dựng danh sách 119 ca hỗ trợ kết hợp chính xác cả 3 chiều
  // - Hospital list (119 mục)
  const hospitalList = [];
  for (const h of hospitalConfigs) {
    for (let i = 0; i < h.count; i++) {
      hospitalList.push(hospitalMap[h.shortName]);
    }
  }

  // - Business list (119 mục)
  const businessList = [];
  for (const b of businessDistribution) {
    for (let i = 0; i < b.count; i++) {
      businessList.push(businessMap[b.name]);
    }
  }

  // - Type & Time Group list (119 mục)
  const typeAndTimeList = [];
  for (const td of typeDistribution) {
    const tp = typeMap[td.name];
    for (let i = 0; i < td.under15; i++) {
      typeAndTimeList.push({ type: tp, tg: under15Tg, durationSec: 600 });
    }
    for (let i = 0; i < td.to30; i++) {
      typeAndTimeList.push({ type: tp, tg: to30Tg, durationSec: 1200 });
    }
    for (let i = 0; i < td.over30; i++) {
      typeAndTimeList.push({ type: tp, tg: over30Tg, durationSec: 2400 });
    }
  }

  console.log(`Kiểm tra số lượng: Hospitals = ${hospitalList.length}, Businesses = ${businessList.length}, Types = ${typeAndTimeList.length}`);

  // Xóa các vé demo cũ nếu có mã TICKET-DEMO-
  await prisma.supportTicket.deleteMany({
    where: { ticketCode: { startsWith: "TICKET-DEMO-" } },
  });

  const now = new Date();
  const createdTickets = [];

  for (let i = 0; i < 119; i++) {
    const proj = hospitalList[i];
    const biz = businessList[i];
    const { type, tg, durationSec } = typeAndTimeList[i];

    const sentAt = new Date(now.getTime() - (119 - i) * 3600 * 1000);
    const receivedAt = new Date(sentAt.getTime() + 120 * 1000); // 2 phút sau
    const resolvedAt = new Date(receivedAt.getTime() + durationSec * 1000);
    const processingSeconds = durationSec;
    const totalSeconds = durationSec + 120;

    createdTickets.push({
      ticketCode: `TICKET-DEMO-${String(i + 1).padStart(4, "0")}`,
      projectId: proj.id,
      businessId: biz.id,
      supportTypeId: type.id,
      timeGroupId: tg?.id,
      status: "COMPLETED",
      requesterName: `Người dùng ${proj.shortName} - ${i + 1}`,
      createdById: adminUser.id,
      description: `Mô tả chi tiết hỗ trợ kỹ thuật cho ca ${biz.name} - ${type.name}`,
      cause: "Yêu cầu cấu hình và hỗ trợ vận hành người dùng",
      resolution: "Đã kiểm tra và hỗ trợ giải quyết xong cho người dùng.",
      assignedUserId: adminUser.id,
      sentAt,
      receivedAt,
      resolvedAt,
      processingSeconds,
      totalSeconds,
    });
  }

  // Tạo hàng loạt
  await prisma.supportTicket.createMany({
    data: createdTickets,
  });

  console.log(`✅ Đã tạo thành công 119 ca hỗ trợ mẫu khớp 100% với các bảng báo cáo!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
