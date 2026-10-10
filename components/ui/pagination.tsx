import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<"button">;

function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size: "sm",
        }),
        "h-8 min-w-8 px-2 text-xs cursor-pointer",
        isActive && "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-semibold shadow-xs text-zinc-900 dark:text-zinc-100",
        className
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  text = "Sebelumnya",
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Halaman sebelumnya"
      className={cn("gap-1 pl-2 pr-2.5", className)}
      {...props}
    >
      <ChevronLeft className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Berikutnya",
  ...props
}: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Halaman berikutnya"
      className={cn("gap-1 pl-2.5 pr-2", className)}
      {...props}
    >
      <span className="hidden sm:inline">{text}</span>
      <ChevronRight className="w-3.5 h-3.5" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-8 items-center justify-center text-zinc-400", className)}
      {...props}
    >
      <MoreHorizontal className="w-3.5 h-3.5" />
      <span className="sr-only">Lebih banyak halaman</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
