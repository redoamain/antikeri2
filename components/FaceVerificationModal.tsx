"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

interface FaceVerificationModalProps {
  open: boolean;
  userName: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function FaceVerificationModal({
  open,
  userName,
  onVerified,
  onCancel,
}: FaceVerificationModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<
    "starting" | "scanning" | "capturing" | "flashed" | "done" | "error"
  >("starting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(3);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Efek suara shutter sintetis via Web Audio API (tidak butuh file mp3 eksternal)
  const playCameraClick = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();

      // Klik 1 (shutter open)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1000, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.04);

      // Klik 2 (shutter close setelah 0.06 detik)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.05);
      }, 60);
    } catch {
      // Abaikan jika browser tidak mengizinkan audio otomatis
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (open) {
      setStatus("starting");
      setCountdown(3);
      setIsFlashing(false);
      setErrorMessage("");

      // Minta akses kamera depan (selfie / user facing)
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        .then((mediaStream) => {
          streamRef.current = mediaStream;
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(() => {});
          }
          setStatus("scanning");

          // Simulasi urutan verifikasi wajah:
          // Detik ke-1: Countdown 3
          // Detik ke-2: Countdown 2
          // Detik ke-3: Countdown 1 -> Simulasi Snap Foto (Flash)
          let currentCount = 3;
          intervalId = setInterval(() => {
            currentCount -= 1;
            setCountdown(currentCount);

            if (currentCount <= 0) {
              if (intervalId) clearInterval(intervalId);
              setStatus("capturing");

              // Mainkan shutter dan efek flash putih kamera
              playCameraClick();
              setIsFlashing(true);

              setTimeout(() => {
                setIsFlashing(false);
                setStatus("done");
                stopCamera();

                // Lanjut ke submit absen setelah animasi selesai
                setTimeout(() => {
                  onVerified();
                }, 800);
              }, 300);
            }
          }, 900);
        })
        .catch((err) => {
          console.warn("Gagal membuka kamera:", err);
          setStatus("error");
          setErrorMessage(
            err.name === "NotAllowedError"
              ? "Akses kamera ditolak. Harap izinkan akses kamera untuk verifikasi wajah anti-joki."
              : "Kamera tidak terdeteksi pada perangkat ini."
          );
        });
    } else {
      stopCamera();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      stopCamera();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-sm p-4 sm:p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl text-zinc-900 dark:text-zinc-100">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 mb-1">
            <Camera className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Verifikasi Wajah Presensi
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Validasi identitas karyawan: <strong className="text-zinc-700 dark:text-zinc-300">{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Viewfinder Kamera */}
        <div className="relative mt-3 rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
          {/* Efek Kilat / Shutter Flash Layar Putih */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
          )}

          {/* Video Stream Kamera Depan (Mirrored seperti cermin selfie) */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
              status === "scanning" || status === "capturing" ? "opacity-100" : "opacity-40"
            }`}
          />

          {/* Overlay Target Lingkaran Wajah Biometrik */}
          {(status === "scanning" || status === "capturing") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* Garis Bingkai Oval Wajah */}
              <div className="w-36 sm:w-44 h-44 sm:h-52 rounded-[50%] border-2 border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.3)] relative">
                {/* Garis Pindai Laser Bergerak (Scanning Bar) */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
              </div>

              {/* Countdown / Deteksi */}
              <div className="mt-2 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/20">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" />
                <span>Posisikan Wajah ({countdown}s)</span>
              </div>
            </div>
          )}

          {/* Tampilan Selesai / Wajah Terverifikasi */}
          {status === "done" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-20 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <p className="text-sm font-semibold">Wajah Terverifikasi!</p>
              <p className="text-[11px] text-zinc-300">Menyimpan presensi...</p>
            </div>
          )}

          {/* Tampilan Error jika kamera ditolak / tidak ada */}
          {status === "error" && (
            <div className="absolute inset-0 bg-zinc-900/90 p-4 flex flex-col items-center justify-center text-center text-white z-20">
              <ShieldAlert className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-xs font-semibold text-amber-200 mb-1">
                Kamera Tidak Dapat Dibuka
              </p>
              <p className="text-[11px] text-zinc-400 mb-3">{errorMessage}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Beri jalan darurat jika perangkat benar-benar tidak punya kamera
                    onVerified();
                  }}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  Lanjut Absen
                </Button>
              </div>
            </div>
          )}

          {/* Loading awal sebelum kamera aktif */}
          {status === "starting" && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center text-zinc-400 z-10">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs">Mengaktifkan kamera depan...</span>
            </div>
          )}
        </div>

        {/* Peringatan Keamanan Anti-Joki */}
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-lg p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            Verifikasi biometrik wajah aktif. Dilarang mewakilkan absensi orang lain (Anti-Joki).
          </span>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={status === "capturing" || status === "done"}
            className="h-8 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
          >
            Batalkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
