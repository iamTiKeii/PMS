import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
  moduleName: string;
  resource: string;
  action: string;
  description: string;
  isSensitive: boolean;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Module Dự án
  {
    code: "projects.list.view",
    name: "Xem danh sách dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "list",
    action: "view",
    description: "Cho phép xem danh sách các dự án trong hệ thống",
    isSensitive: false,
  },
  {
    code: "projects.detail.view",
    name: "Xem chi tiết dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "detail",
    action: "view",
    description: "Cho phép xem thông tin chi tiết và tiến độ dự án",
    isSensitive: false,
  },
  {
    code: "projects.detail.create",
    name: "Tạo mới dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "detail",
    action: "create",
    description: "Cho phép khởi tạo dự án mới trên hệ thống",
    isSensitive: false,
  },
  {
    code: "projects.detail.edit",
    name: "Chỉnh sửa thông tin dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "detail",
    action: "edit",
    description: "Cho phép cập nhật thông tin tổng quan, mô tả, cấu hình dự án",
    isSensitive: false,
  },
  {
    code: "projects.detail.delete",
    name: "Xóa / lưu trữ dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "detail",
    action: "delete",
    description: "Quyền xóa hoặc lưu trữ dự án (Hành động có ảnh hưởng lớn)",
    isSensitive: true,
  },
  {
    code: "projects.members.view",
    name: "Xem thành viên dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "members",
    action: "view",
    description: "Xem danh sách nhân sự được phân công vào dự án",
    isSensitive: false,
  },
  {
    code: "projects.members.manage",
    name: "Quản lý thành viên dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "members",
    action: "manage",
    description: "Phân công Level 1/2/3 hoặc gỡ bỏ nhân sự khỏi dự án",
    isSensitive: false,
  },
  {
    code: "projects.requests.view",
    name: "Xem yêu cầu công việc (QLYC)",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "view",
    description: "Xem danh sách và tiến độ các yêu cầu công việc trong dự án",
    isSensitive: false,
  },
  {
    code: "projects.requests.create",
    name: "Tạo yêu cầu công việc mới",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "create",
    description: "Gửi yêu cầu công việc mới vào dự án",
    isSensitive: false,
  },
  {
    code: "projects.requests.edit",
    name: "Cập nhật yêu cầu công việc",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "edit",
    description: "Cập nhật trạng thái, ghi chú và thông tin tiến độ của yêu cầu",
    isSensitive: false,
  },
  {
    code: "projects.requests.assign",
    name: "Giao việc và phân công yêu cầu",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "assign",
    description: "Chỉ định nhân sự thực hiện hoặc người theo dõi yêu cầu",
    isSensitive: false,
  },
  {
    code: "projects.requests.close",
    name: "Đóng và hoàn tất yêu cầu",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "close",
    description: "Xác nhận nghiệm thu và hoàn tất yêu cầu công việc",
    isSensitive: false,
  },
  {
    code: "projects.requests.export",
    name: "Xuất báo cáo yêu cầu ra Excel",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "requests",
    action: "export",
    description: "Xuất dữ liệu danh sách yêu cầu ra file bảng tính Excel",
    isSensitive: false,
  },
  {
    code: "projects.accounts.view",
    name: "Xem tài khoản thuộc dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "accounts",
    action: "view",
    description: "Xem thông tin tài khoản site HIS gán với dự án",
    isSensitive: false,
  },
  {
    code: "projects.accounts.manage",
    name: "Quản lý tài khoản dự án",
    module: "projects",
    moduleName: "Quản lý Dự án",
    resource: "accounts",
    action: "manage",
    description: "Cấp phát, thay đổi hoặc thu hồi tài khoản dự án",
    isSensitive: true,
  },

  // Module Kho Link Docs / Sheets
  {
    code: "doc_links.list.view",
    name: "Xem danh sách liên kết tài liệu",
    module: "doc_links",
    moduleName: "Kho Link Docs / Sheets",
    resource: "list",
    action: "view",
    description: "Xem danh sách đường link tài liệu, bảng tính, thư mục lưu trữ",
    isSensitive: false,
  },
  {
    code: "doc_links.detail.create",
    name: "Thêm liên kết tài liệu mới",
    module: "doc_links",
    moduleName: "Kho Link Docs / Sheets",
    resource: "detail",
    action: "create",
    description: "Lưu trữ liên kết Google Docs, Sheets, Drive mới vào kho",
    isSensitive: false,
  },
  {
    code: "doc_links.detail.edit",
    name: "Chỉnh sửa liên kết tài liệu",
    module: "doc_links",
    moduleName: "Kho Link Docs / Sheets",
    resource: "detail",
    action: "edit",
    description: "Cập nhật tiêu đề, danh mục, nhãn và đường dẫn tài liệu",
    isSensitive: false,
  },
  {
    code: "doc_links.detail.delete",
    name: "Xóa liên kết tài liệu",
    module: "doc_links",
    moduleName: "Kho Link Docs / Sheets",
    resource: "detail",
    action: "delete",
    description: "Xóa liên kết tài liệu khỏi kho lưu trữ",
    isSensitive: false,
  },

  // Module Danh mục Nhân sự
  {
    code: "staff.list.view",
    name: "Xem danh bạ nhân sự",
    module: "staff",
    moduleName: "Danh mục Nhân sự",
    resource: "list",
    action: "view",
    description: "Xem danh bạ, số điện thoại, email và phòng ban của nhân viên",
    isSensitive: false,
  },
  {
    code: "staff.detail.create",
    name: "Thêm hồ sơ nhân sự",
    module: "staff",
    moduleName: "Danh mục Nhân sự",
    resource: "detail",
    action: "create",
    description: "Tạo hồ sơ nhân sự mới vào danh mục",
    isSensitive: false,
  },
  {
    code: "staff.detail.edit",
    name: "Chỉnh sửa hồ sơ nhân sự",
    module: "staff",
    moduleName: "Danh mục Nhân sự",
    resource: "detail",
    action: "edit",
    description: "Cập nhật phòng ban, email, chức danh và thông tin liên hệ",
    isSensitive: false,
  },
  {
    code: "staff.detail.delete",
    name: "Xóa hồ sơ nhân sự",
    module: "staff",
    moduleName: "Danh mục Nhân sự",
    resource: "detail",
    action: "delete",
    description: "Xóa hồ sơ nhân sự khỏi hệ thống (Hành động nhạy cảm)",
    isSensitive: true,
  },
  {
    code: "staff.data.import",
    name: "Nhập danh sách nhân sự từ Excel",
    module: "staff",
    moduleName: "Danh mục Nhân sự",
    resource: "data",
    action: "import",
    description: "Batch import hàng loạt hồ sơ nhân sự từ file bảng tính",
    isSensitive: true,
  },

  // Module Đơn đặt nhóm
  {
    code: "group_orders.list.view",
    name: "Xem danh sách đơn đặt món",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "list",
    action: "view",
    description: "Xem các đơn đặt món cơm, trà sữa của nhóm",
    isSensitive: false,
  },
  {
    code: "group_orders.detail.create",
    name: "Mở đơn đặt món mới",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "detail",
    action: "create",
    description: "Khởi tạo đợt gom đơn đặt đồ ăn, nước uống cho nhóm",
    isSensitive: false,
  },
  {
    code: "group_orders.detail.edit",
    name: "Cập nhật thông tin đơn đặt",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "detail",
    action: "edit",
    description: "Chỉnh sửa menu, hạn chót, phí giao hàng và thông tin đơn",
    isSensitive: false,
  },
  {
    code: "group_orders.items.manage",
    name: "Quản lý món đặt trong đơn",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "items",
    action: "manage",
    description: "Đặt món cho bản thân hoặc hỗ trợ thành viên khác đặt món",
    isSensitive: false,
  },
  {
    code: "group_orders.settlement.manage",
    name: "Quản lý thanh toán & nhắc tiền",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "settlement",
    action: "manage",
    description: "Đánh dấu đã thanh toán, gửi thông báo nhắc tiền qua Telegram",
    isSensitive: false,
  },
  {
    code: "group_orders.detail.close",
    name: "Chốt và đóng đơn đặt",
    module: "group_orders",
    moduleName: "Đơn đặt nhóm",
    resource: "detail",
    action: "close",
    description: "Khóa đơn không cho đặt thêm để chuyển sang đặt hàng",
    isSensitive: false,
  },

  // Module Két Mật khẩu
  {
    code: "vault.accounts.view",
    name: "Xem danh sách tài khoản két",
    module: "vault",
    moduleName: "Két Mật khẩu Site",
    resource: "accounts",
    action: "view",
    description: "Xem danh sách tài khoản phân quyền trong két",
    isSensitive: false,
  },
  {
    code: "vault.accounts.manage",
    name: "Quản lý tài khoản trong két",
    module: "vault",
    moduleName: "Két Mật khẩu Site",
    resource: "accounts",
    action: "manage",
    description: "Thêm, cập nhật hoặc xóa tài khoản site mật khẩu két",
    isSensitive: true,
  },
  {
    code: "vault.password.reveal",
    name: "Xác thực PIN & xem mật khẩu",
    module: "vault",
    moduleName: "Két Mật khẩu Site",
    resource: "password",
    action: "reveal",
    description: "Xác thực mã PIN bảo mật cá nhân để giải mã mật khẩu két",
    isSensitive: true,
  },
  {
    code: "vault.accounts.import",
    name: "Nhập tài khoản két từ Excel",
    module: "vault",
    moduleName: "Két Mật khẩu Site",
    resource: "accounts",
    action: "import",
    description: "Nạp hàng loạt thông tin tài khoản két từ file bảng tính",
    isSensitive: true,
  },

  // Module Quản trị truy cập (Access Control)
  {
    code: "access.users.view",
    name: "Xem người dùng & phân quyền",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "users",
    action: "view",
    description: "Xem danh sách tài khoản, vai trò được gán và phạm vi dữ liệu",
    isSensitive: false,
  },
  {
    code: "access.users.manage",
    name: "Quản trị tài khoản người dùng",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "users",
    action: "manage",
    description: "Tạo tài khoản mới, khóa / mở khóa, đặt lại mật khẩu",
    isSensitive: true,
  },
  {
    code: "access.users.assign_role",
    name: "Gán và thu hồi vai trò",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "users",
    action: "assign_role",
    description: "Gán hoặc thu hồi vai trò công việc cho tài khoản người dùng",
    isSensitive: true,
  },
  {
    code: "access.roles.view",
    name: "Xem danh mục vai trò",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "roles",
    action: "view",
    description: "Xem danh sách các vai trò và trách nhiệm trong hệ thống",
    isSensitive: false,
  },
  {
    code: "access.roles.manage",
    name: "Quản lý vai trò & quyền hạn",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "roles",
    action: "manage",
    description: "Tạo, chỉnh sửa quyền hạn và ngưng sử dụng vai trò",
    isSensitive: true,
  },
  {
    code: "access.permissions.view",
    name: "Xem danh mục quyền hệ thống",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "permissions",
    action: "view",
    description: "Tra cứu ma trận quyền hệ thống và các thao tác định nghĩa",
    isSensitive: false,
  },
  {
    code: "access.scopes.manage",
    name: "Cấu hình phạm vi truy cập dữ liệu",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "scopes",
    action: "manage",
    description: "Thiết lập phạm vi dữ liệu: Toàn hệ thống, Theo dự án, Theo phòng ban",
    isSensitive: true,
  },
  {
    code: "access.audit.view",
    name: "Tra cứu nhật ký phân quyền",
    module: "access",
    moduleName: "Quản trị truy cập",
    resource: "audit",
    action: "view",
    description: "Xem lịch sử ai đã cấp quyền, thu hồi vai trò hoặc thay đổi phạm vi",
    isSensitive: false,
  },

  // Module Hệ thống & Cấu hình
  {
    code: "system.telegram.manage",
    name: "Cấu hình Telegram Bot",
    module: "system",
    moduleName: "Hệ thống & Cấu hình",
    resource: "telegram",
    action: "manage",
    description: "Cấu hình Bot token, Chat ID và các kênh thông báo tự động",
    isSensitive: true,
  },
  {
    code: "system.audit_logs.view",
    name: "Xem nhật ký kiểm toán hệ thống",
    module: "system",
    moduleName: "Hệ thống & Cấu hình",
    resource: "audit_logs",
    action: "view",
    description: "Xem lịch sử đăng nhập, thao tác nghiệp vụ và bảo mật toàn sàn",
    isSensitive: false,
  },
  {
    code: "system.settings.manage",
    name: "Quản trị cấu hình chung hệ thống",
    module: "system",
    moduleName: "Hệ thống & Cấu hình",
    resource: "settings",
    action: "manage",
    description: "Quản lý các thiết lập hệ thống cốt lõi và tham số môi trường",
    isSensitive: true,
  },
];

export async function seedAccessControl() {
  console.log("--> Bắt đầu khởi tạo & đồng bộ danh mục quyền hệ thống...");

  // 1. Tạo/cập nhật danh mục quyền
  const permissionMap = new Map<string, string>();
  for (const p of SYSTEM_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        module: p.module,
        resource: p.resource,
        action: p.action,
        description: p.description,
        isSensitive: p.isSensitive,
      },
      create: {
        code: p.code,
        name: p.name,
        module: p.module,
        resource: p.resource,
        action: p.action,
        description: p.description,
        isSensitive: p.isSensitive,
      },
    });
    permissionMap.set(p.code, perm.id);
  }
  console.log(`✓ Đã đồng bộ ${permissionMap.size} quyền hệ thống.`);

  // 2. Định nghĩa các vai trò mặc định
  const defaultRoles = [
    {
      code: "admin",
      name: "Quản trị viên toàn hệ thống",
      description: "Có toàn quyền cấu hình, quản trị tài khoản, vai trò và dữ liệu toàn hệ thống.",
      isSystem: true,
      defaultScopeType: "system",
      permissions: Array.from(permissionMap.keys()), // All permissions
    },
    {
      code: "pm",
      name: "Quản lý dự án (PM)",
      description: "Quản lý tiến độ dự án, phân công nhân sự, quản lý yêu cầu công việc (QLYC), xuất Excel và gom đơn nhóm.",
      isSystem: true,
      defaultScopeType: "project",
      permissions: [
        "projects.list.view",
        "projects.detail.view",
        "projects.detail.create",
        "projects.detail.edit",
        "projects.members.view",
        "projects.members.manage",
        "projects.requests.view",
        "projects.requests.create",
        "projects.requests.edit",
        "projects.requests.assign",
        "projects.requests.close",
        "projects.requests.export",
        "projects.accounts.view",
        "projects.accounts.manage",
        "doc_links.list.view",
        "doc_links.detail.create",
        "doc_links.detail.edit",
        "doc_links.detail.delete",
        "staff.list.view",
        "group_orders.list.view",
        "group_orders.detail.create",
        "group_orders.detail.edit",
        "group_orders.items.manage",
        "group_orders.settlement.manage",
        "group_orders.detail.close",
        "vault.accounts.view",
        "vault.password.reveal",
      ],
    },
    {
      code: "member",
      name: "Nhân viên dự án",
      description: "Thành viên tham gia theo dõi và cập nhật công việc trong các dự án được phân công.",
      isSystem: true,
      defaultScopeType: "assigned",
      permissions: [
        "projects.list.view",
        "projects.detail.view",
        "projects.members.view",
        "projects.requests.view",
        "projects.requests.create",
        "projects.requests.edit",
        "doc_links.list.view",
        "staff.list.view",
        "group_orders.list.view",
        "group_orders.items.manage",
        "vault.accounts.view",
        "vault.password.reveal",
      ],
    },
    {
      code: "viewer",
      name: "Người xem (Read-only)",
      description: "Chỉ được xem thông tin dự án, kho tài liệu và các nội dung chung, không có quyền sửa đổi.",
      isSystem: true,
      defaultScopeType: "personal",
      permissions: [
        "projects.list.view",
        "projects.detail.view",
        "projects.members.view",
        "doc_links.list.view",
        "staff.list.view",
        "group_orders.list.view",
      ],
    },
  ];

  for (const r of defaultRoles) {
    const roleRecord = await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        defaultScopeType: r.defaultScopeType,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        defaultScopeType: r.defaultScopeType,
      },
    });

    // Cập nhật quan hệ RolePermission
    for (const permCode of r.permissions) {
      const permId = permissionMap.get(permCode);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roleRecord.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: roleRecord.id,
            permissionId: permId,
          },
        });
      }
    }
    console.log(`✓ Đã đồng bộ vai trò: ${r.name} (${r.code}) với ${r.permissions.length} quyền.`);
  }

  // 3. Đồng bộ gán vai trò ban đầu cho người dùng hiện hữu
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { userRoles: true },
  });

  const roleAdmin = await prisma.role.findUnique({ where: { code: "admin" } });
  const rolePm = await prisma.role.findUnique({ where: { code: "pm" } });
  const roleMember = await prisma.role.findUnique({ where: { code: "member" } });

  let assignedCount = 0;
  for (const user of users) {
    // Nếu chưa có gán vai trò nào trong bảng access_user_roles
    if (user.userRoles.length === 0) {
      let targetRoleId = roleMember?.id;
      let scopeType = "assigned";

      if (user.role === "admin") {
        targetRoleId = roleAdmin?.id;
        scopeType = "system";
      } else if (user.role === "pm") {
        targetRoleId = rolePm?.id;
        scopeType = "project";
      }

      if (targetRoleId) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: targetRoleId,
            assignedBy: "system_migration",
          },
        });

        // Tạo scope mặc định
        await prisma.userRoleScope.create({
          data: {
            userId: user.id,
            scopeType,
            notes: `Khởi tạo mặc định theo vai trò ${user.role}`,
          },
        });

        assignedCount++;
      }
    }
  }

  console.log(`✓ Đã đồng bộ vai trò ban đầu cho ${assignedCount} người dùng hiện hữu.`);
  console.log("==> Khởi tạo & đồng bộ Access Control hoàn tất!");
}

if (require.main === module) {
  seedAccessControl()
    .catch((err) => {
      console.error("Lỗi khi seed access control:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
