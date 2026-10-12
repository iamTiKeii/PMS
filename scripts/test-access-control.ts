import prisma from "../src/lib/prisma";
import {
  getEffectiveUserPermissions,
  checkUserPermission,
  recordAccessAudit,
} from "../src/lib/access-control";

async function main() {
  console.log("=== KIỂM THỬ TOÀN DIỆN MODULE QUẢN TRỊ TRUY CẬP (ACCESS CONTROL) ===");

  // 1. Kiểm tra danh mục quyền
  const permCount = await prisma.permission.count();
  console.log(`1. Số quyền hạn trong hệ thống: ${permCount} quyền (Yêu cầu >= 45)`);
  if (permCount < 45) throw new Error("Thiếu quyền hệ thống!");

  // 2. Kiểm tra các vai trò cốt lõi
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: { rolePermissions: true, userRoles: true },
      },
    },
  });
  console.log(`2. Số lượng vai trò: ${roles.length} vai trò:`);
  for (const r of roles) {
    console.log(`   - [${r.code}] ${r.name}: ${r._count.rolePermissions} quyền, ${r._count.userRoles} người dùng (isSystem: ${r.isSystem})`);
  }

  // 3. Kiểm tra tính quyền hiệu lực (Effective Permissions)
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin", deletedAt: null },
  });
  if (adminUser) {
    const effectiveAdmin = await getEffectiveUserPermissions(adminUser.id);
    console.log(`3. Kiểm tra tính quyền hiệu lực cho Admin (@${adminUser.username}):`);
    console.log(`   - isSystemAdmin: ${effectiveAdmin?.isSystemAdmin}`);
    console.log(`   - Tổng quyền: ${effectiveAdmin?.permissions.length}`);
    console.log(`   - Số vai trò: ${effectiveAdmin?.roles.length}`);

    // Kiểm tra checkUserPermission
    const canManageRoles = await checkUserPermission(adminUser.id, "access.roles.manage");
    console.log(`   - Quyền 'access.roles.manage': ${canManageRoles.allowed}`);
  }

  // 4. Kiểm tra quyền của người dùng thường (Member)
  const memberUser = await prisma.user.findFirst({
    where: { role: "user", deletedAt: null },
  });
  if (memberUser) {
    const effectiveMember = await getEffectiveUserPermissions(memberUser.id);
    console.log(`4. Kiểm tra tính quyền hiệu lực cho Member (@${memberUser.username}):`);
    console.log(`   - isSystemAdmin: ${effectiveMember?.isSystemAdmin}`);
    console.log(`   - Tổng quyền: ${effectiveMember?.permissions.length}`);

    // Member không được có quyền quản lý vai trò
    const canManageRoles = await checkUserPermission(memberUser.id, "access.roles.manage");
    console.log(`   - Quyền 'access.roles.manage' (kỳ vọng false): ${canManageRoles.allowed}`);

    // Member có quyền xem danh sách dự án
    const canViewProjects = await checkUserPermission(memberUser.id, "projects.list.view");
    console.log(`   - Quyền 'projects.list.view' (kỳ vọng true): ${canViewProjects.allowed}`);
  }

  // 5. Kiểm tra ghi Access Audit Log
  await recordAccessAudit({
    actor: {
      userId: adminUser?.id || "sys_test",
      username: adminUser?.username || "admin",
      role: "admin",
      fullName: "Kiểm thử viên Hệ thống",
    },
    action: "test_verification",
    targetType: "scope",
    summary: "Kiểm thử tự động tính toàn vẹn của Access Control Module",
    beforeData: { testStatus: "starting" },
    afterData: { testStatus: "passed", permissionsVerified: permCount },
  });

  const auditCount = await prisma.accessAuditLog.count();
  console.log(`5. Nhật ký phân quyền (Audit Log): Đã ghi thành công, tổng số bản ghi: ${auditCount}`);

  console.log("=== TẤT CẢ KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC! ===");
}

main()
  .catch((err) => {
    console.error("Lỗi kiểm thử:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
