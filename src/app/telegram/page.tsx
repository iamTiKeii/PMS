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
} from "lucide-react";

export default function TelegramConfigPage() {
  const { success, error } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Config form state
  const [botName, setBotName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [tokenPreview, setTokenPreview] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [chatId, setChatId] = useState("");
  const [chatName, setChatName] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Notification type checkboxes
  const [notifyProject, setNotifyProject] = useState(true);
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [notifyAccount, setNotifyAccount] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);

  // Deliveries history
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Fetch current config
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/config");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const d = json.data;
        setBotName(d.botName || "");
        setTokenPreview(d.tokenPreview || "");
        setChatId(d.chatId || "");
        setChatName(d.chatName || "");
        setEnabled(Boolean(d.enabled));
        setNotifyProject(Boolean(d.notifyProject));
        setNotifyStaff(Boolean(d.notifyStaff));
        setNotifyAccount(Boolean(d.notifyAccount));
        setNotifySystem(Boolean(d.notifySystem));
      }
    } catch {
      error("Lỗi tải cấu hình Telegram.");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchConfig();
    fetchDeliveries();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      error("Vui lòng nhập Chat ID của nhóm Telegram.");
      return;
    }

    if (!tokenPreview && !botToken.trim()) {
      error("Vui lòng nhập Bot Token.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botName: botName.trim(),
          botToken: botToken.trim() || undefined,
          chatId: chatId.trim(),
          chatName: chatName.trim(),
          enabled,
          notifyProject,
          notifyStaff,
          notifyAccount,
          notifySystem,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success("Đã lưu cấu hình Telegram thành công!");
        setBotToken("");
        fetchConfig();
      } else {
        error(json.error?.message || "Lỗi lưu cấu hình.");
      }
    } catch {
      error("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!chatId.trim()) {
      error("Vui lòng nhập Chat ID để kiểm tra.");
      return;
    }

    setTesting(true);
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
        fetchDeliveries();
      } else {
        error(json.error?.message || "Kết nối Telegram thất bại.");
      }
    } catch {
      error("Lỗi kết nối tới máy chủ.");
    } finally {
      setTesting(false);
    }
  };

  const isConnected = Boolean(chatId && tokenPreview && enabled);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Cấu hình Tích hợp Telegram Bot"
        subtitle="Kênh phân phối thông báo tự động tới Nhóm Telegram vận hành dự án"
        actionButton={
          <button
            type="button"
            onClick={() => {
              fetchConfig();
              fetchDeliveries();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
        {/* Status Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isConnected
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800 border border-slate-700 text-slate-400"
              }`}
            >
              <Send className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Trạng thái kết nối:</h3>
                <span
                  className={`text-xs font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1.5 ${
                    isConnected
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  {isConnected ? "Đã kết nối & Đang hoạt động" : "Chưa cấu hình hoặc Đã tắt"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {chatName ? `Đang liên kết nhóm: ${chatName} (${chatId})` : "Chưa liên kết nhóm Telegram nào"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={testing || (!tokenPreview && !botToken) || !chatId}
            onClick={handleTestConnection}
            className="px-4 py-2.5 rounded-2xl bg-cyan-600/15 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-cyan-600/10 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>{testing ? "Đang gửi test..." : "Kiểm tra kết nối"}</span>
          </button>
        </div>

        {/* Quick Setup Instructions */}
        <div className="p-5 rounded-3xl bg-blue-950/20 border border-blue-500/20 space-y-3">
          <div className="flex items-center gap-2 text-blue-300 font-extrabold text-xs">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Hướng dẫn 3 bước kết nối Telegram Bot</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 leading-relaxed pl-1">
            <li>
              Mở Telegram tìm <strong className="text-cyan-300 font-mono">@BotFather</strong>, gửi lệnh{" "}
              <code className="text-cyan-300 font-mono">/newbot</code> để tạo Bot và sao chép mã <strong>Bot Token</strong>.
            </li>
            <li>
              Thêm Bot vừa tạo vào <strong>Nhóm Telegram</strong> của dự án và cấp quyền gửi tin nhắn (Admin).
            </li>
            <li>
              Lấy <strong>Chat ID</strong> của nhóm (thường bắt đầu bằng <code className="text-cyan-300 font-mono">-100...</code>) bằng cách thêm bot <code className="text-cyan-300 font-mono">@RawDataBot</code> vào nhóm để xem ID rồi kick ra.
            </li>
          </ol>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-5 text-xs backdrop-blur-xl">
          <div className="border-b border-slate-800/80 pb-4">
            <h4 className="text-sm font-extrabold text-white">Thông tin Bot & Nhóm tiếp nhận</h4>
            <p className="text-xs text-slate-400 mt-0.5">Mã Bot Token được lưu trữ bảo mật với mã hóa đối xứng AES-256-GCM.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Bot Token <span className="text-rose-400">*</span></span>
                {tokenPreview && (
                  <span className="text-[11px] text-emerald-400 font-normal">
                    Đã lưu: {tokenPreview}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={tokenPreview ? "Để trống nếu giữ nguyên mã token hiện tại..." : "Nhập Bot Token (VD: 7123456789:AAH...)"}
                  className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Chat ID Nhóm <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!tokenPreview && !botToken.trim()) {
                      error("Vui lòng nhập Bot Token trước.");
                      return;
                    }
                    try {
                      const res = await fetch("/api/telegram/detect-chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ botToken: botToken.trim() || undefined }),
                      });
                      const json = await res.json();
                      if (res.ok && json.success && json.data?.length > 0) {
                        const firstChat = json.data[0];
                        setChatId(firstChat.id);
                        if (firstChat.title && !chatName) setChatName(firstChat.title);
                        success(`Đã tự động nhận diện nhóm: "${firstChat.title}" (ID: ${firstChat.id})`);
                      } else {
                        error("Chưa phát hiện được chat nào. Hãy gửi 1 tin nhắn bất kỳ (VD: 'hello') vào nhóm Telegram có Bot rồi bấm lại!");
                      }
                    } catch {
                      error("Lỗi khi kết nối tới bot.");
                    }
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>🔍 Tự động tìm Chat ID</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="VD: -1002345678901"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
              <p className="text-[11px] text-amber-400/90 leading-tight">
                * Lưu ý: Chat ID của Nhóm Telegram bắt buộc phải có tiền tố <code className="font-mono font-bold">-</code> hoặc <code className="font-mono font-bold">-100</code> ở đầu (VD: <code className="font-mono">-100xxxxxxxxxx</code>).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tên Nhóm hiển thị
              </label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="VD: Kênh Vận hành HIS Quảng Ninh"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tên gợi nhớ Bot (Tùy chọn)
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="VD: PMS Operations Notifier Bot"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
              />
            </div>
          </div>

          {/* Master Switch & Event Filters */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-extrabold text-white text-xs">Kích hoạt gửi thông báo tự động</h5>
                <p className="text-[11px] text-slate-400">Bật/tắt toàn bộ kênh thông báo qua Telegram</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Chọn các loại sự kiện gửi về nhóm:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyProject}
                    onChange={(e) => setNotifyProject(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-white text-xs">Thông báo Dự án & Level</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyStaff}
                    onChange={(e) => setNotifyStaff(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-white text-xs">Thông báo Nhân sự mới / Nghỉ việc</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyAccount}
                    onChange={(e) => setNotifyAccount(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-white text-xs">Thông báo Tài khoản Site</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={notifySystem}
                    onChange={(e) => setNotifySystem(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-white text-xs">Thông báo Hệ thống & Bảo mật</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
            >
              {saving ? "Đang lưu cấu hình..." : "Lưu cấu hình"}
            </button>
          </div>
        </form>

        {/* Deliveries History */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-xl space-y-4 text-xs backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-extrabold text-white">Lịch sử truyền phát Telegram gần đây</h4>
            </div>
            <button
              type="button"
              onClick={fetchDeliveries}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              Làm mới
            </button>
          </div>

          {loadingDeliveries ? (
            <div className="py-8 text-center text-slate-500 text-xs">Đang tải lịch sử gửi tin...</div>
          ) : deliveries.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Chưa có thông báo nào được truyền phát qua Telegram.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Tiêu đề thông báo</th>
                    <th className="py-3 px-4">Kênh</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Ghi chú / Mã tin nhắn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {del.sentAt ? new Date(del.sentAt).toLocaleString("vi-VN") : "Đang chờ"}
                      </td>
                      <td className="py-3 px-4 font-bold text-white max-w-xs truncate">
                        {del.notification?.title || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 uppercase font-mono text-[10px]">
                        {del.channel}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            del.status === "sent"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : del.status === "failed"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {del.status === "sent" ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Đã gửi</span>
                            </>
                          ) : del.status === "failed" ? (
                            <>
                              <X className="w-3 h-3" />
                              <span>Thất bại</span>
                            </>
                          ) : (
                            <span>Đang chờ</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {del.status === "sent" ? (
                          <span className="font-mono text-cyan-300">Msg ID: {del.externalMessageId}</span>
                        ) : del.errorMessage ? (
                          <span className="text-rose-400">{del.errorMessage}</span>
                        ) : (
                          "---"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
