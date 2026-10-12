"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton-box rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div
      className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs flex flex-col justify-between space-y-3"
      role="status"
      aria-busy="true"
      aria-label="Đang tải dữ liệu chỉ số..."
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div>
        <Skeleton className="h-7 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-[#EDF1F5]" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-2.5 px-3">
          <Skeleton className={`h-3.5 ${i === 0 ? "w-36" : i === 1 ? "w-28" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="w-full bg-white border border-[#DDE2E9] rounded-md overflow-hidden shadow-xs"
      role="status"
      aria-busy="true"
      aria-label="Đang tải dữ liệu bảng..."
    >
      <div className="border-b border-[#DDE2E9] bg-[#F8FAFC] px-4 py-2.5 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-24 rounded" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DDE2E9] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="py-2 px-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5]">
            {Array.from({ length: rows }).map((_, idx) => (
              <TableRowSkeleton key={idx} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
      role="status"
      aria-busy="true"
      aria-label="Đang tải danh sách thẻ..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 rounded-md bg-white border border-[#DDE2E9] shadow-xs space-y-3"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <Skeleton className="h-3 w-48" />
          <div className="pt-2 border-t border-[#EDF1F5] flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Project Detail Skeleton
 * Accurately mimics the project header card, 3 tier assignments and tab headers
 */
export function ProjectDetailSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Đang tải thông tin chi tiết dự án..."
    >
      {/* Header card skeleton */}
      <div className="p-4 sm:p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-2 w-full max-w-md">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-6 w-56 rounded" />
            </div>
            <Skeleton className="h-3.5 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        {/* Tier responsibilities matrix skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#EDF1F5]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs bar skeleton */}
      <div className="flex items-center gap-2 border-b border-[#DDE2E9] pb-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {/* Table content skeleton */}
      <TableSkeleton rows={5} columns={8} />
    </div>
  );
}

/**
 * Group Order Detail Skeleton
 */
export function GroupOrderDetailSkeleton() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-busy="true"
      aria-label="Đang tải thông tin đơn đặt nhóm..."
    >
      <div className="p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-60 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#EDF1F5]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-md bg-[#F8FAFC] border border-[#DDE2E9] space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Grid of items skeleton */}
      <CardGridSkeleton count={4} />
    </div>
  );
}

/**
 * Telegram Config Skeleton
 */
export function TelegramConfigSkeleton() {
  return (
    <div
      className="space-y-5"
      role="status"
      aria-busy="true"
      aria-label="Đang tải cấu hình Telegram & thông báo..."
    >
      <div className="p-5 rounded-lg bg-white border border-[#DDE2E9] shadow-xs space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
      <TableSkeleton rows={4} columns={6} />
    </div>
  );
}
