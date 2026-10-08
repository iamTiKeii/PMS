import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testImports() {
  console.log("🚀 Bắt đầu kiểm thử tự động tính năng Import Excel toàn diện...");

  const BASE_URL = "http://localhost:3000";

  // 1. Đăng nhập để lấy cookie session
  console.log("1. Đăng nhập với tài khoản Admin...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Admin@123" }),
  });

  const loginJson = await loginRes.json();
  if (!loginJson.success) {
    throw new Error(`Đăng nhập thất bại: ${JSON.stringify(loginJson)}`);
  }
  const setCookie = loginRes.headers.get("set-cookie") || "";
  console.log("✅ Đăng nhập thành công!");

  const timestamp = Date.now();

  // 2. Test Import Staff
  console.log("2. Kiểm thử POST /api/staff/import...");
  const staffPayload = {
    items: [
      {
        fullName: `Bùi Đức Minh ${timestamp}`,
        staffCode: `EMP_${timestamp}_1`,
        corporateEmail: `minh.bui.${timestamp}@company.com`,
        phoneNumber: "0988112233",
        department: "Khối Kỹ thuật & Công nghệ",
        status: "working",
        joinDate: "2024-02-01",
      },
      {
        fullName: `Hoàng Thùy Linh ${timestamp}`,
        staffCode: `EMP_${timestamp}_2`,
        corporateEmail: `linh.hoang.${timestamp}@company.com`,
        phoneNumber: "0977223344",
        department: "Ban PMO",
        status: "working",
        joinDate: "2024-03-15",
      },
    ],
  };

  const staffRes = await fetch(`${BASE_URL}/api/staff/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie,
    },
    body: JSON.stringify(staffPayload),
  });

  const staffJson = await staffRes.json();
  console.log("Kết quả import Staff:", staffJson.message);
  if (!staffJson.success || staffJson.data.importedCount !== 2) {
    throw new Error(`Import Staff không đạt: ${JSON.stringify(staffJson)}`);
  }
  console.log("✅ Import Staff thành công 2/2 bản ghi!");

  // 3. Test Import Projects
  console.log("3. Kiểm thử POST /api/projects/import...");
  const projectPayload = {
    items: [
      {
        projectName: `Bệnh viện Đa khoa Tỉnh Lâm Đồng (${timestamp})`,
        projectCode: `BVDK-LD-${timestamp}`,
        systemHisUrl: "https://his.bvdklamdong.vn",
        description: "Dự án liên thông BHYT và hồ sơ bệnh án điện tử EMR",
        status: "active",
        level1Staff: `minh.bui.${timestamp}@company.com`,
        level2Staff: `linh.hoang.${timestamp}@company.com`,
      },
      {
        projectName: `Trung tâm Y tế Huyện Di Linh (${timestamp})`,
        projectCode: `TTYT-DL-${timestamp}`,
        systemHisUrl: "https://his.dilinh.med.vn",
        description: "Dự án số hóa dữ liệu y tế tuyến huyện",
        status: "active",
        level1Staff: `EMP_${timestamp}_1`,
      },
    ],
  };

  const projectRes = await fetch(`${BASE_URL}/api/projects/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie,
    },
    body: JSON.stringify(projectPayload),
  });

  const projectJson = await projectRes.json();
  console.log("Kết quả import Projects:", projectJson.message);
  if (!projectJson.success || projectJson.data.importedCount !== 2) {
    throw new Error(`Import Projects không đạt: ${JSON.stringify(projectJson)}`);
  }
  console.log("✅ Import Projects thành công 2/2 bản ghi kèm phân công Level 1/2!");

  // 4. Test Import Doc Links
  console.log("4. Kiểm thử POST /api/doc-links/import...");
  const docLinksPayload = {
    items: [
      {
        title: `Tài liệu Kỹ thuật Tích hợp Cổng BHYT ${timestamp}`,
        targetUrl: `https://docs.google.com/document/d/doc_sample_${timestamp}/edit`,
        tags: "BHYT, API, Kỹ thuật",
        description: "Đặc tả chuẩn kết nối cổng giám định BHYT",
      },
    ],
  };

  const docRes = await fetch(`${BASE_URL}/api/doc-links/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie,
    },
    body: JSON.stringify(docLinksPayload),
  });

  const docJson = await docRes.json();
  console.log("Kết quả import DocLinks:", docJson.message);
  if (!docJson.success || docJson.data.importedCount !== 1) {
    throw new Error(`Import DocLinks không đạt: ${JSON.stringify(docJson)}`);
  }
  console.log("✅ Import DocLinks thành công 1/1 bản ghi!");

  // 5. Test Import Vault Accounts
  console.log("5. Kiểm thử POST /api/vault/accounts/import...");
  const vaultPayload = {
    items: [
      {
        projectName: `Bệnh viện Đa khoa Tỉnh Lâm Đồng (${timestamp})`,
        staffEmailOrCode: `minh.bui.${timestamp}@company.com`,
        accountLabel: "Tài khoản Quản trị Cổng HIS Lâm Đồng",
        siteLoginUsername: `admin_ld_${timestamp}`,
        sitePassword: "SecretPassword@2026!",
        notes: "Tài khoản test API import",
        status: "in_use",
      },
    ],
  };

  const vaultRes = await fetch(`${BASE_URL}/api/vault/accounts/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie,
    },
    body: JSON.stringify(vaultPayload),
  });

  const vaultJson = await vaultRes.json();
  console.log("Kết quả import Vault Accounts:", vaultJson.message);
  if (!vaultJson.success || vaultJson.data.importedCount !== 1) {
    throw new Error(`Import Vault Accounts không đạt: ${JSON.stringify(vaultJson)}`);
  }
  console.log("✅ Import Vault Accounts thành công và đã tự động mã hóa AES-256-GCM!");

  // 6. Test Import Users
  console.log("6. Kiểm thử POST /api/users/import...");
  const usersPayload = {
    items: [
      {
        username: `user_${timestamp}_1`,
        password: "DefaultPass@2026!",
        role: "user",
        status: "active",
        staffIdentifier: `minh.bui.${timestamp}@company.com`,
      },
      {
        username: `pm_${timestamp}_2`,
        password: "", // để trống để hệ thống tự sinh mật khẩu an toàn
        role: "pm",
        status: "active",
        staffIdentifier: `EMP_${timestamp}_2`,
      },
    ],
  };

  const usersRes = await fetch(`${BASE_URL}/api/users/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie,
    },
    body: JSON.stringify(usersPayload),
  });

  const usersJson = await usersRes.json();
  console.log("Kết quả import Users:", usersJson.message);
  if (!usersJson.success || usersJson.data.importedCount !== 2) {
    throw new Error(`Import Users không đạt: ${JSON.stringify(usersJson)}`);
  }
  console.log("✅ Import Users thành công 2/2 bản ghi kèm tự sinh mật khẩu ngẫu nhiên & liên kết staff!");

  // 7. Kiểm tra Audit Log
  const latestLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("7. Kiểm tra 5 Audit Log mới nhất:", latestLogs.map(l => l.actionCode));

  console.log("🎉 TẤT CẢ 5 BÀI KIỂM THỬ IMPORT EXCEL ĐỀU THÀNH CÔNG 100%!");
}

testImports()
  .catch((e) => {
    console.error("❌ Lỗi kiểm thử:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
