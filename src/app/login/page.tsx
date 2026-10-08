"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Layers,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      error("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json.error?.details
          ? `${json.error.message}: ${json.error.details}`
          : json.error?.message || "Đăng nhập thất bại.";
        error(errorMsg);
        setLoading(false);
        return;
      }

      success(`Xin chào ${json.data.user.fullName || json.data.user.username}! Đăng nhập thành công.`);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      error("Không thể kết nối đến máy chủ xác thực.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-cyber-grid">
      {/* Dynamic Ambient Glow Mesh */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 right-1/3 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-2xl shadow-blue-500/30 mb-4 border border-white/20 ring-4 ring-blue-500/10 hover:scale-105 transition-transform duration-300">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2.5">
            <span>PMS Hub Enterprise</span>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 border border-cyan-500/30">
              v2.3
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Hệ thống Quản trị Tập trung Tài sản Số, Nhân sự & Két Mật khẩu Dự án
          </p>
        </div>

        {/* Login Card */}
        <div className="p-7 sm:p-8 rounded-3xl bg-[#0b1020]/90 border border-slate-800/90 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/10 relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Tên đăng nhập</span>
                <span className="text-[10px] text-slate-500 font-normal">Tài khoản hệ thống</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, pm_minh, dev_giang..."
                  className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-all shadow-inner"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Mật khẩu</span>
                <span className="text-[10px] text-slate-500 font-normal">Khóa bảo vệ cá nhân</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pl-11 pr-11 rounded-2xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-all font-mono shadow-inner"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:scale-[1.01]"
            >
              {loading ? (
                <span>Đang xác thực thông tin...</span>
              ) : (
                <>
                  <span>Đăng nhập vào Hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-7 pt-6 border-t border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
              <span>Tài khoản Demo thử nghiệm nhanh:</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount("admin", "Admin@123")}
                className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 text-left transition-all group"
              >
                <div className="text-[10px] font-extrabold text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Admin
                </div>
                <div className="text-xs font-mono text-white mt-0.5 group-hover:text-blue-300">admin</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("pm_minh", "User@123")}
                className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  PM Lead
                </div>
                <div className="text-xs font-mono text-white mt-0.5 group-hover:text-amber-300">pm_minh</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("dev_giang", "User@123")}
                className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group"
              >
                <div className="text-[10px] font-extrabold text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Dev User
                </div>
                <div className="text-xs font-mono text-white mt-0.5 group-hover:text-cyan-300">dev_giang</div>
              </button>
            </div>
          </div>

          {/* Security Features Trust Badges */}
          <div className="mt-6 pt-5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mã hóa AES-256-GCM</span>
            </div>
            <span>•</span>
            <div>Bảo vệ Chống Brute-force</div>
            <span>•</span>
            <div>Audit Trail Bất biến</div>
          </div>
        </div>
      </div>
    </div>
  );
}
