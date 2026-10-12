import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Bắt đầu khởi tạo dữ liệu cho module Support Tickets...");

  // 1. Permissions
  const permissions = [
    {
      code: "support_tickets.view",
      name: "Xem danh sách và chi tiết ca hỗ trợ",
      module: "support_tickets",
      resource: "tickets",
      action: "view",
      description: "Cho phép xem danh sách ca hỗ trợ và xem chi tiết ca trong phạm vi được cấp",
      isSensitive: false,
    },
    {
      code: "support_tickets.create",
      name: "Tạo mới ca hỗ trợ",
      module: "support_tickets",
      resource: "tickets",
      action: "create",
      description: "Cho phép tạo mới ca hỗ trợ trên Extension và Hub",
      isSensitive: false,
    },
    {
      code: "support_tickets.update",
      name: "Cập nhật ca hỗ trợ",
      module: "support_tickets",
      resource: "tickets",
      action: "update",
      description: "Cho phép sửa thông tin mô tả, nguyên nhân, cách xử lý của ca đang xử lý",
      isSensitive: false,
    },
    {
      code: "support_tickets.assign",
      name: "Phân công / Đổi nhân sự phụ trách",
      module: "support_tickets",
      resource: "tickets",
      action: "assign",
      description: "Cho phép thay đổi nhân sự phụ trách ca hỗ trợ sang người khác",
      isSensitive: false,
    },
    {
      code: "support_tickets.complete",
      name: "Xác nhận hoàn thành ca hỗ trợ",
      module: "support_tickets",
      resource: "tickets",
      action: "complete",
      description: "Cho phép ghi nhận thời điểm giải quyết và chuyển trạng thái ca sang Hoàn thành",
      isSensitive: false,
    },
    {
      code: "support_tickets.reopen",
      name: "Mở lại ca đã hoàn thành",
      module: "support_tickets",
      resource: "tickets",
      action: "reopen",
      description: "Cho phép mở lại ca đã hoàn thành về Chưa hoàn thành kèm lý do bắt buộc",
      isSensitive: true,
    },
    {
      code: "support_tickets.edit_completed",
      name: "Chỉnh sửa ca đã hoàn thành",
      module: "support_tickets",
      resource: "tickets",
      action: "edit_completed",
      description: "Cho phép điều chỉnh thông tin ca đã hoàn tất và tính lại chỉ số thời gian",
      isSensitive: true,
    },
    {
      code: "support_tickets.view_history",
      name: "Xem lịch sử thay đổi ca",
      module: "support_tickets",
      resource: "tickets",
      action: "view_history",
      description: "Xem nhật ký trước/sau của mọi lần sửa đổi, phân công, chuyển trạng thái",
      isSensitive: false,
    },
    {
      code: "support_tickets.report",
      name: "Xem báo cáo thống kê hỗ trợ",
      module: "support_tickets",
      resource: "reports",
      action: "report",
      description: "Xem báo cáo tổng hợp, thời gian xử lý trung bình và tỷ lệ theo nhóm thời gian",
      isSensitive: false,
    },
    {
      code: "support_tickets.export",
      name: "Xuất dữ liệu ca hỗ trợ",
      module: "support_tickets",
      resource: "reports",
      action: "export",
      description: "Xuất file dữ liệu ca hỗ trợ theo bộ lọc",
      isSensitive: false,
    },
    {
      code: "support_master_data.manage",
      name: "Quản trị danh mục Master Data hỗ trợ",
      module: "support_tickets",
      resource: "master_data",
      action: "manage",
      description: "Quản lý danh mục Nghiệp vụ, Phương thức, Loại hỗ trợ và Ngưỡng phân nhóm",
      isSensitive: true,
    },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        isSensitive: perm.isSensitive,
      },
      create: perm,
    });
  }
  console.log(`✅ Đã nạp ${permissions.length} quyền cho module Support Tickets.`);

  // Gán tất cả quyền cho role admin
  const adminRole = await prisma.role.findUnique({
    where: { code: "admin" },
  });

  if (adminRole) {
    const allSupportPerms = await prisma.permission.findMany({
      where: { module: "support_tickets" },
    });
    for (const p of allSupportPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      });
    }
    console.log(`✅ Đã gán quyền module Support Tickets cho vai trò Quản trị viên (admin).`);
  }

  // 2. Master Data: Nghiệp vụ (SupportBusiness)
  const businesses = [
    { code: "KCB", name: "Khám chữa bệnh (Ngoại trú, Nội trú)", sortOrder: 1 },
    { code: "VIEN_PHI", name: "Viện phí & Tài chính kế toán", sortOrder: 2 },
    { code: "DUOC_VT", name: "Dược & Vật tư y tế", sortOrder: 3 },
    { code: "CLS", name: "Cận lâm sàng (Xét nghiệm, CĐHA, TDCN)", sortOrder: 4 },
    { code: "BHXH", name: "Cổng giám định BHYT & BHXH", sortOrder: 5 },
    { code: "BC_TK", name: "Báo cáo & Thống kê y tế", sortOrder: 6 },
    { code: "HT_DM", name: "Hệ thống & Danh mục chung", sortOrder: 7 },
    { code: "KHAC", name: "Nghiệp vụ khác", sortOrder: 8 },
  ];

  for (const b of businesses) {
    await prisma.supportBusiness.upsert({
      where: { code: b.code },
      update: { name: b.name, sortOrder: b.sortOrder },
      create: b,
    });
  }
  console.log(`✅ Đã nạp ${businesses.length} danh mục Nghiệp vụ.`);

  // 3. Master Data: Phương thức hỗ trợ (SupportMethod)
  const methods = [
    { code: "ZALO", name: "Nhóm Zalo / Chat", sortOrder: 1 },
    { code: "HOTLINE", name: "Hotline / Cuộc gọi thoại", sortOrder: 2 },
    { code: "ULTRAVIEWER", name: "Điều khiển từ xa (UltraViewer / AnyDesk)", sortOrder: 3 },
    { code: "TRUC_TIEP", name: "Trực tiếp tại cơ sở y tế", sortOrder: 4 },
    { code: "EMAIL", name: "Email / Công văn", sortOrder: 5 },
  ];

  for (const m of methods) {
    await prisma.supportMethod.upsert({
      where: { code: m.code },
      update: { name: m.name, sortOrder: m.sortOrder },
      create: m,
    });
  }
  console.log(`✅ Đã nạp ${methods.length} danh mục Phương thức hỗ trợ.`);

  // 4. Master Data: Loại hỗ trợ (SupportType)
  const types = [
    { code: "HDSD", name: "Hướng dẫn sử dụng thao tác", sortOrder: 1 },
    { code: "BUG", name: "Lỗi phần mềm / Báo lỗi phát sinh", sortOrder: 2 },
    { code: "CAU_HINH", name: "Khai báo & Cấu hình tham số", sortOrder: 3 },
    { code: "DU_LIEU", name: "Xử lý & Điều chỉnh dữ liệu sai", sortOrder: 4 },
    { code: "DE_XUAT", name: "Đề xuất tính năng mới / Yêu cầu cải tiến", sortOrder: 5 },
    { code: "KHAC", name: "Loại công việc khác", sortOrder: 6 },
  ];

  for (const t of types) {
    await prisma.supportType.upsert({
      where: { code: t.code },
      update: { name: t.name, sortOrder: t.sortOrder },
      create: t,
    });
  }
  console.log(`✅ Đã nạp ${types.length} danh mục Loại hỗ trợ.`);

  // 5. Master Data: Nhóm thời gian (SupportTimeGroup)
  // Quy tắc đặc tả:
  // Dưới 15 phút: 0 <= T_xử_lý < 15 phút (0 <= seconds < 900)
  // Từ 15 đến dưới 30 phút: 15 <= T_xử_lý < 30 phút (900 <= seconds < 1800)
  // Từ 30 phút trở lên: T_xử_lý >= 30 phút (seconds >= 1800)
  const timeGroups = [
    { code: "UNDER_15", name: "Dưới 15 phút", minSeconds: 0, maxSeconds: 900, sortOrder: 1 },
    { code: "15_TO_30", name: "Từ 15 đến dưới 30 phút", minSeconds: 900, maxSeconds: 1800, sortOrder: 2 },
    { code: "OVER_30", name: "Từ 30 phút trở lên", minSeconds: 1800, maxSeconds: null, sortOrder: 3 },
  ];

  for (const tg of timeGroups) {
    await prisma.supportTimeGroup.upsert({
      where: { code: tg.code },
      update: {
        name: tg.name,
        minSeconds: tg.minSeconds,
        maxSeconds: tg.maxSeconds,
        sortOrder: tg.sortOrder,
      },
      create: tg,
    });
  }
  console.log(`✅ Đã nạp ${timeGroups.length} cấu hình Ngưỡng phân nhóm thời gian.`);
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khởi tạo dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
