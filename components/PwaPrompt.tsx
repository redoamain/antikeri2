"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // 1. Registrasi Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Service worker terdaftar dengan baik
        })
        .catch((err) => {
          console.warn("Gagal meregistrasi Service Worker:", err);
        });
    }

    // 2. Deteksi apakah sudah terpasang (Standalone Mode)
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      setIsStandalone(Boolean(isStandaloneMode));

      // 3. Deteksi iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIosDevice);

      // Cek apakah banner pernah di-dismiss di session ini
      const isDismissed = sessionStorage.getItem("antikeri_pwa_dismissed") === "true";
      setDismissed(isDismissed);

      // 4. Tangkap event beforeinstallprompt (Android / Chrome / Edge)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("Error saat memicu install prompt:", err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("antikeri_pwa_dismissed", "true");
    }
  };

  // Jangan tampilkan jika sudah standalone (sudah terpasang sebagai aplikasi) atau di-dismiss
  if (isStandalone || dismissed) {
    return null;
  }

  // Hanya tampilkan jika browser mendukung install prompt atau perangkat iOS
  if (!isInstallable && !isIos) {
    return null;
  }

  return (
    <>
      {/* Banner / Floating Bar Install PWA */}
      <aside
        aria-label="Pasang Aplikasi"
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-3 duration-300"
      >
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xl text-zinc-900 dark:text-zinc-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                Pasang Aplikasi Presensi
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 truncate">
                Akses cepat & offline di layar utama HP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium cursor-pointer transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Pasang
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              title="Tutup pemberitahuan"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Modal Petunjuk Khusus iOS (Safari) */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Pasang di iPhone / iPad</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Petunjuk Safari iOS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Tekan tombol <strong>Bagikan (Share)</strong></span>
                  <Share className="w-4 h-4 text-blue-500 inline shrink-0" />
                  <span>di menu bawah Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama</strong></span>
                  <PlusSquare className="w-4 h-4 text-emerald-500 inline shrink-0" />
                  <span>(*Add to Home Screen*).</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <span>Tekan <strong>Tambah (Add)</strong> di pojok kanan atas untuk menyelesaikan.</span>
              </div>
            </div>

            <Button
              className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium cursor-pointer"
              onClick={() => setShowIosGuide(false)}
            >
              Saya Mengerti
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
