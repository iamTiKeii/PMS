"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { Loader2, AlertTriangle, X, ShieldAlert } from "lucide-react";

export type LoadingScope = "global" | "section";

export interface LoadingItem {
  key: string;
  message: string;
  startTime: number;
  scope: LoadingScope;
}

interface LoadingContextType {
  startLoading: (key: string, message?: string, scope?: LoadingScope) => void;
  stopLoading: (key: string) => void;
  isLoading: (key?: string) => boolean;
  activeMessage: string | null;
  withLoading: <T>(
    key: string,
    message: string,
    fn: () => Promise<T>,
    options?: { scope?: LoadingScope; minDuration?: number }
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const DEFAULT_MIN_DURATION = 300; // Anti-flicker: thời gian hiển thị tối thiểu 300ms
const TIMEOUT_WARNING_MS = 25000; // Cảnh báo xử lý lâu sau 25s

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [activeLoadings, setActiveLoadings] = useState<Map<string, LoadingItem>>(new Map());
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bắt đầu một loading request
  const startLoading = useCallback(
    (key: string, message = "Đang xử lý dữ liệu...", scope: LoadingScope = "global") => {
      setActiveLoadings((prev) => {
        const next = new Map(prev);
        next.set(key, {
          key,
          message,
          startTime: Date.now(),
          scope,
        });
        return next;
      });
    },
    []
  );

  // Kết thúc một loading request
  const stopLoading = useCallback((key: string) => {
    setActiveLoadings((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Kiểm tra trạng thái loading (theo key hoặc bất kỳ request nào đang chạy)
  const isLoading = useCallback(
    (key?: string) => {
      if (key) return activeLoadings.has(key);
      return activeLoadings.size > 0;
    },
    [activeLoadings]
  );

  // Wrapper tự động xử lý anti-flicker và dọn dẹp an toàn trong finally
  const withLoading = useCallback(
    async <T,>(
      key: string,
      message: string,
      fn: () => Promise<T>,
      options?: { scope?: LoadingScope; minDuration?: number }
    ): Promise<T> => {
      const scope = options?.scope || "global";
      const minDuration = options?.minDuration ?? DEFAULT_MIN_DURATION;
      const startTime = Date.now();

      startLoading(key, message, scope);

      try {
        const result = await fn();
        const elapsed = Date.now() - startTime;
        if (elapsed < minDuration) {
          await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
        }
        return result;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        if (elapsed < minDuration) {
          await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
        }
        throw err;
      } finally {
        stopLoading(key);
      }
    },
    [startLoading, stopLoading]
  );

  // Lọc các global loadings
  const globalItems = Array.from(activeLoadings.values()).filter((it) => it.scope === "global");
  const isGlobalLoading = globalItems.length > 0;
  // Lấy message của request mới nhất
  const currentGlobalMessage = isGlobalLoading
    ? globalItems[globalItems.length - 1].message
    : null;

  // Quản lý timeout an toàn cho UI (sau 25s hiển thị cảnh báo để user không bị kẹt)
  useEffect(() => {
    if (isGlobalLoading) {
      if (!timeoutTimerRef.current) {
        timeoutTimerRef.current = setTimeout(() => {
          setTimeoutTriggered(true);
        }, TIMEOUT_WARNING_MS);
      }
    } else {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      setTimeoutTriggered(false);
    }

    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
    };
  }, [isGlobalLoading]);

  // Ép tắt toàn bộ global loadings nếu user bấm Hủy do timeout
  const handleForceCloseOverlay = () => {
    setActiveLoadings((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next.entries()) {
        if (v.scope === "global") next.delete(k);
      }
      return next;
    });
    setTimeoutTriggered(false);
  };

  const contextValue: LoadingContextType = {
    startLoading,
    stopLoading,
    isLoading,
    activeMessage: currentGlobalMessage,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}

      {/* Global Loading Overlay (LOADING-01) */}
      {isGlobalLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060913]/75 backdrop-blur-md select-none transition-all duration-300 pointer-events-auto p-4 animate-fadeIn"
        >
          <div className="relative max-w-sm w-full p-6 rounded-3xl bg-slate-950/95 border border-slate-700/80 shadow-2xl shadow-black/80 ring-1 ring-blue-500/20 text-center space-y-4">
            {/* Ambient glow behind spinner */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Spinner Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/25">
                <div className="w-full h-full bg-[#070b16] rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1 relative z-10">
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                {currentGlobalMessage || "Đang xử lý..."}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Vui lòng đợi trong giây lát. Hệ thống đang bảo vệ và đồng bộ dữ liệu.
              </p>
            </div>

            {/* Progress indicator bar */}
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden relative">
              <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 h-full w-full animate-pulse" />
            </div>

            {/* Timeout warning (hiển thị khi request kéo dài > 25s) */}
            {timeoutTriggered && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Xử lý lâu hơn dự kiến</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Máy chủ hoặc kết nối mạng đang phản hồi chậm. Bạn có thể tiếp tục chờ hoặc đóng
                  lớp phủ nếu thao tác không hoàn tất.
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForceCloseOverlay}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors"
                  >
                    Đóng lớp phủ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
