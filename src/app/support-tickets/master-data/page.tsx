"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import {
  Sliders,
  Plus,
  ArrowLeft,
  Check,
  X,
  Clock,
  Briefcase,
  Layers,
  Tag,
  Edit2,
  Power,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { useToast } from "@/components/Toast";

type MasterDataType = "business" | "method" | "type" | "time_group" | "region";

export default function SupportMasterDataPage() {
  const { success, error, warning } = useToast();
  const [activeTab, setActiveTab] = useState<MasterDataType>("business");
  const [loading, setLoading] = useState(true);

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [timeGroups, setTimeGroups] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);

  // Modal thêm mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addSortOrder, setAddSortOrder] = useState(0);
  const [addMinSec, setAddMinSec] = useState(0);
  const [addMaxSec, setAddMaxSec] = useState<string>("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal sửa
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editMinSec, setEditMinSec] = useState(0);
  const [editMaxSec, setEditMaxSec] = useState<string>("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/master-data/support");
      const json = await res.json();
      if (json.success) {
        setBusinesses(json.data.businesses || []);
        setMethods(json.data.methods || []);
        setTypes(json.data.types || []);
        setTimeGroups(json.data.timeGroups || []);
        setRegions(json.data.regions || []);
      } else {
        error(json.error?.message || "Không thể tải Master Data");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi tải Master Data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const handleOpenAdd = () => {
    setAddCode("");
    setAddName("");
    setAddSortOrder(0);
    setAddMinSec(0);
    setAddMaxSec("");
    setShowAddModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim() || !addName.trim()) return warning("Vui lòng nhập mã và tên");

    setSubmittingAdd(true);
    try {
      const payload: any = {
        code: addCode.trim().toUpperCase(),
        name: addName.trim(),
        sortOrder: addSortOrder,
      };

      if (activeTab === "time_group") {
        payload.minSeconds = addMinSec;
        payload.maxSeconds = addMaxSec ? parseInt(addMaxSec, 10) : null;
      }

      const res = await fetch("/api/v1/admin/support-master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, data: payload }),
      });

      const json = await res.json();
      if (json.success) {
        success("Đã thêm mới danh mục thành công!");
        setShowAddModal(false);
        loadMasterData();
      } else {
        error(json.error?.message || "Thêm mới danh mục thất bại");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi mạng khi tạo danh mục");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditSortOrder(item.sortOrder || 0);
    setEditMinSec(item.minSeconds || 0);
    setEditMaxSec(item.maxSeconds !== null && item.maxSeconds !== undefined ? String(item.maxSeconds) : "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSubmittingEdit(true);
    try {
      const payload: any = {
        name: editName.trim(),
        sortOrder: editSortOrder,
      };

      if (activeTab === "time_group") {
        payload.minSeconds = editMinSec;
        payload.maxSeconds = editMaxSec ? parseInt(editMaxSec, 10) : null;
      }

      const res = await fetch(`/api/v1/admin/support-master-data/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, data: payload }),
      });

      const json = await res.json();
      if (json.success) {
        success("Cập nhật danh mục thành công!");
        setEditingItem(null);
        loadMasterData();
      } else {
        error(json.error?.message || "Cập nhật danh mục thất bại");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi khi cập nhật danh mục");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (item: any) => {
    try {
      const res = await fetch(`/api/v1/admin/support-master-data/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, data: { isActive: !item.isActive } }),
      });
      const json = await res.json();
      if (json.success) {
        success(item.isActive ? "Đã tạm dừng sử dụng danh mục" : "Đã kích hoạt lại danh mục");
        loadMasterData();
      } else {
        error(json.error?.message || "Không thể thay đổi trạng thái");
      }
    } catch (err) {
      console.error(err);
      error("Lỗi thao tác");
    }
  };

  const getCurrentList = () => {
    if (activeTab === "business") return businesses;
    if (activeTab === "method") return methods;
    if (activeTab === "type") return types;
    if (activeTab === "time_group") return timeGroups;
    return regions;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F1F3F6] min-h-screen">
      <Header
        title="Quản trị Master Data Ca Hỗ trợ"
        subtitle="Cấu hình danh mục nghiệp vụ, phương thức, loại hỗ trợ và ngưỡng thời gian phân nhóm đồng bộ cho Hub và Browser Extension"
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/support-tickets"
              className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#172033] font-medium text-xs flex items-center gap-1.5 transition-colors border border-[#DDE2E9] shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Danh sách ca</span>
            </Link>
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm danh mục mới</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl w-full mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#DDE2E9] text-xs">
          <button
            onClick={() => setActiveTab("business")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "business"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Nghiệp vụ ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab("method")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "method"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Phương thức hỗ trợ ({methods.length})
          </button>
          <button
            onClick={() => setActiveTab("type")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "type"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Loại công việc hỗ trợ ({types.length})
          </button>
          <button
            onClick={() => setActiveTab("time_group")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "time_group"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Ngưỡng phân nhóm thời gian ({timeGroups.length})
          </button>
          <button
            onClick={() => setActiveTab("region")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "region"
                ? "border-[#2457A7] text-[#2457A7]"
                : "border-transparent text-[#64748B] hover:text-[#172033]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Phân loại Khu vực ({regions.length})
          </button>
        </div>

        {/* Table list */}
        <div className="bg-white rounded-md border border-[#DDE2E9] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DDE2E9] text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
                  <th className="py-2.5 px-3.5">Mã</th>
                  <th className="py-2.5 px-3.5">Tên hiển thị</th>
                  {activeTab === "time_group" && <th className="py-2.5 px-3.5">Ngưỡng (giây / phút)</th>}
                  <th className="py-2.5 px-3.5 text-center">Thứ tự</th>
                  <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#2457A7] border-t-transparent mb-2"></div>
                      <div>Đang tải danh mục...</div>
                    </td>
                  </tr>
                ) : getCurrentList().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748B]">
                      Chưa có danh mục nào.
                    </td>
                  </tr>
                ) : (
                  getCurrentList().map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium text-[#2457A7]">
                        {item.code}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-[#172033]">{item.name}</td>
                      {activeTab === "time_group" && (
                        <td className="py-2.5 px-3.5 font-mono text-[#64748B]">
                          {item.minSeconds}s ({Math.round(item.minSeconds / 60)}p) →{" "}
                          {item.maxSeconds ? `${item.maxSeconds}s (${Math.round(item.maxSeconds / 60)}p)` : "∞"}
                        </td>
                      )}
                      <td className="py-2.5 px-3.5 text-center font-mono text-[#64748B]">{item.sortOrder}</td>
                      <td className="py-2.5 px-3.5 text-center">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                            <Check className="w-3 h-3" /> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F3F6] text-[#64748B] border border-[#DDE2E9]">
                            <X className="w-3 h-3" /> Ngừng dùng
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded hover:bg-[#E5EDFA] text-[#2457A7] transition-colors"
                          title="Sửa danh mục"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`p-1 rounded transition-colors ${
                            item.isActive
                              ? "hover:bg-[#FEF2F2] text-[#B91C1C]"
                              : "hover:bg-[#F0FDF4] text-[#15803D]"
                          }`}
                          title={item.isActive ? "Ngừng dùng" : "Kích hoạt lại"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Thêm Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-sm">
              Thêm mới danh mục ({activeTab})
            </h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Mã code (viết hoa, không dấu) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: KCB, ZALO, HDSD..."
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs uppercase font-mono text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Tên hiển thị *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Khám chữa bệnh..."
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              {activeTab === "time_group" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Giới hạn dưới (giây)</label>
                    <input
                      type="number"
                      value={addMinSec}
                      onChange={(e) => setAddMinSec(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Giới hạn trên (giây, để trống = ∞)</label>
                    <input
                      type="number"
                      value={addMaxSec}
                      onChange={(e) => setAddMaxSec(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Thứ tự sắp xếp</label>
                <input
                  type="number"
                  value={addSortOrder}
                  onChange={(e) => setAddSortOrder(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white font-medium text-xs shadow-xs"
                >
                  {submittingAdd ? "Đang lưu..." : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-[#DDE2E9] p-5 space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-sm">
              Sửa danh mục: <span className="font-mono text-[#2457A7]">{editingItem.code}</span>
            </h3>
            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Tên hiển thị *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] bg-white text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              {activeTab === "time_group" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Giới hạn dưới (giây)</label>
                    <input
                      type="number"
                      value={editMinSec}
                      onChange={(e) => setEditMinSec(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Giới hạn trên (giây)</label>
                    <input
                      type="number"
                      value={editMaxSec}
                      onChange={(e) => setEditMaxSec(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold block mb-1 text-[11px] text-[#172033]">Thứ tự sắp xếp</label>
                <input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#DDE2E9] text-xs text-[#172033] focus:outline-none focus:border-[#2457A7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF1F5]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-md border border-[#DDE2E9] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-1.5 rounded-md bg-[#2457A7] hover:bg-[#1C4585] text-white font-medium text-xs shadow-xs"
                >
                  {submittingEdit ? "Đang lưu..." : "Cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
