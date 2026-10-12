"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  Puzzle,
  Download,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Laptop,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  FileCode,
  FolderCheck,
  Check,
} from "lucide-react";

export default function ExtensionInfoPage() {
  const extensionPath = "d:\\OutSource\\OutSource\\PMS\\extension";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Browser Extension: Ghi nhận Ca Hỗ trợ ISOFH"
        subtitle="Tiện ích mở rộng trên trình duyệt Google Chrome & Edge dành cho nhân sự kỹ thuật / vận hành ISOFH"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/support-tickets"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Danh sách ca</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Overview Card */}
        <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E5EDFA] text-[#2457A7] border border-[#C5D7F2]">
              <Sparkles className="w-3 h-3 text-[#2457A7]" />
              Phiên bản 1.0.0 — Manifest V3
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
              <Check className="w-3 h-3" /> Đồng bộ Hub 100%
            </span>
          </div>
          <h2 className="text-sm font-bold text-[#172033]">
            Ghi nhận trực tiếp · Tự động tính thời gian · Idempotency-Key chống trùng lặp
          </h2>
          <p className="text-[#64748B] text-xs leading-relaxed">
            Extension dùng chung toàn bộ tài khoản, quyền hạn, Master Data và RESTful API với Hub.
            Hỗ trợ ghi nhận timestamp chuẩn múi giờ Việt Nam, chống tạo trùng bằng Idempotency-Key và tự lưu bản nháp an toàn trong chrome.storage khi chập chờn mạng.
          </p>
        </div>

        {/* Hướng dẫn cài đặt nhanh */}
        <div className="bg-white rounded-md p-4 border border-[#DDE2E9] shadow-xs space-y-3.5">
          <h3 className="font-semibold text-[#172033] text-xs flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-[#2457A7]" />
            Hướng dẫn cài đặt Extension trên Google Chrome / Microsoft Edge
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1.5">
              <div className="w-5 h-5 rounded bg-[#2457A7] text-white font-bold flex items-center justify-center text-[11px]">
                1
              </div>
              <div className="font-semibold text-[#172033] text-xs">Mở trang Extensions</div>
              <p className="text-[#64748B] leading-relaxed text-[11px]">
                Truy cập địa chỉ <code className="px-1 py-0.5 rounded bg-white border border-[#DDE2E9] text-[#2457A7]">chrome://extensions</code> trên Chrome hoặc <code className="px-1 py-0.5 rounded bg-white border border-[#DDE2E9] text-[#2457A7]">edge://extensions</code> trên Edge.
              </p>
            </div>

            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1.5">
              <div className="w-5 h-5 rounded bg-[#2457A7] text-white font-bold flex items-center justify-center text-[11px]">
                2
              </div>
              <div className="font-semibold text-[#172033] text-xs">Bật Developer mode</div>
              <p className="text-[#64748B] leading-relaxed text-[11px]">
                Gạt nút <strong>&quot;Chế độ dành cho nhà phát triển&quot; (Developer mode)</strong> ở góc trên bên phải màn hình.
              </p>
            </div>

            <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1.5">
              <div className="w-5 h-5 rounded bg-[#2457A7] text-white font-bold flex items-center justify-center text-[11px]">
                3
              </div>
              <div className="font-semibold text-[#172033] text-xs">Tải tiện ích đã giải nén</div>
              <p className="text-[#64748B] leading-relaxed text-[11px]">
                Bấm <strong>&quot;Tải tiện ích đã giải nén&quot; (Load unpacked)</strong> và chọn thư mục:
              </p>
              <div className="p-1.5 rounded bg-white border border-[#DDE2E9] font-mono text-[11px] text-[#2457A7] break-all select-all">
                {extensionPath}
              </div>
            </div>
          </div>
        </div>

        {/* Bảng đối chiếu 14 chức năng đặc tả Extension (EXT-01 đến EXT-14) */}
        <div className="bg-white rounded-md border border-[#DDE2E9] shadow-xs overflow-hidden p-4 space-y-3">
          <h3 className="font-semibold text-[#172033] text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
            Tiêu chuẩn nghiệp vụ đã tích hợp đầy đủ (EXT-01 → EXT-14)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DDE2E9] bg-[#F8FAFC] uppercase tracking-wider text-[11px] text-[#64748B] font-semibold">
                  <th className="py-2 px-3">Mã</th>
                  <th className="py-2 px-3">Chức năng</th>
                  <th className="py-2 px-3">Mô tả chi tiết</th>
                  <th className="py-2 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5] text-xs">
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-01</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Đăng nhập Hub</td>
                  <td className="py-2 px-3 text-[#64748B]">Đăng nhập tài khoản PMS Hub, lưu token bảo mật và kiểm tra quyền RBAC.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-02</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Chọn dự án</td>
                  <td className="py-2 px-3 text-[#64748B]">Chỉ hiển thị các dự án người dùng được cấp quyền truy cập theo phạm vi dữ liệu.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-03</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Chọn ngày tra cứu</td>
                  <td className="py-2 px-3 text-[#64748B]">Chọn ngày để theo dõi và lọc ca phát sinh trong ngày làm việc.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-04</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Xem ca trong ngày</td>
                  <td className="py-2 px-3 text-[#64748B]">Hiển thị danh sách ca, mã ca, người yêu cầu, trạng thái và thời gian xử lý.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-05</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Tạo ca mới</td>
                  <td className="py-2 px-3 text-[#64748B]">Biểu mẫu ghi nhận đầy đủ người yêu cầu, nghiệp vụ, mô tả, mốc thời gian.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-06</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Lấy timestamp hiện tại</td>
                  <td className="py-2 px-3 text-[#64748B]">Nút lấy timestamp tức thì cho thời điểm gửi, tiếp nhận và hoàn thành.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-07</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Nhập tay timestamp</td>
                  <td className="py-2 px-3 text-[#64748B]">Cho phép điều chỉnh ngày giờ, backend kiểm tra thứ tự mốc thời gian hợp lệ.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-08</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Chọn tagging phương thức</td>
                  <td className="py-2 px-3 text-[#64748B]">Giao diện gắn tag cho phép chọn đồng thời nhiều phương thức (Zalo, Hotline, UltraViewer...).</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-09</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Lưu ca an toàn</td>
                  <td className="py-2 px-3 text-[#64748B]">Tự sinh mã Idempotency-Key chống trùng lặp dữ liệu khi mạng chập chờn.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-10</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Cập nhật ca</td>
                  <td className="py-2 px-3 text-[#64748B]">Mở ca hiện có và chỉnh sửa theo quyền; tự động tính lại thời lượng.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-11</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Hoàn thành ca</td>
                  <td className="py-2 px-3 text-[#64748B]">Bắt buộc nhập cách xử lý, ghi nhận thời điểm hoàn thành và tự xếp nhóm thời gian.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-12</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Chống mất dữ liệu (Bản nháp)</td>
                  <td className="py-2 px-3 text-[#64748B]">Lưu bản nháp trong chrome.storage khi có lỗi kết nối để người dùng khôi phục và thử lại.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-13</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Đồng bộ Master Data</td>
                  <td className="py-2 px-3 text-[#64748B]">Tải danh mục nghiệp vụ, phương thức, loại hỗ trợ mới nhất từ Hub qua 1 nút bấm.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-2 px-3 font-mono font-medium text-[#2457A7]">EXT-14</td>
                  <td className="py-2 px-3 font-semibold text-[#172033]">Mở chi tiết trên Hub</td>
                  <td className="py-2 px-3 text-[#64748B]">Mở tab trình duyệt dẫn thẳng đến trang chi tiết ca trên Hub để đối chiếu lịch sử.</td>
                  <td className="py-2 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                      <Check className="w-3 h-3" /> Hoàn thành
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
