"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { ShieldCheck, Lock, Eye, Copy, Check, Clock, AlertTriangle, KeyRound, ShieldAlert } from "lucide-react";
import { useToast } from "./Toast";

interface PasswordRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  accountLabel: string;
  projectName: string;
  siteUsername: string;
}

export function PasswordRevealModal({
  isOpen,
  onClose,
  accountId,
  accountLabel,
  projectName,
  siteUsername,
}: PasswordRevealModalProps) {
  const { success, error } = useToast();
  const [reauthPassword, setReauthPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setReauthPassword("");
      setRevealedPassword(null);
      setCountdown(15);
      setCopied(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Countdown timer for 15s auto-masking
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (revealedPassword && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setRevealedPassword(null);
            onClose();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [revealedPassword, countdown, onClose]);

  // Auto-mask if user switches tabs (visibility change security rule)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && revealedPassword) {
        setRevealedPassword(null);
        onClose();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [revealedPassword, onClose]);

  const handleVerifyAndReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword.trim() || !accountId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/vault/accounts/${accountId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reauthPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Mật khẩu xác thực không đúng.");
        setLoading(false);
        return;
      }

      setRevealedPassword(json.data.plaintextPassword);
      setCountdown(15);
      success("Xác thực bảo mật thành công! Mật khẩu sẽ tự động ẩn sau 15 giây.");
    } catch (err) {
      console.error(err);
      error("Đã xảy ra lỗi khi xác thực mở khóa.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    success("Đã sao chép mật khẩu vào Clipboard (sẽ tự động xóa sau 30 giây)!");

    // Auto-wipe clipboard after 30 seconds
    setTimeout(() => {
      try {
        navigator.clipboard.writeText("");
      } catch {
        // Ignore clipboard permission error in background
      }
    }, 30000);

    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác thực Bảo mật Cấp hai (Step-Up Re-Auth)"
      subtitle={`Mở khóa mật khẩu: ${accountLabel} • Dự án: ${projectName}`}
      maxWidth="max-w-md"
    >
      {!revealedPassword ? (
        <form onSubmit={handleVerifyAndReveal} className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-3 text-blue-200 leading-relaxed">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-[11px]">
              Theo quy chuẩn an toàn thông tin, vui lòng <strong>nhập lại mật khẩu đăng nhập Tool</strong> của bạn để giải mã tài khoản site này. Hành vi mở mật khẩu sẽ được ghi nhận vào Audit Log.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Tên đăng nhập trên Site:
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400 font-bold shadow-inner">
              {siteUsername}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Mật khẩu tài khoản Tool của bạn <span className="text-rose-400">*</span>:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                placeholder="Nhập mật khẩu tài khoản Tool..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !reauthPassword.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span>Đang giải mã AES-256...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Xác nhận & Mở Mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5 py-2 text-xs">
          {/* Animated Countdown Timer Bar */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Clock className="w-4 h-4 animate-spin text-amber-400" />
                Mật khẩu tự động ẩn sau:
              </span>
              <span className="font-mono text-base font-extrabold text-amber-300">{countdown}s</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000 ease-linear rounded-full shadow-md"
                style={{ width: `${(countdown / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Plaintext Password Reveal Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-2.5">
            <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
              <span>Mật khẩu:</span>
              <span className="text-[10px] text-emerald-400 font-bold">Đã mở khóa</span>
            </div>
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="font-mono text-base sm:text-lg font-extrabold text-emerald-400 tracking-wider select-all break-all px-1">
                {revealedPassword}
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-md shadow-emerald-600/30"
                title="Sao chép mật khẩu"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Đã chép!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Để phòng chống rò rỉ, mật khẩu sẽ tự động biến mất khi bạn chuyển tab trình duyệt hoặc hết 15 giây.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Đóng lại và che giấu ngay
          </button>
        </div>
      )}
    </Modal>
  );
}
