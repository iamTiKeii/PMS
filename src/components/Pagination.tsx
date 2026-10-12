"use client";

import React from "react";
import {
  Pagination as NavPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";

export interface PaginationProps {
  /**
   * Visible 1-based current page (1, 2, 3...)
   */
  currentPage: number;
  /**
   * Total number of items across all pages
   */
  totalItems: number;
  /**
   * Items per page
   */
  pageSize?: number;
  /**
   * Callback fired with the new 1-based page
   */
  onPageChange: (page: number) => void;
  /**
   * Optional callback when page size changes
   */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * Optional dependencies (e.g. search queries, filter state) to re-clamp and recalculate pages
   */
  filterDeps?: unknown[];
  /**
   * Sibling page count to show beside active page. Default: 1
   */
  siblingCount?: number;
  /**
   * Custom CSS classes
   */
  className?: string;
  /**
   * Whether to display the "Showing X to Y of Z items" summary
   */
  showSummary?: boolean;
  /**
   * Whether to display page size selector
   */
  showPageSizeSelector?: boolean;
  /**
   * Options for page size selector
   */
  pageSizeOptions?: number[];
}

/**
 * Accessible Pagination component using <nav aria-label="pagination"> landmark.
 * - Current page marked with aria-current="page"
 * - Previous/Next links at the ends
 * - Collapsed range represented with <PaginationEllipsis> (...)
 * - Converts 1-based visible page to 0-based offset in exactly one centralized place (usePagination)
 * - Automatically recomputes total pages and clamps current page whenever filters, totalItems, or pageSize change
 */
export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  filterDeps = [],
  siblingCount = 1,
  className = "",
  showSummary = true,
  showPageSizeSelector = false,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  // Use centralized pagination hook: manages 1-based visible page,
  // clamps on filter/total change, and calculates 0-based offset in exactly one place.
  const {
    page,
    totalPages,
    startIndex,
    endIndex,
    hasPrevPage,
    hasNextPage,
    paginationRange,
    goToPage,
    prevPage,
    nextPage,
  } = usePagination({
    totalItems,
    pageSize,
    currentPage,
    onPageChange,
    siblingCount,
    filterDeps,
  });

  // If there are no items and no summary is needed, render nothing
  if (totalItems === 0) {
    if (!showSummary) return null;
    return (
      <div className={`flex items-center justify-between py-3 px-4 text-xs text-slate-500 ${className}`}>
        <span>Không có bản ghi nào</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs text-slate-400 ${className}`}
    >
      {/* Summary Info & Optional Page Size Picker */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {showSummary && (
          <div className="text-slate-400">
            Hiển thị{" "}
            <span className="font-semibold text-white font-mono">
              {startIndex} - {endIndex}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-semibold text-cyan-400 font-mono">
              {totalItems}
            </span>{" "}
            bản ghi
          </div>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Chọn số lượng bản ghi mỗi trang"
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Accessible Navigation Landmark */}
      <NavPagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          {/* Previous Page Link */}
          <PaginationItem>
            <PaginationPrevious
              onClick={prevPage}
              disabled={!hasPrevPage}
              label="Trước"
            />
          </PaginationItem>

          {/* Numbered Page Links & Ellipses */}
          {paginationRange.map((item, idx) => {
            if (item === "ellipsis-start" || item === "ellipsis-end") {
              return (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            const pageNumber = item as number;
            const isCurrent = pageNumber === page;

            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  isActive={isCurrent}
                  onClick={() => goToPage(pageNumber)}
                  aria-label={`Trang ${pageNumber}`}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Next Page Link */}
          <PaginationItem>
            <PaginationNext
              onClick={nextPage}
              disabled={!hasNextPage}
              label="Sau"
            />
          </PaginationItem>
        </PaginationContent>
      </NavPagination>
    </div>
  );
}

// Re-export low-level primitives and hook for flexible composition
export * from "@/components/ui/pagination";
export * from "@/hooks/use-pagination";
