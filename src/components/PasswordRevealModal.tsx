"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "./Modal";
import { Lock, Copy, Check, Clock, AlertTriangle, KeyRound, ShieldAlert, ArrowRight } from "lucide-react";
import { useToast } from "./Toast";

interface PasswordRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  accountLabel: string;
  projectName: string;
  siteUsername: string;
  isOwner?: boolean;
  passwordStatus?: "DEFAULT" | "CUSTOM";
}

export function PasswordRevealModal({
  isOpen,
  onClose,
  accountId,
  accountLabel,
  projectName,
  siteUsername,
  isOwner = true,
  passwordStatus = "DEFAULT",
}: PasswordRevealModalProps) {
  const { success, error } = useToast();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [copied, setCopied] = useState(false);

  // PIN security status state
  const [checkingPinStatus, setCheckingPinStatus] = useState(false);
  const [pinStatus, setPinStatus] = useState<{
    hasPin: boolean;
    pinLength: number | null;
    isLocked: boolean;
    remainingLockSeconds: number;
    failedAttempts: number;
  }>({
    hasPin: true,
    pinLength: null,
    isLocked: false,
    remainingLockSeconds: 0,
    failedAttempts: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fetch if DEFAULT status
  useEffect(() => {
    if (isOpen && accountId) {
      setPin("");
      setRevealedPassword(null);
      setCountdown(15);
      setCopied(false);
      setLoading(false);
      setErrorMessage(null);

      if (passwordStatus === "DEFAULT") {
        setLoading(true);
        fetch(`/api/vault/accounts/${accountId}/reveal-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setRevealedPassword(json.data.password || json.data.plaintextPassword);
            } else {
              setErrorMessage(json.error?.message || "Không thể lấy mật khẩu mặc định.");
            }
          })
          .catch(() => setErrorMessage("Lỗi kết nối khi lấy mật khẩu."))
          .finally(() => setLoading(false));
      } else if (passwordStatus === "CUSTOM" && isOwner) {
        setCheckingPinStatus(true);
        fetch("/api/me/vault-pin/status")
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data) {
              setPinStatus(json.data);
            }
          })
          .catch((err) => console.error(err))
          .finally(() => setCheckingPinStatus(false));
      }
    } else {
      setRevealedPassword(null);
      setPin("");
    }
  }, [isOpen, accountId, passwordStatus, isOwner]);

  // Countdown timer 15 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (revealedPassword && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (revealedPassword && countdown === 0) {
      setRevealedPassword(null);
      setCountdown(15);
      onClose();
    }
    return () => clearTimeout(timer);
  }, [revealedPassword, countdown, onClose]);

  // Handle PIN verification
  const handleVerifyAndReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMessage("Vui lòng nhập mã PIN.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/vault/accounts/${accountId}/reveal-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRevealedPassword(json.data.password || json.data.plaintextPassword);
        setCountdown(json.data.expiresInSeconds || 15);
        setPin("");
      } else {
        const errMsg = json.error?.message || "Mã PIN không chính xác.";
        setErrorMessage(errMsg);
        if (json.error?.code === "MSG-VAULT-LOCKED") {
          setPinStatus((prev) => ({
            ...prev,
            isLocked: true,
            remainingLockSeconds: json.error?.remainingLockSeconds || 900,
          }));
        }
      }
    } catch {
      setErrorMessage("Lỗi kết nối mạng khi xác thực.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    success("Đã sao chép mật khẩu vào Clipboard (tự động xóa sau 30 giây)!");

    // Auto-wipe clipboard after 30 seconds
    setTimeout(() => {
      try {
        navigator.clipboard.writeText("");
      } catch {
        // ignore
      }
    }, 30000);

    setTimeout(() => setCopied(false), 2500);
  };

  const formatLockTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} phút ${secs < 10 ? "0" : ""}${secs} giây`;
  };

  const modalTitle =
    passwordStatus === "DEFAULT"
      ? "Mật khẩu Mặc định Dự án"
      : isOwner
      ? "Xác thực PIN Bảo vệ Két"
      : "Mật khẩu Riêng tư (Đã bảo vệ)";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setRevealedPassword(null);
        onClose();
      }}
      title={modalTitle}
      subtitle={`Tài khoản: ${accountLabel} • Dự án: ${projectName}`}
      maxWidth="max-w-md"
    >
      {!revealedPassword ? (
        <div className="space-y-4 text-xs">
          {/* TRƯỜNG HỢP 1: TÀI KHOẢN CUSTOM NHƯNG NGƯỜI DÙNG KHÔNG PHẢI CHỦ SỞ HỮU */}
          {passwordStatus === "CUSTOM" && !isOwner ? (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5 text-rose-800">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-900">Mật khẩu Riêng tư</div>
                  <p className="mt-1 leading-relaxed text-[11px] text-rose-700">
                    Tài khoản này đã được nhân sự sở hữu thay đổi mật khẩu khỏi mặc định. Theo quy tắc an toàn thông tin, chỉ duy nhất chủ sở hữu mới có quyền xem sau khi xác thực mã PIN cá nhân.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : passwordStatus === "DEFAULT" && loading ? (
            /* Đang tải mật khẩu mặc định */
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-slate-500 text-xs font-medium">Đang lấy mật khẩu mặc định của dự án...</p>
            </div>
          ) : isOwner && !checkingPinStatus && !pinStatus.hasPin ? (
            /* TRƯỜNG HỢP 2: CHỦ SỞ HỮU CHƯA THIẾT LẬP PIN */
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2.5 text-amber-800">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-amber-900">Chưa thiết lập PIN Két</div>
                  <p className="mt-1 leading-relaxed text-[11px] text-amber-700">
                    Mật khẩu này đang ở chế độ riêng tư. Bạn cần thiết lập mã PIN bảo mật cá nhân (4 hoặc 6 chữ số) trước khi có thể mở khóa xem mật khẩu.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span>Đi tới Cài đặt PIN ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : pinStatus.isLocked ? (
            /* TRƯỜNG HỢP 3: BỊ KHÓA PIN */
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2 text-rose-800">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-md bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-900">Xác thực PIN bị tạm khóa</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-rose-700">
                    Bạn đã nhập sai mã PIN quá 5 lần liên tiếp. Hệ thống khóa bảo vệ Két trong 15 phút.
                  </p>
                  <div className="mt-2 font-mono font-bold text-rose-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-rose-600" />
                    <span>Thời gian chờ: {formatLockTime(pinStatus.remainingLockSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 4: FORM NHẬP PIN CHO CHỦ SỞ HỮU */
            <form onSubmit={handleVerifyAndReveal} className="space-y-3.5">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-blue-900 leading-relaxed">
                <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-800">
                  Mật khẩu tài khoản này ở chế độ riêng tư. Nhập mã <strong>PIN bảo mật cá nhân (4 hoặc 6 chữ số)</strong> của bạn để mở khóa.
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Tên đăng nhập site:
                </label>
                <div className="px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 font-semibold select-all">
                  {siteUsername}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>Mã PIN của bạn (4 hoặc 6 số) <span className="text-rose-500">*</span></span>
                  {pinStatus.pinLength && (
                    <span className="text-[10px] text-slate-500 font-normal">Độ dài: {pinStatus.pinLength} số</span>
                  )}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPin(val);
                    setErrorMessage(null);
                  }}
                  placeholder="••••••"
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-center tracking-[0.5em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading || !pin.trim()}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {loading ? (
                    <span>Đang giải mã...</span>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Xác nhận & Mở Mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Khi giải mã thành công: hiển thị mật khẩu kèm đếm ngược */
        <div className="space-y-4 py-1 text-xs">
          {/* Countdown Timer Bar */}
          <div className="space-y-1 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Mật khẩu tự động ẩn sau:
              </span>
              <span className="font-mono text-sm font-bold text-amber-900">{countdown}s</span>
            </div>
            <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Plaintext Password Box */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Mật khẩu:</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Đã xác thực & mở khóa</span>
            </div>
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-md bg-white border border-slate-300">
              <div className="font-mono text-base font-bold text-slate-900 tracking-wider select-all break-all px-1">
                {revealedPassword}
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="shrink-0 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 text-xs font-semibold shadow-xs"
                title="Sao chép mật khẩu"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã chép" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-100 text-[11px] text-slate-600 flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Để bảo vệ an toàn, mật khẩu sẽ tự động xóa khỏi bộ nhớ khi bạn chuyển tab trình duyệt hoặc hết 15 giây.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setRevealedPassword(null);
              onClose();
            }}
            className="w-full py-2 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
          >
            Đóng lại và che giấu ngay
          </button>
        </div>
      )}
    </Modal>
  );
}
