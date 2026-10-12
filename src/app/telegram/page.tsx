"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useToast } from "@/components/Toast";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  HelpCircle,
  Activity,
  Check,
  X,
  Bell,
  Settings,
  Calendar,
  Play,
  FileText,
  Users2,
  Lock,
} from "lucide-react";
import { formatDateTimeVN } from "@/lib/notifications";
import { useLoading } from "@/components/LoadingProvider";
import { ActionButton } from "@/components/ActionButton";
import { TelegramConfigSkeleton } from "@/components/Skeleton";

export default function TelegramAndNotificationConfigPage() {
  const { success, error } = useToast();
  const { withLoading } = useLoading();

  const [activeTab, setActiveTab] = useState<"telegram" | "settings">("telegram");
  const [loading, setLoading] = useState(true);

  // Tab 1: Telegram Config State (13.9)
  const [botName, setBotName] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [botToken, setBotToken] = useState("");
  const [tokenPreview, setTokenPreview] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [chatId, setChatId] = useState("");
  const [chatName, setChatName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [lastTestAt, setLastTestAt] = useState<string | null>(null);
  const [lastTestStatus, setLastTestStatus] = useState<string | null>(null);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Tab 2: Notification Event Matrix State (13.10, 13.14)
  const [eventSettings, setEventSettings] = useState<any[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);

  // Reminders specifics (13.5, 13.7)
  const [remindDays, setRemindDays] = useState(1);
  const [morningTime, setMorningTime] = useState("07:50");
  const [eveningTime, setEveningTime] = useState("17:35");
  const [skipWeekends, setSkipWeekends] = useState(true);

  // Fetch Telegram Config
  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch("/api/telegram/config");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const d = json.data;
        setBotName(d.botName || "");
        setBotUsername(d.botUsername || "");
        setTokenPreview(d.tokenPreview || "");
        setChatId(d.chatId || "");
        setChatName(d.chatName || "");
        setEnabled(Boolean(d.enabled));
        setLastTestAt(d.lastTestAt || null);
        setLastTestStatus(d.lastTestStatus || null);
      }
    } catch {
      error("Lỗi tải cấu hình Telegram.");
    }
  };

  // Fetch Deliveries
  const fetchDeliveries = async () => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch("/api/telegram/deliveries?limit=15");
      const json = await res.json();
      if (res.ok && json.success) {
        setDeliveries(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDeliveries(false);
    }
  };

  // Fetch Notification Settings Matrix
  const fetchNotificationSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/notifications/settings");
      const json = await res.json();
      if (res.ok && json.success) {
        setEventSettings(json.data || []);

        // Load specific fields
        const dueSoon = json.data?.find((e: any) => e.eventCode === "REQUEST_DUE_SOON");
        if (dueSoon && dueSoon.remindBeforeDays) setRemindDays(dueSoon.remindBeforeDays);

        const morning = json.data?.find((e: any) => e.eventCode === "ATTENDANCE_MORNING");
        if (morning && morning.scheduleTime) setMorningTime(morning.scheduleTime);
        if (morning && morning.skipWeekends !== undefined) setSkipWeekends(morning.skipWeekends);

        const evening = json.data?.find((e: any) => e.eventCode === "ATTENDANCE_EVENING");
        if (evening && evening.scheduleTime) setEveningTime(evening.scheduleTime);
      }
    } catch {
      error("Lỗi tải cấu hình thông báo.");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchTelegramConfig(), fetchDeliveries(), fetchNotificationSettings()]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Save Telegram Config
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      error("Vui lòng nhập Chat ID của nhóm Telegram.");
      return;
    }

    if (!tokenPreview && !botToken.trim()) {
      error("Vui lòng nhập Bot Token.");
      return;
    }

    setSavingTelegram(true);
    await withLoading(
      "save-telegram",
      "Đang lưu cấu hình Telegram Bot...",
      async () => {
        try {
          const res = await fetch("/api/telegram/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              botName: botName.trim(),
              botUsername: botUsername.trim(),
              botToken: botToken.trim() || undefined,
              chatId: chatId.trim(),
              chatName: chatName.trim(),
              enabled,
            }),
          });

          const json = await res.json();
          if (res.ok && json.success) {
            success("Đã lưu cấu hình Telegram thành công!");
            setBotToken("");
            fetchTelegramConfig();
          } else {
            error(json.error?.message || "Lỗi lưu cấu hình.");
          }
        } catch {
          error("Lỗi kết nối máy chủ.");
        } finally {
          setSavingTelegram(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Test Telegram Connection
  const handleTestConnection = async () => {
    if (!chatId.trim()) {
      error("Vui lòng nhập Chat ID để kiểm tra.");
      return;
    }

    setTestingTelegram(true);
    await withLoading(
      "test-telegram",
      "Đang kết nối & gửi thông báo thử nghiệm tới Telegram...",
      async () => {
        try {
          const res = await fetch("/api/telegram/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              botToken: botToken.trim() || undefined,
              chatId: chatId.trim(),
            }),
          });

          const json = await res.json();
          if (res.ok && json.success) {
            success("Kiểm tra kết nối Telegram thành công! Bot đã gửi tin nhắn thử nghiệm tới nhóm.");
            fetchTelegramConfig();
            fetchDeliveries();
          } else {
            error(json.error?.message || "Kết nối thất bại.");
          }
        } catch {
          error("Lỗi kết nối đến Telegram.");
        } finally {
          setTestingTelegram(false);
        }
      },
      { minDuration: 400 }
    );
  };

  // Toggle Checkbox in Matrix
  const handleToggleEvent = (eventCode: string, channel: "feed" | "telegram") => {
    setEventSettings((prev) =>
      prev.map((evt) => {
        if (evt.eventCode === eventCode) {
          if (channel === "feed") return { ...evt, feedEnabled: !evt.feedEnabled };
          if (channel === "telegram") return { ...evt, telegramEnabled: !evt.telegramEnabled };
        }
        return evt;
      })
    );
  };

  // Save Event Settings Matrix
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await withLoading(
      "save-notif-settings",
      "Đang lưu ma trận cấu hình thông báo...",
      async () => {
        try {
          // Merge specialized fields
          const payload = eventSettings.map((evt) => {
            const item = { ...evt };
            if (evt.eventCode === "REQUEST_DUE_SOON") {
              item.remindBeforeDays = Number(remindDays);
            }
            if (evt.eventCode === "ATTENDANCE_MORNING") {
              item.scheduleTime = morningTime;
              item.skipWeekends = skipWeekends;
            }
            if (evt.eventCode === "ATTENDANCE_EVENING") {
              item.scheduleTime = eveningTime;
              item.skipWeekends = skipWeekends;
            }
            return item;
          });

          const res = await fetch("/api/notifications/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings: payload }),
          });

          const json = await res.json();
          if (res.ok && json.success) {
            success(json.message || "Đã lưu ma trận cấu hình thông báo thành công!");
            fetchNotificationSettings();
          } else {
            error(json.error?.message || "Lỗi lưu cấu hình thông báo.");
          }
        } catch {
          error("Lỗi kết nối máy chủ.");
        } finally {
          setSavingSettings(false);
        }
      },
      { minDuration: 300 }
    );
  };

  // Manual trigger check reminders
  const handleRunRemindersNow = async () => {
    setRunningReminders(true);
    await withLoading(
      "run-reminders",
      "Đang quét kiểm tra nhắc việc QLYC & chấm công...",
      async () => {
        try {
          const res = await fetch("/api/notifications/reminders/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "all" }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            success("Đã hoàn tất quét kiểm tra nhắc việc QLYC & chấm công!");
            fetchDeliveries();
          } else {
            error(json.error?.message || "Lỗi khi quét thông báo.");
          }
        } catch {
          error("Lỗi hệ thống khi quét nhắc việc.");
        } finally {
          setRunningReminders(false);
        }
      },
      { minDuration: 300 }
    );
  };

  const categories = [
    { id: "REQUEST", label: "Quản lý Yêu cầu (QLYC)" },
    { id: "REMINDER", label: "Nhắc hạn & Nhắc việc" },
    { id: "ATTENDANCE", label: "Nhắc Chấm công" },
    { id: "PROJECT", label: "Quản lý Dự án" },
    { id: "STAFF", label: "Nhân sự & Tài khoản" },
    { id: "SYS", label: "Hệ thống & Bảo mật" },
  ];

  return (
    <div className="min-h-screen bg-[#F1F3F6] text-[#172033] flex flex-col">
      <Header
        title="Quản lý Thông báo & Tích hợp Telegram (M6)"
        subtitle="Cấu hình truyền phát thông báo tập trung trên Feed và phân phối tin tức tức thời tới Telegram Group"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#DDE2E9] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("telegram")}
            className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "telegram"
                ? "bg-[#2457A7] text-white shadow-xs"
                : "bg-white text-[#64748B] border border-[#DDE2E9] hover:bg-[#F8FAFC] hover:text-[#172033]"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Cài đặt Telegram Bot (13.9)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "settings"
                ? "bg-[#2457A7] text-white shadow-xs"
                : "bg-white text-[#64748B] border border-[#DDE2E9] hover:bg-[#F8FAFC] hover:text-[#172033]"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Ma trận Cấu hình Thông báo (13.10)</span>
          </button>
        </div>

        {loading ? (
          <TelegramConfigSkeleton />
        ) : (
          <>
            {/* TAB 1: CẤU HÌNH TELEGRAM BOT (13.9) */}
            {activeTab === "telegram" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-[#EDF1F5]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center shrink-0">
                          <Send className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#172033]">Kết nối Telegram Bot</h2>
                          <p className="text-xs text-[#64748B]">Gửi thông báo tự động tới nhóm làm việc</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            enabled && lastTestStatus === "success"
                              ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                              : enabled
                              ? "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]"
                              : "bg-[#F8FAFC] text-[#64748B] border-[#DDE2E9]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              enabled && lastTestStatus === "success"
                                ? "bg-[#15803D]"
                                : enabled
                                ? "bg-[#B45309]"
                                : "bg-slate-400"
                            }`}
                          />
                          {enabled && lastTestStatus === "success"
                            ? "Đang kết nối"
                            : enabled
                            ? "Chưa kiểm tra"
                            : "Đã tắt"}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#172033]">
                            Tên Bot (Bot Name)
                          </label>
                          <input
                            type="text"
                            value={botName}
                            onChange={(e) => setBotName(e.target.value)}
                            placeholder="VD: ISF Cần Thơ Bot"
                            className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#172033]">
                            Bot Username
                          </label>
                          <input
                            type="text"
                            value={botUsername}
                            onChange={(e) => setBotUsername(e.target.value)}
                            placeholder="VD: @ISF_Can_Tho_Bot"
                            className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-[#172033]">
                              Bot Token (Secret) <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[11px] text-[#15803D] font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Mã hóa AES-256 an toàn
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type={showToken ? "text" : "password"}
                              value={botToken}
                              onChange={(e) => setBotToken(e.target.value)}
                              placeholder={tokenPreview ? `Đã lưu: ${tokenPreview}` : "Nhập Bot Token từ @BotFather..."}
                              className="w-full px-3 py-2 pr-10 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-2.5 top-2 text-[#94A3B8] hover:text-[#172033] p-0.5"
                            >
                              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#172033]">
                            Chat ID của Nhóm <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={chatId}
                            onChange={(e) => setChatId(e.target.value)}
                            placeholder="VD: -100xxxxxxxxxx"
                            className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs font-mono focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-[#172033]">
                            Tên Nhóm / Group Name
                          </label>
                          <input
                            type="text"
                            value={chatName}
                            onChange={(e) => setChatName(e.target.value)}
                            placeholder="VD: ISF Cần Thơ News"
                            className="w-full px-3 py-2 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                          />
                        </div>

                        <div className="sm:col-span-2 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => setEnabled(e.target.checked)}
                              className="w-4 h-4 rounded border-[#DDE2E9] text-[#2457A7] focus:ring-[#2457A7]"
                            />
                            <span className="text-xs font-semibold text-[#172033]">
                              Kích hoạt truyền phát thông báo qua Telegram
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#EDF1F5] flex-wrap gap-2">
                        <ActionButton
                          type="button"
                          variant="secondary"
                          onClick={handleTestConnection}
                          isLoading={testingTelegram}
                          loadingText="Đang gửi tin thử..."
                          icon={<Send className="w-3.5 h-3.5" />}
                          className="px-3.5 py-1.5 text-xs font-medium border border-[#DDE2E9] hover:bg-[#F8FAFC] text-[#172033]"
                        >
                          Kiểm tra kết nối & Gửi tin nhắn thử
                        </ActionButton>

                        <ActionButton
                          type="submit"
                          variant="primary"
                          isLoading={savingTelegram}
                          loadingText="Đang lưu..."
                          className="px-5 py-1.5 text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white rounded-md shadow-xs"
                        >
                          Lưu cấu hình Telegram
                        </ActionButton>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right side: Instructions & Deliveries Log */}
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DDE2E9] text-xs space-y-2.5">
                    <h3 className="font-bold text-[#172033] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-[#2457A7]" />
                      Hướng dẫn cấu hình Bot Telegram
                    </h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-[#64748B] text-[11px] leading-relaxed">
                      <li>Mở Telegram, tìm <strong>@BotFather</strong> và gửi lệnh <code className="bg-white px-1.5 py-0.5 rounded border border-[#DDE2E9] font-mono text-[#2457A7]">/newbot</code>.</li>
                      <li>Sao chép <strong>HTTP API Token</strong> dán vào ô Bot Token ở trên.</li>
                      <li>Thêm bot vừa tạo vào nhóm Telegram làm việc và cấp quyền Quản trị (Admin).</li>
                      <li>Lấy <strong>Chat ID</strong> của nhóm (có dấu trừ phía trước, VD: <code className="bg-white px-1.5 py-0.5 rounded border border-[#DDE2E9] font-mono text-[#2457A7]">-100xxxxxxxxxx</code>).</li>
                      <li>Bấm <strong>Kiểm tra kết nối</strong> để gửi tin nhắn xác nhận.</li>
                    </ol>
                  </div>

                  {/* Delivery History */}
                  <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F5]">
                      <h3 className="font-bold text-[#172033] flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-[#15803D]" />
                        Lịch sử phát tin gần nhất
                      </h3>
                      <button
                        type="button"
                        onClick={fetchDeliveries}
                        className="text-[#64748B] hover:text-[#172033] p-1"
                        title="Làm mới"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingDeliveries ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-[#EDF1F5] pr-1">
                      {deliveries.length === 0 ? (
                        <div className="py-6 text-center text-[#94A3B8] text-xs">
                          Chưa có nhật ký gửi tin nhắn Telegram.
                        </div>
                      ) : (
                        deliveries.map((d) => (
                          <div key={d.id} className="py-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  d.status === "sent"
                                    ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                                    : d.status === "failed"
                                    ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                                    : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                                }`}
                              >
                                {d.status === "sent" ? "Đã gửi" : d.status === "failed" ? "Lỗi" : "Đang chờ"}
                              </span>
                              <span className="text-[11px] text-[#94A3B8] font-mono">
                                {d.sentAt ? formatDateTimeVN(new Date(d.sentAt)) : "—"}
                              </span>
                            </div>
                            <p className="text-[#172033] text-xs font-medium truncate">
                              {d.notification?.title || "Thông báo Telegram"}
                            </p>
                            {d.errorMessage && (
                              <p className="text-[11px] text-[#B91C1C] leading-tight">
                                {d.errorMessage}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MA TRẬN CẤU HÌNH THÔNG BÁO (13.10, 13.14) */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Top Bar with Trigger and Save Actions */}
                <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#172033]">Ma trận Kênh phân phối Thông báo</h2>
                    <p className="text-xs text-[#64748B]">
                      Cấu hình sự kiện nào hiển thị trên Feed web và sự kiện nào đẩy tức thời ra nhóm Telegram
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={handleRunRemindersNow}
                      isLoading={runningReminders}
                      loadingText="Đang quét nhắc việc..."
                      icon={<Play className="w-3.5 h-3.5" />}
                      className="px-3.5 py-1.5 text-xs font-medium border border-[#DDE2E9] hover:bg-[#F8FAFC] text-[#172033]"
                    >
                      Quét nhắc việc ngay
                    </ActionButton>

                    <ActionButton
                      type="submit"
                      variant="primary"
                      onClick={handleSaveSettings}
                      isLoading={savingSettings}
                      loadingText="Đang lưu..."
                      className="px-5 py-1.5 text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white rounded-md shadow-xs"
                    >
                      Lưu ma trận cấu hình
                    </ActionButton>
                  </div>
                </div>

                {/* Specialized Reminder Cards (13.5 & 13.7) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Nhắc QLYC đến hạn (13.5) */}
                  <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#EDF1F5]">
                      <div className="w-8 h-8 rounded-md bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#172033]">Cấu hình Nhắc QLYC đến hạn (13.5)</h3>
                        <p className="text-[11px] text-[#64748B]">Tự động nhắc hạn hoàn thành theo mốc ngày</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B] font-medium">Nhắc trước thời hạn:</span>
                        <select
                          value={remindDays}
                          onChange={(e) => setRemindDays(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] font-medium text-xs focus:ring-1 focus:ring-[#2457A7]"
                        >
                          <option value={1}>1 ngày trước hạn</option>
                          <option value={2}>2 ngày trước hạn</option>
                          <option value={3}>3 ngày trước hạn</option>
                          <option value={5}>5 ngày trước hạn</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1 text-[11px] text-[#64748B]">
                        <div className="flex items-center gap-1.5 text-[#2457A7] font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Cơ chế chống gửi trùng lặp (Anti-spam):</span>
                        </div>
                        <p>Mỗi mốc nhắc (Trước hạn, Đến hạn hôm nay, Quá hạn) chỉ gửi đúng 1 lần cho mỗi yêu cầu trong ngày.</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Nhắc Chấm công (13.7, 13.12) */}
                  <div className="p-4 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#EDF1F5]">
                      <div className="w-8 h-8 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#172033]">Cấu hình Nhắc Chấm công (13.7)</h3>
                        <p className="text-[11px] text-[#64748B]">Khung giờ nhắc chấm công nhân sự hàng ngày</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[#64748B] block mb-1 font-medium">Giờ buổi sáng:</label>
                        <input
                          type="time"
                          value={morningTime}
                          onChange={(e) => setMorningTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] font-mono text-xs focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>

                      <div>
                        <label className="text-[#64748B] block mb-1 font-medium">Giờ buổi chiều:</label>
                        <input
                          type="time"
                          value={eveningTime}
                          onChange={(e) => setEveningTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md bg-white border border-[#DDE2E9] text-[#172033] font-mono text-xs focus:ring-1 focus:ring-[#2457A7]"
                        />
                      </div>

                      <div className="col-span-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={skipWeekends}
                            onChange={(e) => setSkipWeekends(e.target.checked)}
                            className="w-4 h-4 rounded border-[#DDE2E9] text-[#2457A7] focus:ring-[#2457A7]"
                          />
                          <span className="text-[#172033]">
                            Không gửi nhắc chấm công vào ngày nghỉ cuối tuần (Thứ 7 & Chủ Nhật)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matrix Table by Category */}
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const eventsInCat = eventSettings.filter((e) => e.category === cat.id);
                    if (eventsInCat.length === 0) return null;

                    return (
                      <div key={cat.id} className="rounded-lg border border-[#DDE2E9] bg-white overflow-hidden shadow-xs">
                        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#DDE2E9] flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                            {cat.label}
                          </h3>
                          <span className="text-[11px] text-[#64748B] font-medium">{eventsInCat.length} sự kiện</span>
                        </div>

                        <div className="divide-y divide-[#EDF1F5] text-xs">
                          {eventsInCat.map((evt) => (
                            <div
                              key={evt.eventCode}
                              className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#172033] text-xs">{evt.name}</span>
                                  <span className="font-mono text-[10px] text-[#64748B] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#DDE2E9]">
                                    {evt.eventCode}
                                  </span>
                                </div>
                                {evt.description && (
                                  <p className="text-[11px] text-[#64748B]">{evt.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-6 shrink-0">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={evt.feedEnabled}
                                    onChange={() => handleToggleEvent(evt.eventCode, "feed")}
                                    className="w-4 h-4 rounded border-[#DDE2E9] text-[#2457A7] focus:ring-[#2457A7]"
                                  />
                                  <span className="text-xs text-[#172033]">Feed Web</span>
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={evt.telegramEnabled}
                                    onChange={() => handleToggleEvent(evt.eventCode, "telegram")}
                                    className="w-4 h-4 rounded border-[#DDE2E9] text-[#2457A7] focus:ring-[#2457A7]"
                                  />
                                  <span className="text-xs text-[#2457A7] font-semibold">Telegram Bot</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
