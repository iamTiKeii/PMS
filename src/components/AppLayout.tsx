"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import { ToastProvider } from "./Toast";
import { LoadingProvider } from "./LoadingProvider";
import { ConfirmDialogProvider } from "./ConfirmDialogProvider";
import { Layers, Loader2 } from "lucide-react";

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
        <LoadingProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </LoadingProvider>
      </ToastProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] flex flex-col items-center justify-center text-[#172033]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#18283F] flex items-center justify-center text-white border border-[#233752] shadow-xs">
            <Layers className="w-5 h-5 text-[#2457A7]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#2457A7]" />
            <span>Đang tải thông tin làm việc...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <LoadingProvider>
        <ConfirmDialogProvider>
          <SidebarProvider>
            <div className="min-h-screen flex bg-[#F1F3F6] text-[#172033]">
              <Sidebar user={user} />
              <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </ConfirmDialogProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}
