"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  FileSpreadsheet,
  Users,
  Briefcase,
  Layers,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  MapPin,
  Building,
  Table as TableIcon,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface TypeMatrixRow {
  typeName: string;
  under15: number;
  to30: number;
  over30: number;
  empty: number;
  total: number;
}

export default function SupportReportsPage() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [hoveredBar, setHoveredBar] = useState<TypeMatrixRow | null>(null);

  const [filters, setFilters] = useState({
    regionId: "",
    projectId: "",
    fromDate: "",
    toDate: "",
  });

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.regionId && filters.regionId !== "all") params.set("regionId", filters.regionId);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);

      const res = await fetch(`/api/v1/support-reports/summary?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
        if (json.data.regions) {
          setRegions(json.data.regions);
        }
      } else {
        error(json.error?.message || "Không thể tải báo cáo");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi mạng khi tải báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load projects
    fetch("/api/v1/me/projects")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProjects(json.data || []);
      })
      .catch(console.error);

    loadReport();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport();
  };

  const handleReset = () => {
    setFilters({ regionId: "", projectId: "", fromDate: "", toDate: "" });
    setTimeout(loadReport, 10);
  };

  const summary = reportData?.summary || {
    totalTickets: 0,
    completedTickets: 0,
    inProgressTickets: 0,
    completionRate: 0,
    avgProcessingMinutes: 0,
    avgTotalMinutes: 0,
    avgWaitingMinutes: 0,
  };

  const businessReport = reportData?.businessReport || { rows: [], total: 0 };
  const hospitalStatusReport = reportData?.hospitalStatusReport || {
    rows: [],
    totals: { completed: 0, pending: 0, total: 0 },
  };
  const typeTimeGroupMatrix = reportData?.typeTimeGroupMatrix || {
    rows: [],
    totals: { under15: 0, to30: 0, over30: 0, empty: 0, total: 0 },
  };

  // Lọc danh sách dự án dropdown theo khu vực đã chọn
  const filteredProjects = filters.regionId && filters.regionId !== "all"
    ? projects.filter((p) => p.regionId === filters.regionId)
    : projects;

  // Tính giá trị lớn nhất cho trục Y của biểu đồ cột chồng
  const matrixRows: TypeMatrixRow[] = typeTimeGroupMatrix.rows || [];
  const maxCategoryTotal = Math.max(...matrixRows.map((r) => r.total), 10);
  // Làm tròn lên mốc 10 gần nhất (ví dụ: 67 -> 80)
  const chartYMax = Math.max(10, Math.ceil((maxCategoryTotal * 1.15) / 10) * 10);
  const chartYSteps = 4; // 0, 20, 40, 60, 80
  const yTicks = Array.from({ length: chartYSteps + 1 }, (_, i) => Math.round((chartYMax / chartYSteps) * i));

  // URL xuất Excel với đầy đủ tham số lọc
  const exportUrl = `/api/v1/support-reports/export?${new URLSearchParams({
    ...(filters.regionId && filters.regionId !== "all" ? { regionId: filters.regionId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
    ...(filters.toDate ? { toDate: filters.toDate } : {}),
  }).toString()}`;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Báo cáo & Thống kê Ca Hỗ trợ"
        subtitle="Mô hình tổng hợp Pivot Table theo Nghiệp vụ, Cơ sở y tế và Ma trận Phân loại x Nhóm thời gian"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/support-tickets"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Danh sách ca</span>
            </Link>
            <a
              href={exportUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
              title="Xuất dữ liệu ca hỗ trợ ra file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Xuất Excel</span>
            </a>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto">
        {/* Bộ lọc Thống kê */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-white rounded-md p-3.5 border border-[#DDE2E9] shadow-xs flex flex-wrap items-end gap-3"
        >
          {/* Lọc Khu vực */}
          <div className="min-w-[170px]">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#2457A7]" />
              <span>Phân loại Khu vực</span>
            </label>
            <select
              value={filters.regionId}
              onChange={(e) => {
                setFilters({ ...filters, regionId: e.target.value, projectId: "" });
              }}
              className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
            >
              <option value="all">Tất cả khu vực</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc CSYT / Dự án */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block mb-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-[#2457A7]" />
              <span>Cơ sở y tế (CSYT)</span>
            </label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
            >
              <option value="">Tất cả CSYT trong khu vực</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectCode}] {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block mb-1">Từ ngày (sentAt)</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#64748B] uppercase block mb-1">Đến ngày</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Xem thống kê</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-[#64748B] text-xs font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          </div>
        </form>

        {/* Thẻ chỉ số tổng quan (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase">Tổng số ca</div>
            <div className="text-xl font-bold text-[#172033] mt-1">{summary.totalTickets}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Tiếp nhận trong kỳ</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#15803D] uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Đã hoàn thành
            </div>
            <div className="text-xl font-bold text-[#15803D] mt-1">{summary.completedTickets}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Đã giải quyết xong</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#B45309] uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Đang xử lý
            </div>
            <div className="text-xl font-bold text-[#B45309] mt-1">{summary.inProgressTickets}</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Chưa chốt hoàn tất</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#2457A7] uppercase">Tỷ lệ xong</div>
            <div className="text-xl font-bold text-[#2457A7] mt-1">{summary.completionRate}%</div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Tỷ lệ giải quyết</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#2457A7] uppercase">T_xử_lý TB</div>
            <div className="text-xl font-bold text-[#172033] mt-1">
              {summary.avgProcessingMinutes} <span className="text-xs font-normal text-[#64748B]">phút</span>
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Thời gian thực xử lý</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase">T_tổng TB</div>
            <div className="text-xl font-bold text-[#172033] mt-1">
              {summary.avgTotalMinutes} <span className="text-xs font-normal text-[#64748B]">phút</span>
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Từ lúc gửi đến xong</div>
          </div>

          <div className="bg-white rounded-md p-3 border border-[#DDE2E9] shadow-xs">
            <div className="text-[11px] font-semibold text-[#64748B] uppercase">T_chờ TB</div>
            <div className="text-xl font-bold text-[#172033] mt-1">
              {summary.avgWaitingMinutes} <span className="text-xs font-normal text-[#64748B]">phút</span>
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Thời gian chờ nhận</div>
          </div>
        </div>

        {/* =========================================================================
            HÀNG 1: BẢNG 1 (Nghiệp vụ cần hỗ trợ) & BẢNG 2 (CSYT theo Trạng thái)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* BẢNG 1 (HÌNH 1): NGHIỆP VỤ CẦN HỖ TRỢ */}
          <div className="bg-white rounded-lg border border-[#DDE2E9] shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#2457A7]" />
                <h3 className="font-bold text-sm text-[#172033]">Báo cáo Nghiệp vụ cần hỗ trợ</h3>
              </div>
              <span className="text-xs text-[#64748B] font-medium">Hình 1</span>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#2F5597] text-white">
                    <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-left">
                      <div className="flex items-center justify-between">
                        <span>Nghiệp vụ cần hỗ trợ</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap">
                      Số lượng của Nghiệp vụ cần hỗ trợ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
                  {businessReport.rows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-[#64748B]">
                        Chưa có dữ liệu ca hỗ trợ trong kỳ này
                      </td>
                    </tr>
                  ) : (
                    businessReport.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2 px-3.5 border-r border-[#E2E8F0] font-normal">
                          {row.name}
                        </td>
                        <td className="py-2 px-3.5 text-right font-medium">
                          {row.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFFFFF] border-t-2 border-[#1E293B] text-[#172033] font-bold">
                    <td className="py-2.5 px-3.5 border-r border-[#E2E8F0]">
                      Tổng Cuối
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-sm font-mono">
                      {businessReport.total}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* BẢNG 2 (HÌNH 2): SỐ LƯỢNG CỦA TRẠNG THÁI THEO CSYT */}
          <div className="bg-white rounded-lg border border-[#DDE2E9] shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2457A7]" />
                <h3 className="font-bold text-sm text-[#172033]">Báo cáo CSYT theo Trạng thái</h3>
              </div>
              <span className="text-xs text-[#64748B] font-medium">Hình 2</span>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Dòng 1 Header chính */}
                  <tr className="bg-[#2F5597] text-white">
                    <th className="py-2 px-3.5 font-bold border border-[#244277] text-left">
                      Số lượng của Trạng thái
                    </th>
                    <th colSpan={3} className="py-2 px-3.5 font-bold border border-[#244277] text-left">
                      <div className="flex items-center gap-1">
                        <span>Trạng thái</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                      </div>
                    </th>
                  </tr>
                  {/* Dòng 2 Sub-header */}
                  <tr className="bg-[#2F5597] text-white">
                    <th className="py-2 px-3.5 font-bold border border-[#244277] text-left">
                      <div className="flex items-center justify-between">
                        <span>CSYT</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                      </div>
                    </th>
                    <th className="py-2 px-3.5 font-bold border border-[#244277] text-right">
                      Hoàn thành
                    </th>
                    <th className="py-2 px-3.5 font-bold border border-[#244277] text-right">
                      (trống)
                    </th>
                    <th className="py-2 px-3.5 font-bold border border-[#244277] text-right">
                      Tổng Cuối
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
                  {hospitalStatusReport.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#64748B]">
                        Chưa có dữ liệu ca hỗ trợ theo CSYT
                      </td>
                    </tr>
                  ) : (
                    hospitalStatusReport.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2 px-3.5 border-r border-[#E2E8F0] font-normal" title={row.fullName}>
                          {row.csyt}
                        </td>
                        <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                          {row.completed || ""}
                        </td>
                        <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                          {row.pending || ""}
                        </td>
                        <td className="py-2 px-3.5 text-right font-semibold">
                          {row.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFFFFF] border-t-2 border-[#1E293B] text-[#172033] font-bold">
                    <td className="py-2.5 px-3.5 border-r border-[#E2E8F0]">
                      Tổng Cuối
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono">
                      {hospitalStatusReport.totals.completed}
                    </td>
                    <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono">
                      {hospitalStatusReport.totals.pending}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-sm font-mono text-[#2457A7]">
                      {hospitalStatusReport.totals.total}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* =========================================================================
            HÀNG 2: BẢNG 3 (Ma trận Phân loại hỗ trợ x Nhóm Thời gian) (Hình 3)
            ========================================================================= */}
        <div className="bg-white rounded-lg border border-[#DDE2E9] shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2457A7]" />
              <h3 className="font-bold text-sm text-[#172033]">
                Ma trận Số lượng theo Nhóm Thời gian xử lý & Phân loại hỗ trợ
              </h3>
            </div>
            <span className="text-xs text-[#64748B] font-medium">Hình 3</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Header Dòng 1 */}
                <tr className="bg-[#2F5597] text-white">
                  <th className="py-2 px-3.5 font-bold border border-[#244277]">
                    Số lượng của Nhóm Thời gian
                  </th>
                  <th colSpan={4} className="py-2 px-3.5 font-bold border border-[#244277] text-left">
                    <div className="flex items-center gap-1">
                      <span>Nhóm Thời gian</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </div>
                  </th>
                  <th className="py-2 px-3.5 font-bold border border-[#244277] text-right"></th>
                </tr>
                {/* Header Dòng 2 */}
                <tr className="bg-[#2F5597] text-white">
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-left">
                    <div className="flex items-center justify-between">
                      <span>Phân loại hỗ trợ</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap min-w-[100px]">
                    &lt;15p xử lý
                  </th>
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap min-w-[100px]">
                    &lt;30p xử lý
                  </th>
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap min-w-[100px]">
                    &gt;30p xử lý
                  </th>
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap min-w-[80px]">
                    (trống)
                  </th>
                  <th className="py-2.5 px-3.5 font-bold border border-[#244277] text-right whitespace-nowrap min-w-[90px]">
                    Tổng Cuối
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
                {typeTimeGroupMatrix.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#64748B]">
                      Chưa có dữ liệu ma trận thời gian
                    </td>
                  </tr>
                ) : (
                  typeTimeGroupMatrix.rows.map((row: TypeMatrixRow, idx: number) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2 px-3.5 border-r border-[#E2E8F0] font-normal">
                        {row.typeName}
                      </td>
                      <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                        {row.under15 || ""}
                      </td>
                      <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                        {row.to30 || ""}
                      </td>
                      <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                        {row.over30 || ""}
                      </td>
                      <td className="py-2 px-3.5 border-r border-[#E2E8F0] text-right font-medium">
                        {row.empty || ""}
                      </td>
                      <td className="py-2 px-3.5 text-right font-semibold">
                        {row.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#FFFFFF] border-t-2 border-[#1E293B] text-[#172033] font-bold">
                  <td className="py-2.5 px-3.5 border-r border-[#E2E8F0]">
                    Tổng Cuối
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono text-[#2563EB]">
                    {typeTimeGroupMatrix.totals.under15}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono text-[#EA580C]">
                    {typeTimeGroupMatrix.totals.to30}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono text-[#64748B]">
                    {typeTimeGroupMatrix.totals.over30}
                  </td>
                  <td className="py-2.5 px-3.5 border-r border-[#E2E8F0] text-right font-bold text-sm font-mono text-[#CA8A04]">
                    {typeTimeGroupMatrix.totals.empty}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-bold text-sm font-mono text-[#1E293B]">
                    {typeTimeGroupMatrix.totals.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================================================================
            HÀNG 3: BIỂU ĐỒ CỘT CHỒNG (STACKED BAR CHART) (Hình 4)
            ========================================================================= */}
        <div className="bg-white rounded-lg border border-[#DDE2E9] shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDF1F5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2457A7]" />
                <h3 className="font-bold text-sm text-[#172033]">
                  Biểu đồ Phân loại hỗ trợ theo Nhóm thời gian xử lý (Stacked Column)
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Cột chồng biểu thị tỷ trọng các ngưỡng thời gian xử lý theo từng loại công việc
              </p>
            </div>
            <span className="text-xs text-[#64748B] font-medium shrink-0">Hình 4</span>
          </div>

          {matrixRows.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] text-xs">
              Chưa có dữ liệu để hiển thị biểu đồ
            </div>
          ) : (
            <div className="w-full space-y-3">
              {/* Vùng vẽ biểu đồ Stacked Column Chart chuẩn Excel */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[760px] select-none">
                  {/* Khu vực đồ thị chính (Plot Area) */}
                  <div className="h-[270px] relative">
                    {/* Đường gióng ngang (Grid lines) và Trục Y */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pl-8 pr-4">
                      {yTicks.slice().reverse().map((tick) => (
                        <div key={tick} className="w-full flex items-center gap-2">
                          <span className="text-[11px] font-mono text-[#64748B] w-6 text-right shrink-0">
                            {tick}
                          </span>
                          <div className="flex-1 border-b border-[#E2E8F0]" />
                        </div>
                      ))}
                    </div>

                    {/* Các cột dữ liệu Stacked */}
                    <div className="h-[270px] flex items-end justify-around pl-16 pr-6 relative z-10">
                      {matrixRows.map((row, idx) => {
                        const plotH = 270;
                        const hUnder15 = Math.round((row.under15 / chartYMax) * plotH);
                        const hTo30 = Math.round((row.to30 / chartYMax) * plotH);
                        const hOver30 = Math.round((row.over30 / chartYMax) * plotH);
                        const hEmpty = Math.round((row.empty / chartYMax) * plotH);

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative max-w-[58px] mx-1"
                            onMouseEnter={() => setHoveredBar(row)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            {/* Tooltip khi hover */}
                            {hoveredBar?.typeName === row.typeName && (
                              <div className="absolute bottom-[104%] z-30 p-2.5 rounded-md bg-[#172033] text-white text-[11px] shadow-lg whitespace-nowrap pointer-events-none">
                                <div className="font-bold border-b border-white/20 pb-1 mb-1">
                                  {row.typeName}
                                </div>
                                <div className="space-y-0.5 font-mono">
                                  <div className="text-[#93C5FD]">
                                    &lt;15p xử lý: <span className="font-bold">{row.under15}</span> ca
                                  </div>
                                  <div className="text-[#FDBA74]">
                                    &lt;30p xử lý: <span className="font-bold">{row.to30}</span> ca
                                  </div>
                                  <div className="text-[#CBD5E1]">
                                    &gt;30p xử lý: <span className="font-bold">{row.over30}</span> ca
                                  </div>
                                  {row.empty > 0 && (
                                    <div className="text-[#FDE047]">
                                      (trống): <span className="font-bold">{row.empty}</span> ca
                                    </div>
                                  )}
                                  <div className="border-t border-white/20 pt-1 mt-1 font-bold text-white flex justify-between gap-3">
                                    <span>Tổng cộng:</span>
                                    <span>{row.total} ca</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cột chồng: Xếp từ dưới lên (Dưới: Xanh <15p, Giữa: Cam <30p, Trên: Xám >30p, Đỉnh: Vàng (trống)) */}
                            <div className="w-full flex flex-col justify-end overflow-hidden transition-all duration-200 group-hover:brightness-95 group-hover:scale-x-105">
                              {/* Khối (trống) - Vàng Excel (#FFC000) */}
                              {row.empty > 0 && (
                                <div
                                  style={{ height: `${hEmpty}px` }}
                                  className="bg-[#FFC000] w-full"
                                  title={`(trống): ${row.empty}`}
                                />
                              )}
                              {/* Khối >30p - Xám Excel (#A5A5A5) */}
                              {row.over30 > 0 && (
                                <div
                                  style={{ height: `${hOver30}px` }}
                                  className="bg-[#A5A5A5] w-full"
                                  title={`>30p xử lý: ${row.over30}`}
                                />
                              )}
                              {/* Khối <30p - Cam Excel (#ED7D31) */}
                              {row.to30 > 0 && (
                                <div
                                  style={{ height: `${hTo30}px` }}
                                  className="bg-[#ED7D31] w-full"
                                  title={`<30p xử lý: ${row.to30}`}
                                />
                              )}
                              {/* Khối <15p - Xanh Excel (#4472C4) */}
                              {row.under15 > 0 && (
                                <div
                                  style={{ height: `${hUnder15}px` }}
                                  className="bg-[#4472C4] w-full"
                                  title={`<15p xử lý: ${row.under15}`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trục hoành X Border Line */}
                  <div className="pl-16 pr-6">
                    <div className="border-b border-[#94A3B8] w-full" />
                  </div>

                  {/* Nhãn trục hoành (X-Axis Labels) */}
                  <div className="flex justify-around pl-16 pr-6 pt-2 min-h-[60px]">
                    {matrixRows.map((row, idx) => (
                      <div key={idx} className="flex-1 max-w-[80px] mx-1 text-center">
                        <span
                          className="text-[11px] text-[#334155] font-normal leading-tight line-clamp-3 block"
                          title={row.typeName}
                        >
                          {row.typeName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chú thích màu sắc (Legend) đúng màu Excel */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-[#EDF1F5] flex-wrap text-xs text-[#172033] font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-[#4472C4] inline-block" />
                  <span>&lt;15p xử lý</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-[#ED7D31] inline-block" />
                  <span>&lt;30p xử lý</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-[#A5A5A5] inline-block" />
                  <span>&gt;30p xử lý</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-[#FFC000] inline-block" />
                  <span>(trống)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
