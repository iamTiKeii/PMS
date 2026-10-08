"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { useToast } from "@/components/Toast";
import {
  Lock,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Building2,
  FolderKanban,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mustChange = searchParams.get("mustChange") === "true";
  const { success, error } = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.success) setUser(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      error("Vui lòng điền đầy đủ 3 trường mật khẩu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      error("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    if (newPassword.length < 8) {
      error("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        error(json.error?.message || "Đổi mật khẩu thất bại.");
        setSaving(false);
        return;
      }

      success("Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (mustChange) {
        router.push("/");
      }
    } catch {
      error("Lỗi khi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  // Password Strength Evaluation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Chưa nhập", color: "bg-slate-700" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Yếu", color: "bg-rose-500" };
    if (score <= 4) return { score: 2, label: "Trung bình", color: "bg-amber-500" };
    return { score: 3, label: "Rất mạnh", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060913] bg-cyber-grid">
      <Header
        title="Thông tin Tài khoản & Đổi Mật khẩu"
        subtitle="Quản lý thông tin định danh và chính sách bảo mật cá nhân"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
        {mustChange && (
          <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3.5 shadow-xl">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">Yêu cầu Đổi Mật khẩu Bắt buộc</div>
              <p className="mt-1 leading-relaxed">
                Tài khoản của bạn vừa được cấp mới hoặc đặt lại bởi Quản trị viên. Vì lý do an toàn thông tin, vui lòng đổi sang mật khẩu cá nhân của riêng bạn trước khi tiếp tục thao tác trên hệ thống.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card (1 col) */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl space-y-5 backdrop-blur-xl h-fit">
            <div className="text-center pb-5 border-b border-slate-800/80">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center font-extrabold text-2xl uppercase mx-auto mb-4 shadow-xl shadow-blue-500/30 ring-2 ring-white/10">
                {user?.staff?.fullName ? user.staff.fullName.charAt(0) : user?.username?.charAt(0) || "U"}
              </div>
              <h2 className="font-extrabold text-lg text-white">
                {user?.staff?.fullName || user?.username}
              </h2>
              <div className="text-xs font-mono text-cyan-300 mt-0.5 font-bold">
                @{user?.username}
              </div>
              <div className="mt-3">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    user?.role === "admin"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : user?.role === "pm"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {user?.role === "admin" ? "Super Admin" : user?.role === "pm" ? "Project Manager" : "Standard User"}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email công ty:</span>
                <div className="text-white font-semibold truncate">{user?.staff?.corporateEmail || "Chưa cập nhật"}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại:</span>
                <div className="text-white font-semibold">{user?.staff?.phoneNumber || "Chưa cập nhật"}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban phụ trách:</span>
                <div className="text-white font-semibold">{user?.staff?.department || "Chưa cập nhật"}</div>
              </div>
            </div>
          </div>

          {/* Change Password Form (2 cols) */}
          <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl space-y-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-md">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Thay đổi Mật khẩu Đăng nhập</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mật khẩu mới bắt buộc tối thiểu 8 ký tự, khuyến nghị có chữ hoa, số và ký tự đặc biệt
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Mật khẩu hiện tại <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Mật khẩu mới <span className="text-rose-400">*</span></span>
                  {newPassword && (
                    <span className="text-[11px] font-bold text-slate-400">
                      Độ mạnh: <strong className={strength.score === 3 ? "text-emerald-400" : strength.score === 2 ? "text-amber-400" : "text-rose-400"}>{strength.label}</strong>
                    </span>
                  )}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner font-mono"
                />

                {/* Password Strength Meter Bar */}
                {newPassword && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className={`h-1.5 rounded-full transition-all ${strength.score >= 1 ? strength.color : "bg-slate-800"}`} />
                    <div className={`h-1.5 rounded-full transition-all ${strength.score >= 2 ? strength.color : "bg-slate-800"}`} />
                    <div className={`h-1.5 rounded-full transition-all ${strength.score >= 3 ? strength.color : "bg-slate-800"}`} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Xác nhận Mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
                >
                  {saving ? "Đang cập nhật..." : "Cập nhật Mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
