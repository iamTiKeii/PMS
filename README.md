# Nền tảng Quản trị Tập trung Tài sản Số, Nhân sự & Thông tin Xác thực Dự án (PMS - OCMH)

Hệ thống quản trị nội bộ tập trung (Operations & Credential Management Hub) giúp chuẩn hóa việc quản lý liên kết tài liệu (Google Docs/Sheets), thông tin tài khoản truy cập site/môi trường dự án (với két mã hóa AES-256-GCM), danh mục nhân sự và ma trận phân công trách nhiệm dự án (Level 1/2/3).

---

## 📚 TÀI LIỆU THAM CHIẾU LẬP TRÌNH (DEVELOPER SPECS)

Tài liệu đặc tả chi tiết và hoàn chỉnh nhất dành cho kỹ sư phát triển (Backend, Frontend) và kiểm thử (QA/QC) đã được lưu trữ tại:

👉 **[Tài liệu SRS & Technical Specification v2.0](docs/SRS.md)**

---

## 📌 TÓM TẮT CÁC PHÂN HỆ HỆ THỐNG

| Phân hệ | Tên phân hệ | Vai trò & Chức năng chính |
|---|---|---|
| **AUTH & M1** | Quản trị Định danh & Người dùng Tool | Quản lý tài khoản đăng nhập tool, phân quyền RBAC (`admin`, `pm`, `user`), chống brute-force, thu hồi phiên làm việc và **Import Excel người dùng hàng loạt**. |
| **M5** | Danh mục Dữ liệu gốc Nhân sự | Quản lý thông tin nhân sự (họ tên, email, SĐT, trạng thái), liên kết với tài khoản tool, quản lý nghỉ việc (Offboarding) và **Import Excel hàng loạt**. |
| **M2** | Kho Tài liệu Số (Docs/Sheets) | Quản lý link tài liệu, tự động bóc tách File ID Google Docs/Sheets, cảnh báo trùng lặp, hỗ trợ **Import Excel hàng loạt**. |
| **M4** | Quản lý Dự án & Cấp độ Phụ trách | Quản lý link hệ thống/HIS dự án, ma trận phân quyền trách nhiệm: Level 1 (Kỹ thuật chính - bắt buộc), Level 2 (PM - tùy chọn), Level 3 (Lãnh đạo - tùy chọn) và **Import Excel dự án hàng loạt**. |
| **M3** | Két Thông tin Xác thực Site (Vault) | Lưu trữ tài khoản đăng nhập site dự án; mã hóa 2 chiều chuẩn **AES-256-GCM**; cơ chế xác thực bước hai (Re-Authentication), tự động che giấu mật khẩu sau 15 giây và **Import Excel hàng loạt**. |
| **LOG** | Nhật ký Kiểm toán (Audit Trail) | Ghi nhận bất biến 100% các thao tác nhạy cảm (đăng nhập, đổi quyền, mở mật khẩu site, import excel). |

---

## 🛠️ CÔNG NGHỆ CHÍNH THỨC (TECH STACK)

- **Framework:** **Fullstack Next.js (App Router, TypeScript)**
- **Styling:** **TailwindCSS + Lucide Icons + Shadcn UI**
- **Cơ sở dữ liệu:** **PostgreSQL 15+**
- **ORM:** **Prisma ORM**
- **Bảo mật & Phiên:** **NextAuth.js / JWT Session** (HttpOnly, Secure Cookies)
- **Mã hóa:** `aes-256-gcm` (Mật khẩu site) & `argon2` / `bcrypt` (Mật khẩu đăng nhập tool)

---

## 🛡️ NGUYÊN TẮC BẢO MẬT BẮT BUỘC KHI LẬP TRÌNH

1. **Mật khẩu đăng nhập Tool:** Mã hóa một chiều bằng **Argon2id** (hoặc `bcrypt` cost factor $\ge 12$).
2. **Mật khẩu Site Dự án trong Két:** Mã hóa đối xứng **AES-256-GCM**. Khóa Master Key (`APP_MASTER_ENCRYPTION_KEY`) bắt buộc đọc từ biến môi trường hệ điều hành, không commit vào repository hoặc lưu trong CSDL.
3. **API Danh sách:** Tuyệt đối không bao giờ trả về trường `password` trong các API lấy danh sách.
4. **Step-up Re-Authentication:** Để xem mật khẩu site, người dùng bắt buộc phải gửi kèm mật khẩu tài khoản tool để backend kiểm tra và giải mã, đồng thời sinh log `VAULT_REVEAL_PASSWORD`.
5. **Project-Level Vault Sharing:** Thành viên tham gia dự án (Level 1/2/3 hoặc có tài khoản trong dự án) được xem và mở mật khẩu của tất cả các tài khoản thuộc dự án đó; không được phép xem tài khoản của dự án khác.
