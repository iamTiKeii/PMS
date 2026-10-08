const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("🚀 BẮT ĐẦU IMPORT DANH MỤC CƠ SỞ KHÁM CHỮA BỆNH");
  console.log("=================================================");

  // Find file
  const rootDir = path.resolve(__dirname, "..");
  const files = fs.readdirSync(rootDir).filter(
    (f) => f.includes("DANH M") && f.endsWith(".xlsx")
  );

  if (files.length === 0) {
    console.error("❌ Không tìm thấy file Excel Danh mục CSKCB trong thư mục gốc!");
    process.exit(1);
  }

  const filePath = path.join(rootDir, files[0]);
  console.log("📂 Đang đọc file:", files[0]);

  const startTime = Date.now();
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" });

  console.log(`📊 Tổng số dòng trong file Excel: ${rawRows.length}`);

  const facilities = [];
  const seenCodes = new Set();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const code = String(row[1] || "").trim();
    const name = String(row[2] || "").trim();

    if (!code || !name) continue;

    // Prevent duplicate codes in Excel
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const technicalLine = String(row[4] || "").trim() || null;
    const hospitalRank = String(row[5] || "").trim() || null;
    const technicalLevel = String(row[6] || "").trim() || null;
    const score = String(row[7] || "").trim() || null;
    const address = String(row[8] || "").trim() || null;

    facilities.push({
      code,
      name,
      technicalLine,
      hospitalRank,
      technicalLevel,
      score,
      address,
    });
  }

  console.log(`✅ Đã chuẩn hóa ${facilities.length} cơ sở khám chữa bệnh hợp lệ.`);

  // Insert in chunks of 500 records
  const CHUNK_SIZE = 500;
  let insertedTotal = 0;

  for (let i = 0; i < facilities.length; i += CHUNK_SIZE) {
    const chunk = facilities.slice(i, i + CHUNK_SIZE);
    await prisma.hospitalFacility.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedTotal += chunk.length;
    const pct = Math.round((insertedTotal / facilities.length) * 100);
    process.stdout.write(`⏳ Tiến độ: ${insertedTotal}/${facilities.length} (${pct}%)...\r`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 HOÀN TẤT IMPORT! Đã nạp thành công ${insertedTotal} CSKCB vào database.`);
  console.log(`⏱️ Thời gian thực thi: ${duration}s`);
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("\n❌ Lỗi khi import danh mục:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
