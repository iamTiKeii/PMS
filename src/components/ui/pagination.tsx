import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1.5", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  disabled?: boolean;
} & (
  | (React.ComponentProps<"button"> & { href?: undefined })
  | (React.ComponentProps<"a"> & { href: string })
);

const PaginationLink = ({
  className,
  isActive,
  disabled,
  children,
  ...props
}: PaginationLinkProps) => {
  const commonClasses = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold ring-offset-background transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40 select-none",
    "h-9 min-w-9 px-3",
    isActive
      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 border border-blue-500/40 dark:bg-blue-600 dark:text-white"
      : "bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800/80 dark:text-slate-300",
    disabled && "opacity-40 cursor-not-allowed hover:bg-transparent pointer-events-none",
    className
  );

  if ("href" in props && props.href) {
    return (
      <a
        aria-current={isActive ? "page" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        className={commonClasses}
        {...(props as React.ComponentProps<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      disabled={disabled}
      className={commonClasses}
      {...(props as React.ComponentProps<"button">)}
    >
      {children}
    </button>
  );
};
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  label = "Trước",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { label?: string }) => (
  <PaginationLink
    aria-label="Đi tới trang trước"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span className="hidden sm:inline">{label}</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  label = "Sau",
  ...props
}: React.ComponentProps<typeof PaginationLink> & { label?: string }) => (
  <PaginationLink
    aria-label="Đi tới trang tiếp theo"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span className="hidden sm:inline">{label}</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex h-9 w-9 items-center justify-center text-slate-400 select-none",
      className
    )}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">Các trang bị thu gọn</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
