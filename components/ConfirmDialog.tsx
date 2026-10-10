"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onCancel()}>
      <DialogContent className="max-w-md p-4 sm:p-5 w-[calc(100%-1.5rem)] sm:w-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl text-zinc-900 dark:text-zinc-100">
        <DialogHeader className="flex flex-row items-start gap-3 sm:gap-3.5 text-left space-y-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDestructive
                ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto h-9 px-3 text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto h-9 px-3 text-xs font-medium cursor-pointer transition-colors ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
            }`}
          >
            {loading ? "Memproses..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
