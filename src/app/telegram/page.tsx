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
import { SectionLoading } from "@/components/SectionLoading";

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        title="Quản lý Thông báo & Tích hợp Telegram (M6)"
        subtitle="Cấu hình truyền phát thông báo tập trung trên Feed và phân phối tin tức tức thời tới Telegram Group"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("telegram")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "telegram"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Cài đặt Telegram Bot (13.9)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "settings"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ma trận Cấu hình Thông báo (13.10)</span>
          </button>
        </div>

        {loading ? (
          <SectionLoading text="Đang tải dữ liệu cấu hình Telegram & Thông báo..." minHeight="380px" />
        ) : (
          <>
            {/* TAB 1: CẤU HÌNH TELEGRAM BOT (13.9) */}
            {activeTab === "telegram" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white">Kết nối Telegram Bot</h2>
                      <p className="text-xs text-slate-400">Gửi thông báo tự động tới nhóm làm việc</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                        enabled && lastTestStatus === "success"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : enabled
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          enabled && lastTestStatus === "success"
                            ? "bg-emerald-400 animate-pulse"
                            : enabled
                            ? "bg-amber-400"
                            : "bg-slate-500"
                        }`}
                      />
                      {enabled && lastTestStatus === "success"
                        ? "Đang kết nối"
                        : enabled
                        ? "Chưa test kết nối"
                        : "Đã tắt"}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Tên Bot (Bot Name)
                      </label>
                      <input
                        type="text"
                        value={botName}
                        onChange={(e) => setBotName(e.target.value)}
                        placeholder="VD: ISF Cần Thơ Bot"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Bot Username
                      </label>
                      <input
                        type="text"
                        value={botUsername}
                        onChange={(e) => setBotUsername(e.target.value)}
                        placeholder="VD: @ISF_Can_Tho_Bot"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Bot Token (Secret) <span className="text-rose-400">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-400">Mã hóa AES-256 an toàn trong database</span>
                      </div>
                      <div className="relative">
                        <input
                          type={showToken ? "text" : "password"}
                          value={botToken}
                          onChange={(e) => setBotToken(e.target.value)}
                          placeholder={tokenPreview ? `Đã lưu: ${tokenPreview}` : "Nhập Bot Token từ @BotFather..."}
                          className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-1"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Chat ID của Nhóm <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        placeholder="VD: -100xxxxxxxxxx hoặc -5165048117"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Tên Nhóm / Group Name
                      </label>
                      <input
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        placeholder="VD: ISF Cần Thơ News"
                        className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-xs font-bold text-white">
                          Bật chức năng truyền phát thông báo qua Telegram
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-wrap gap-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={handleTestConnection}
                      isLoading={testingTelegram}
                      loadingText="Đang gửi tin thử..."
                      icon={<Send className="w-4 h-4" />}
                      className="px-4 py-2.5 text-xs font-bold text-cyan-300"
                    >
                      Kiểm tra kết nối & Gửi tin nhắn thử
                    </ActionButton>

                    <ActionButton
                      type="submit"
                      variant="primary"
                      isLoading={savingTelegram}
                      loadingText="Đang lưu..."
                      className="px-6 py-2.5 text-xs font-bold"
                    >
                      Lưu cấu hình Telegram
                    </ActionButton>
                  </div>
                </form>
              </div>
            </div>

            {/* Right side: Instructions & Deliveries Log */}
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
                <h3 className="font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  Hướng dẫn cấu hình Bot Telegram
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                  <li>Mở Telegram, tìm <strong>@BotFather</strong> và gõ <code className="text-cyan-300">/newbot</code> để tạo bot.</li>
                  <li>Sao chép <strong>HTTP API Token</strong> dán vào ô Bot Token ở trên.</li>
                  <li>Thêm bot vừa tạo vào nhóm Telegram làm việc và cấp quyền Admin.</li>
                  <li>Lấy <strong>Chat ID</strong> của nhóm (có dấu trừ phía trước, VD: <code className="text-cyan-300">-100xxxxxxxxxx</code>).</li>
                  <li>Bấm nút <strong>Kiểm tra kết nối</strong> để xác minh tin nhắn tới nhóm.</li>
                </ol>
              </div>

              {/* Delivery History */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Lịch sử gửi Telegram
                  </h3>
                  <button
                    type="button"
                    onClick={fetchDeliveries}
                    className="text-slate-400 hover:text-white p-1"
                    title="Làm mới"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDeliveries ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 pr-1">
                  {deliveries.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-[11px]">
                      Chưa có nhật ký gửi tin nhắn Telegram.
                    </div>
                  ) : (
                    deliveries.map((d) => (
                      <div key={d.id} className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === "sent"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : d.status === "failed"
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {d.status === "sent" ? "Đã gửi" : d.status === "failed" ? "Lỗi" : "Đang chờ"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {d.sentAt ? formatDateTimeVN(new Date(d.sentAt)) : "—"}
                          </span>
                        </div>
                        <p className="text-white text-xs truncate">
                          {d.notification?.title || "Thông báo Telegram"}
                        </p>
                        {d.errorMessage && (
                          <p className="text-[10px] text-rose-400 leading-tight">
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
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-white">Ma trận Kênh phân phối Thông báo</h2>
                <p className="text-xs text-slate-400">
                  Cấu hình sự kiện nào xuất hiện trên Feed web và sự kiện nào đẩy ra nhóm Telegram
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
                  className="px-4 py-2 text-xs font-bold text-cyan-300"
                >
                  Quét nhắc việc ngay
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="primary"
                  onClick={handleSaveSettings}
                  isLoading={savingSettings}
                  loadingText="Đang lưu..."
                  className="px-6 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
                >
                  Lưu ma trận cấu hình
                </ActionButton>
              </div>
            </div>

            {/* Specialized Reminder Cards (13.5 & 13.7) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Nhắc QLYC đến hạn (13.5) */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cấu hình Nhắc QLYC đến hạn (13.5)</h3>
                    <p className="text-[11px] text-slate-400">Tự động nhắc hạn hoàn thành theo mốc ngày</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Nhắc trước thời hạn:</span>
                    <select
                      value={remindDays}
                      onChange={(e) => setRemindDays(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                    >
                      <option value={1}>1 ngày trước hạn</option>
                      <option value={2}>2 ngày trước hạn</option>
                      <option value={3}>3 ngày trước hạn</option>
                      <option value={5}>5 ngày trước hạn</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cơ chế chống gửi trùng lặp (Anti-spam):</span>
                    </div>
                    <p>Mỗi mốc nhắc (Trước hạn, Đến hạn hôm nay, Quá hạn) chỉ gửi đúng 1 lần cho mỗi yêu cầu trong ngày.</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Nhắc Chấm công (13.7, 13.12) */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Cấu hình Nhắc Chấm công (13.7)</h3>
                    <p className="text-[11px] text-slate-400">Khung giờ nhắc chấm công hàng ngày</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Giờ buổi sáng:</label>
                    <input
                      type="time"
                      value={morningTime}
                      onChange={(e) => setMorningTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Giờ buổi chiều:</label>
                    <input
                      type="time"
                      value={eveningTime}
                      onChange={(e) => setEveningTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={skipWeekends}
                        onChange={(e) => setSkipWeekends(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="text-slate-300">
                        Không gửi nhắc chấm công vào ngày nghỉ cuối tuần (Thứ 7 & Chủ Nhật)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix Table by Category */}
            <div className="space-y-6">
              {categories.map((cat) => {
                const eventsInCat = eventSettings.filter((e) => e.category === cat.id);
                if (eventsInCat.length === 0) return null;

                return (
                  <div key={cat.id} className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
                    <div className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                        {cat.label}
                      </h3>
                      <span className="text-[10px] text-slate-500">{eventsInCat.length} sự kiện</span>
                    </div>

                    <div className="divide-y divide-slate-800/80 text-xs">
                      {eventsInCat.map((evt) => (
                        <div
                          key={evt.eventCode}
                          className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{evt.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {evt.eventCode}
                              </span>
                            </div>
                            {evt.description && (
                              <p className="text-[11px] text-slate-400">{evt.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={evt.feedEnabled}
                                onChange={() => handleToggleEvent(evt.eventCode, "feed")}
                                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0"
                              />
                              <span className="text-xs text-slate-300">Feed Web</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={evt.telegramEnabled}
                                onChange={() => handleToggleEvent(evt.eventCode, "telegram")}
                                className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0"
                              />
                              <span className="text-xs text-cyan-300 font-semibold">Telegram Bot</span>
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
