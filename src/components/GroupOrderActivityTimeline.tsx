"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Lock,
  PlusCircle,
  Edit3,
  Trash2,
  DollarSign,
  QrCode,
  Send,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface GroupOrderActivityItem {
  id: string;
  groupOrderId: string;
  eventCode: string;
  actorId?: string | null;
  actorName?: string | null;
  eventTime: string | Date;
  title: string;
  description?: string | null;
  metadataJson?: string | null;
}

interface GroupOrderActivityTimelineProps {
  activities?: GroupOrderActivityItem[];
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

export function GroupOrderActivityTimeline({
  activities = [],
  isLoading = false,
}: GroupOrderActivityTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActivityConfig = (eventCode: string) => {
    switch (eventCode) {
      case "GROUP_ORDER_CREATED":
        return {
          icon: Sparkles,
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
          badge: "Tạo đơn",
          badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        };
      case "GROUP_ORDER_ITEM_ADDED":
        return {
          icon: PlusCircle,
          color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
          badge: "Thêm món",
          badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        };
      case "GROUP_ORDER_ITEM_UPDATED":
        return {
          icon: Edit3,
          color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
          badge: "Sửa món",
          badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        };
      case "GROUP_ORDER_ITEM_REMOVED":
        return {
          icon: Trash2,
          color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
          badge: "Xóa món",
          badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        };
      case "GROUP_ORDER_CLOSED":
        return {
          icon: Lock,
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
          badge: "Đóng đơn",
          badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        };
      case "GROUP_ORDER_PRICE_UPDATED":
        return {
          icon: DollarSign,
          color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
          badge: "Lưu giá",
          badgeColor: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
        };
      case "GROUP_ORDER_PAYMENT_REMINDER_SENT":
        return {
          icon: Send,
          color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
          badge: "Nhắc Telegram",
          badgeColor: "bg-sky-500/10 text-sky-300 border-sky-500/20",
        };
      case "GROUP_ORDER_MEMBER_PAID":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
          badge: "Đã trả tiền",
          badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        };
      case "GROUP_ORDER_MEMBER_UNPAID":
        return {
          icon: Clock,
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
          badge: "Chưa trả tiền",
          badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        };
      case "GROUP_ORDER_COMPLETED":
        return {
          icon: CheckCircle2,
          color: "text-teal-400 bg-teal-500/15 border-teal-500/30",
          badge: "Hoàn tất đơn",
          badgeColor: "bg-teal-500/10 text-teal-300 border-teal-500/20",
        };
      default:
        return {
          icon: History,
          color: "text-slate-400 bg-slate-500/15 border-slate-500/30",
          badge: "Hoạt động",
          badgeColor: "bg-slate-500/10 text-slate-300 border-slate-500/20",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs">
        Đang tải lịch sử hoạt động đơn hàng...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="py-6 px-4 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
        <History className="w-5 h-5 text-slate-600 mx-auto mb-1.5" />
        Chưa có hoạt động nào được ghi nhận cho đơn này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-blue-400" />
          <span>Lịch sử đơn ({activities.length})</span>
        </h4>
        <span className="text-[10px] text-slate-500">Mới nhất ở trên cùng</span>
      </div>

      <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {activities.map((item, idx) => {
          const cfg = getActivityConfig(item.eventCode);
          const Icon = cfg.icon;
          const isExpanded = Boolean(expandedIds[item.id]);

          let metadata: any = null;
          if (item.metadataJson) {
            try {
              metadata = JSON.parse(item.metadataJson);
            } catch {}
          }

          return (
            <div key={item.id || idx} className="relative mb-4 last:mb-0 group">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center border shadow-md transition-transform group-hover:scale-110 ${cfg.color}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              {/* Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700/80 transition-all text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">
                      {item.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${cfg.badgeColor}`}
                    >
                      {cfg.badge}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatActivityDate(item.eventTime)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Người thực hiện:</span>
                  <span className="text-slate-200 font-medium">
                    {item.actorName || "Hệ thống"}
                  </span>
                </div>

                {item.description && (
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {item.description}
                  </p>
                )}

                {metadata && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium py-0.5"
                    >
                      <span>{isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300 overflow-x-auto">
                        <pre className="text-[10px] text-slate-300 whitespace-pre-wrap">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
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
