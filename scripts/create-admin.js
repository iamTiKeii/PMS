const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Đang kiểm tra và tạo tài khoản Admin...");

  const existingAdmin = await prisma.user.findFirst({
    where: { username: "admin" },
  });

  if (existingAdmin) {
    console.log("⚠️ Tài khoản 'admin' đã tồn tại trong cơ sở dữ liệu!");
    console.log("ID:", existingAdmin.id);
    return;
  }

  // 1. Tạo hồ sơ nhân sự đại diện cho Quản trị viên
  const staff = await prisma.staff.create({
    data: {
      fullName: "Quản trị viên Hệ thống",
      staffCode: "ADMIN001",
      corporateEmail: "admin@company.com",
      department: "Ban Quản trị & Kỹ thuật",
      status: "working",
      joinDate: new Date(),
    },
  });

  // 2. Hash mật khẩu Admin@123
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  // 3. Tạo tài khoản User role admin
  const user = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: passwordHash,
      role: "admin",
      status: "active",
      staffId: staff.id,
      mustChangePassword: false,
    },
  });

  console.log("\n==========================================");
  console.log("🎉 TẠO TÀI KHOẢN ADMIN THÀNH CÔNG!");
  console.log("------------------------------------------");
  console.log("Username: admin");
  console.log("Password: Admin@123");
  console.log("Role    : admin");
  console.log("Fullname: Quản trị viên Hệ thống");
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
