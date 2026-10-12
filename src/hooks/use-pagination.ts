"use client";

import { useMemo, useEffect, useState } from "react";

export type PaginationItemType = number | "ellipsis-start" | "ellipsis-end";

export interface UsePaginationOptions {
  /**
   * Total number of items across all pages.
   */
  totalItems: number;
  /**
   * Number of items per page. Defaults to 10.
   */
  pageSize?: number;
  /**
   * Current visible page (1-based index). Defaults to 1.
   */
  initialPage?: number;
  /**
   * Controlled page state (1-based index) if managed externally.
   */
  currentPage?: number;
  /**
   * Callback fired when page changes.
   */
  onPageChange?: (page: number) => void;
  /**
   * Number of sibling pages to show on each side of the active page. Defaults to 1.
   */
  siblingCount?: number;
  /**
   * Optional dependencies (e.g. active filters/search query) that should reset or re-clamp the page.
   */
  filterDeps?: unknown[];
}

export interface UsePaginationReturn {
  /**
   * Visible page number (1-based: 1, 2, 3...).
   */
  page: number;
  /**
   * Total number of pages, recomputed dynamically: Math.max(1, Math.ceil(totalItems / pageSize)).
   */
  totalPages: number;
  /**
   * Total number of records.
   */
  totalItems: number;
  /**
   * Current page size.
   */
  pageSize: number;
  /**
   * Single source of truth for 0-based offset: (page - 1) * pageSize.
   * CONVERTED TO 0-BASED OFFSET IN EXACTLY ONE PLACE.
   */
  offset: number;
  /**
   * 1-based start item index for "Showing X to Y of Z" displays.
   */
  startIndex: number;
  /**
   * 1-based end item index for "Showing X to Y of Z" displays.
   */
  endIndex: number;
  /**
   * Whether previous page is accessible.
   */
  hasPrevPage: boolean;
  /**
   * Whether next page is accessible.
   */
  hasNextPage: boolean;
  /**
   * Sequence of page numbers and ellipsis tokens for rendering.
   */
  paginationRange: PaginationItemType[];
  /**
   * Navigate to a specific 1-based page, automatically clamped.
   */
  goToPage: (targetPage: number) => void;
  /**
   * Navigate to previous page.
   */
  prevPage: () => void;
  /**
   * Navigate to next page.
   */
  nextPage: () => void;
}

/**
 * Custom hook to manage accessible, clamped 1-based pagination
 * and convert to 0-based offsets in exactly one centralized location.
 */
export function usePagination({
  totalItems,
  pageSize = 10,
  initialPage = 1,
  currentPage: controlledPage,
  onPageChange,
  siblingCount = 1,
  filterDeps = [],
}: UsePaginationOptions): UsePaginationReturn {
  // 1. Internal page state (1-based)
  const [internalPage, setInternalPage] = useState<number>(initialPage);

  // Active page: controlled or uncontrolled
  const rawPage = controlledPage !== undefined ? controlledPage : internalPage;

  // 2. Recompute total pages whenever totalItems or pageSize changes
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / safePageSize));

  // 3. Clamping logic: whenever filters, totals, or page size change, clamp current page
  const clampedPage = Math.min(Math.max(1, rawPage), totalPages);

  // Synchronize internal state or fire callback if the page had to be clamped
  useEffect(() => {
    if (rawPage !== clampedPage) {
      if (controlledPage === undefined) {
        setInternalPage(clampedPage);
      }
      onPageChange?.(clampedPage);
    }
  }, [clampedPage, rawPage, controlledPage, onPageChange]);

  // When filters change, reset to page 1 or clamp if needed
  useEffect(() => {
    if (filterDeps.length > 0) {
      const resetPage = 1;
      if (controlledPage === undefined) {
        setInternalPage(resetPage);
      }
      onPageChange?.(resetPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...filterDeps]);

  // Update page handler
  const goToPage = (targetPage: number) => {
    const nextClamped = Math.min(Math.max(1, targetPage), totalPages);
    if (controlledPage === undefined) {
      setInternalPage(nextClamped);
    }
    onPageChange?.(nextClamped);
  };

  const prevPage = () => {
    if (clampedPage > 1) {
      goToPage(clampedPage - 1);
    }
  };

  const nextPage = () => {
    if (clampedPage < totalPages) {
      goToPage(clampedPage + 1);
    }
  };

  // 4. CONVERT TO 0-BASED OFFSET IN EXACTLY ONE PLACE
  // All consumers (database queries, slice calls, API params) receive this exact offset.
  const offset = (clampedPage - 1) * safePageSize;

  // Range metadata for "Showing 1-10 of 42"
  const startIndex = totalItems === 0 ? 0 : offset + 1;
  const endIndex = Math.min(offset + safePageSize, totalItems);

  // 5. Generate pagination array with collapsed ellipsis range
  const paginationRange = useMemo<PaginationItemType[]>(() => {
    // Total page numbers to show = siblingCount + firstPage + lastPage + currentPage + 2*ellipsis
    const totalPageNumbers = siblingCount * 2 + 5;

    // Case 1: If total pages is less than the page numbers we want to show, show all
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const leftSiblingIndex = Math.max(clampedPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(clampedPage + siblingCount, totalPages);

    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: No left ellipsis, but right ellipsis needed
    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, idx) => idx + 1);
      return [...leftRange, "ellipsis-end", lastPageIndex];
    }

    // Case 3: Left ellipsis needed, but no right ellipsis
    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, idx) => totalPages - rightItemCount + idx + 1
      );
      return [firstPageIndex, "ellipsis-start", ...rightRange];
    }

    // Case 4: Both left and right ellipsis needed
    if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, idx) => leftSiblingIndex + idx
      );
      return [firstPageIndex, "ellipsis-start", ...middleRange, "ellipsis-end", lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }, [totalPages, clampedPage, siblingCount]);

  return {
    page: clampedPage,
    totalPages,
    totalItems,
    pageSize: safePageSize,
    offset,
    startIndex,
    endIndex,
    hasPrevPage: clampedPage > 1,
    hasNextPage: clampedPage < totalPages,
    paginationRange,
    goToPage,
    prevPage,
    nextPage,
  };
}
