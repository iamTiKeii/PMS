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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs select-none pointer-events-auto p-4 animate-modal-enter"
        >
          <div className="relative max-w-sm w-full p-5 rounded-lg bg-white border border-slate-200 shadow-xl text-center space-y-3">
            {/* Spinner Icon */}
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {currentGlobalMessage || "Đang xử lý..."}
              </h3>
              <p className="text-xs text-slate-500">
                Vui lòng đợi trong giây lát...
              </p>
            </div>

            {/* Timeout warning (hiển thị khi request kéo dài > 25s) */}
            {timeoutTriggered && (
              <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Xử lý lâu hơn dự kiến</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Máy chủ hoặc kết nối mạng đang phản hồi chậm. Bạn có thể tiếp tục chờ hoặc đóng lớp phủ.
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForceCloseOverlay}
                    className="px-2.5 py-1 rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold text-[11px] transition-colors"
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
