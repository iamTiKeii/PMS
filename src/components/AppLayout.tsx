"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "./Toast";
import { LoadingProvider } from "./LoadingProvider";
import { Layers, ShieldCheck } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If on login page, skip fetching user
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (json.success) {
          setUser(json.data);
          // If user must change password and not on profile, redirect
          if (json.data.mustChangePassword && pathname !== "/profile") {
            router.push("/profile?mustChange=true");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [pathname, router]);

  if (pathname === "/login") {
    return (
      <ToastProvider>
        <LoadingProvider>{children}</LoadingProvider>
      </ToastProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center text-white relative overflow-hidden bg-cyber-grid">
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-4 animate-pulse ring-4 ring-blue-500/10">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>PMS Hub Enterprise</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Đang thiết lập phiên làm việc bảo mật...</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <LoadingProvider>
        <div className="min-h-screen flex bg-[#060913] text-slate-100">
          <Sidebar user={user} />
          <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
            {children}
          </main>
        </div>
      </LoadingProvider>
    </ToastProvider>
  );
}
