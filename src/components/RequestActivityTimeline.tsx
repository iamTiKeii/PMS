"use client";

import React, { useState } from "react";
import { SectionLoading } from "@/components/SectionLoading";
import {
  Clock,
  Calendar,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Edit3,
  Link2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  ArrowRight,
  ShieldAlert,
  Trash2,
} from "lucide-react";

export interface RequestActivity {
  id: string;
  requestId: string;
  eventCode: string;
  actorId?: string | null;
  actorName?: string | null;
  eventTime: string | Date;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  metadataJson?: string | null;
}

interface RequestActivityTimelineProps {
  activities?: RequestActivity[];
  isLoading?: boolean;
}

function formatActivityDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function RequestActivityTimeline({ activities = [], isLoading = false }: RequestActivityTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActivityConfig = (eventCode: string) => {
    switch (eventCode) {
      case "REQUEST_CREATED":
        return {
          icon: Sparkles,
          color: "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]",
          badge: "Tạo yêu cầu",
          badgeColor: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
        };
      case "REQUEST_ASSIGNED":
        return {
          icon: UserPlus,
          color: "text-[#2457A7] bg-[#E5EDFA] border-[#BFD4F7]",
          badge: "Phân công",
          badgeColor: "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]",
        };
      case "REQUEST_UNASSIGNED":
        return {
          icon: UserMinus,
          color: "text-[#64748B] bg-[#F1F3F6] border-[#DDE2E9]",
          badge: "Hủy theo dõi",
          badgeColor: "bg-[#F1F3F6] text-[#64748B] border-[#DDE2E9]",
        };
      case "REQUEST_STATUS_CHANGED":
        return {
          icon: ArrowRight,
          color: "text-[#2457A7] bg-[#E5EDFA] border-[#BFD4F7]",
          badge: "Trạng thái",
          badgeColor: "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]",
        };
      case "REQUEST_COMPLETED":
        return {
          icon: CheckCircle2,
          color: "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]",
          badge: "Hoàn thành",
          badgeColor: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
        };
      case "REQUEST_REOPENED":
        return {
          icon: RotateCcw,
          color: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
          badge: "Mở lại",
          badgeColor: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
        };
      case "REQUEST_DUE_DATE_CHANGED":
        return {
          icon: Calendar,
          color: "text-[#2457A7] bg-[#E5EDFA] border-[#BFD4F7]",
          badge: "Hạn xử lý",
          badgeColor: "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]",
        };
      case "REQUEST_JIRA_CHANGED":
        return {
          icon: Link2,
          color: "text-[#0284C7] bg-[#F0F9FF] border-[#BAE6FD]",
          badge: "Jira",
          badgeColor: "bg-[#F0F9FF] text-[#0284C7] border-[#BAE6FD]",
        };
      case "REQUEST_DUE_SOON":
        return {
          icon: Clock,
          color: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
          badge: "Sắp đến hạn",
          badgeColor: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
        };
      case "REQUEST_DUE_TODAY":
        return {
          icon: AlertCircle,
          color: "text-[#C2410C] bg-[#FFF7ED] border-[#FFEDD5]",
          badge: "Đến hạn hôm nay",
          badgeColor: "bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]",
        };
      case "REQUEST_OVERDUE":
        return {
          icon: AlertTriangle,
          color: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",
          badge: "Quá hạn",
          badgeColor: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
        };
      case "REQUEST_UPDATED":
        return {
          icon: Edit3,
          color: "text-[#2457A7] bg-[#E5EDFA] border-[#BFD4F7]",
          badge: "Cập nhật",
          badgeColor: "bg-[#E5EDFA] text-[#2457A7] border-[#BFD4F7]",
        };
      case "REQUEST_DELETED":
        return {
          icon: Trash2,
          color: "text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]",
          badge: "Xóa yêu cầu",
          badgeColor: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
        };
      default:
        return {
          icon: History,
          color: "text-[#64748B] bg-[#F1F3F6] border-[#DDE2E9]",
          badge: "Hoạt động",
          badgeColor: "bg-[#F1F3F6] text-[#64748B] border-[#DDE2E9]",
        };
    }
  };

  if (isLoading) {
    return <SectionLoading text="Đang tải lịch sử xử lý..." minHeight="120px" size="sm" />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="py-6 px-4 text-center rounded-md bg-[#F8FAFC] border border-[#DDE2E9] text-[#64748B] text-xs">
        <History className="w-5 h-5 text-[#94A3B8] mx-auto mb-1.5" />
        Chưa có lịch sử xử lý nào được ghi nhận cho yêu cầu này.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#2457A7]" />
          <span>Lịch sử xử lý ({activities.length})</span>
        </h4>
        <span className="text-[10px] text-[#94A3B8]">Mới nhất ở trên cùng</span>
      </div>

      <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE2E9]">
        {activities.map((item, idx) => {
          const cfg = getActivityConfig(item.eventCode);
          const Icon = cfg.icon;
          const isExpanded = Boolean(expandedIds[item.id]);

          let metadata = item.metadata;
          if (!metadata && item.metadataJson) {
            try {
              metadata = JSON.parse(item.metadataJson);
            } catch {}
          }

          const hasDetail =
            metadata &&
            (metadata.old_value !== undefined ||
              metadata.new_value !== undefined ||
              metadata.old_status !== undefined ||
              metadata.new_status !== undefined ||
              metadata.changes ||
              metadata.assignedStaff ||
              metadata.added_staff ||
              metadata.removed_staff ||
              metadata.days_overdue);

          return (
            <div key={item.id || idx} className="relative mb-3.5 last:mb-0 group">
              {/* Dot Icon on Vertical Line */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105 ${cfg.color}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              {/* Event Content Card */}
              <div className="p-3.5 rounded-md bg-white border border-[#DDE2E9] hover:border-[#CBD5E1] transition-colors text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#172033] text-xs">
                      {item.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${cfg.badgeColor}`}
                    >
                      {cfg.badge}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {formatActivityDate(item.eventTime)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                  <span>Người thực hiện:</span>
                  <span className="text-[#172033] font-medium">
                    {item.actorName || "Hệ thống"}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[#475569] text-xs leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Collapsible Details */}
                {hasDetail && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium py-0.5"
                    >
                      <span>{isExpanded ? "Ẩn chi tiết" : "Xem chi tiết thay đổi"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isExpanded && metadata && (
                      <div className="mt-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                        {/* Old / New Value diff */}
                        {(metadata.old_value !== undefined || metadata.new_value !== undefined) && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-white border border-slate-200">
                              <span className="text-[10px] uppercase tracking-wider text-rose-600 block font-bold mb-0.5">
                                Giá trị trước:
                              </span>
                              <span className="text-slate-700 font-mono">
                                {String(metadata.old_value || "(trống)")}
                              </span>
                            </div>
                            <div className="p-2 rounded bg-white border border-slate-200">
                              <span className="text-[10px] uppercase tracking-wider text-emerald-600 block font-bold mb-0.5">
                                Giá trị sau:
                              </span>
                              <span className="text-emerald-700 font-mono font-medium">
                                {String(metadata.new_value || "(trống)")}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Status Diff */}
                        {(metadata.old_status !== undefined || metadata.new_status !== undefined) && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Trạng thái:</span>
                            <span className="line-through text-slate-500">
                              {metadata.old_status}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-cyan-300">
                              {metadata.new_status}
                            </span>
                          </div>
                        )}

                        {/* Changes list */}
                        {metadata.changes && Array.isArray(metadata.changes) && (
                          <div>
                            <span className="text-slate-400 block mb-1">
                              Các trường thay đổi:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {metadata.changes.map((ch: string, cIdx: number) => (
                                <span
                                  key={cIdx}
                                  className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]"
                                >
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Added staff */}
                        {metadata.added_staff && Array.isArray(metadata.added_staff) && (
                          <div>
                            <span className="text-emerald-400 block mb-1">
                              Nhân sự được thêm theo dõi:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {metadata.added_staff.map((st: string, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]"
                                >
                                  + {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Removed staff */}
                        {metadata.removed_staff && Array.isArray(metadata.removed_staff) && (
                          <div>
                            <span className="text-rose-400 block mb-1">
                              Nhân sự ngừng theo dõi:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {metadata.removed_staff.map((st: string, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]"
                                >
                                  - {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
