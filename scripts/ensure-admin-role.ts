import prisma from "../src/lib/prisma";

async function ensureAdminRole() {
  console.log("=== THIẾT LẬP & ĐẢM BẢO VAI TRÒ ADMIN ===");

  // 1. Lấy tất cả các quyền hệ thống
  const allPermissions = await prisma.permission.findMany();
  console.log(`- Hệ thống đang có ${allPermissions.length} quyền.`);

  // 2. Tìm hoặc tạo vai trò ADMIN
  let adminRole = await prisma.role.findFirst({
    where: {
      OR: [{ code: "admin" }, { code: "ADMIN" }],
    },
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        code: "admin",
        name: "Quản trị viên toàn hệ thống",
        description: "Vai trò có toàn quyền quản trị, cấu hình hệ thống, phân quyền vai trò và quản lý dữ liệu toàn sàn.",
        isSystem: true,
        status: "active",
        defaultScopeType: "system",
      },
    });
    console.log(`✓ Đã tạo mới vai trò: ${adminRole.name} (${adminRole.code})`);
  } else {
    // Cập nhật tên và đảm bảo isSystem: true, defaultScopeType: system
    adminRole = await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        name: "Quản trị viên (ADMIN)",
        description: "Toàn quyền quản trị hệ thống, cấp phát tài khoản, phân quyền vai trò và toàn bộ dữ liệu.",
        isSystem: true,
        status: "active",
        defaultScopeType: "system",
      },
    });
    console.log(`✓ Vai trò ADMIN đã tồn tại: ${adminRole.name} (id: ${adminRole.id}, code: ${adminRole.code})`);
  }

  // 3. Gán TOÀN BỘ 45 quyền hệ thống cho vai trò ADMIN
  let attachedPermCount = 0;
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
    attachedPermCount++;
  }
  console.log(`✓ Đã gán đầy đủ ${attachedPermCount}/${allPermissions.length} quyền cho vai trò ADMIN.`);

  // 4. Tìm các tài khoản admin trong hệ thống (username 'admin' hoặc user.role === 'admin')
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: "admin" },
        { role: "admin" },
      ],
      deletedAt: null,
    },
  });

  console.log(`- Tìm thấy ${adminUsers.length} tài khoản quản trị:`, adminUsers.map((u) => u.username));

  for (const u of adminUsers) {
    // Gán role ADMIN
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: u.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: u.id,
        roleId: adminRole.id,
        assignedBy: "system_setup",
      },
    });

    // Đảm bảo có scope toàn hệ thống (system)
    const existingSystemScope = await prisma.userRoleScope.findFirst({
      where: {
        userId: u.id,
        scopeType: "system",
      },
    });

    if (!existingSystemScope) {
      await prisma.userRoleScope.create({
        data: {
          userId: u.id,
          scopeType: "system",
          notes: "Phạm vi toàn hệ thống cho Quản trị viên (ADMIN)",
        },
      });
    }

    // Đảm bảo status active
    if (u.status !== "active") {
      await prisma.user.update({
        where: { id: u.id },
        data: { status: "active", failedAttempts: 0, lockedUntil: null },
      });
    }

    console.log(`✓ Đã gán vai trò ADMIN và Scope Toàn hệ thống cho user: @${u.username}`);
  }

  // 5. Thống kê lại
  const finalRole = await prisma.role.findUnique({
    where: { id: adminRole.id },
    include: {
      _count: {
        select: { rolePermissions: true, userRoles: true },
      },
      userRoles: {
        include: { user: true },
      },
    },
  });

  console.log("\n=== KẾT QUẢ VAI TRÒ ADMIN ===");
  console.log({
    id: finalRole?.id,
    code: finalRole?.code,
    name: finalRole?.name,
    isSystem: finalRole?.isSystem,
    defaultScopeType: finalRole?.defaultScopeType,
    totalPermissions: finalRole?._count.rolePermissions,
    assignedUsersCount: finalRole?._count.userRoles,
    assignedUsers: finalRole?.userRoles.map((ur) => ur.user.username),
  });
  console.log("=== HOÀN TẤT THIẾT LẬP VAI TRÒ ADMIN! ===");
}

ensureAdminRole()
  .catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
