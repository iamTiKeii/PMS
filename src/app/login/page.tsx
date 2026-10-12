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
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useLoading } from "@/components/LoadingProvider";
import { ActionButton } from "@/components/ActionButton";

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { withLoading } = useLoading();

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
    await withLoading(
      "auth-login",
      "Đang xác thực tài khoản & đăng nhập...",
      async () => {
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
      },
      { scope: "global", minDuration: 400 }
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#18283F] text-white shadow-xs mb-3 border border-[#233752]">
            <Layers className="w-6 h-6 text-[#2457A7]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight flex items-center justify-center gap-2">
            <span>{process.env.NEXT_PUBLIC_APP_NAME || "ISF Can Tho Hub"}</span>
            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E5EDFA] text-[#2457A7] border border-[#CBD5E1]">
              v2.3
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {process.env.NEXT_PUBLIC_APP_DESCRIPTION || "Hệ thống Quản trị Tập trung Team ISF Cần Thơ"}
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-lg bg-white border border-[#DDE2E9] shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033] flex items-center justify-between">
                <span>Tên đăng nhập</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, pm_minh, dev_giang..."
                  className="w-full px-3 py-2 pl-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors"
                />
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#172033] flex items-center justify-between">
                <span>Mật khẩu</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pl-9 pr-9 rounded-md bg-white border border-[#DDE2E9] text-[#172033] placeholder-[#94A3B8] text-xs focus:ring-1 focus:ring-[#2457A7] focus:border-[#2457A7] transition-colors font-mono"
                />
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#172033] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <ActionButton
                type="submit"
                variant="primary"
                isLoading={loading}
                loadingText="Đang xác thực thông tin..."
                icon={<ArrowRight className="w-4 h-4" />}
                className="w-full py-2.5 text-xs font-semibold bg-[#2457A7] hover:bg-[#1C4585] text-white rounded-md shadow-xs justify-center transition-colors"
              >
                Đăng nhập vào Hệ thống
              </ActionButton>
            </div>
          </form>

          {/* Security Features Trust Badges */}
          <div className="mt-6 pt-4 border-t border-[#EDF1F5] flex items-center justify-between text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Bảo mật dữ liệu</span>
            </div>
            <span>•</span>
            <div>Khóa brute-force</div>
            <span>•</span>
            <div>Audit Trail</div>
          </div>
        </div>
      </div>
    </div>
  );
}
