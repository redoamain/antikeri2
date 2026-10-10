"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import DiskLogAbsensi from "@/components/DiskLogAbsensi";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Shield,
  Users,
  CalendarCheck,
  Cpu,
  Search,
  RotateCcw,
  LogOut,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  Clock,
  Building,
  KeyRound,
  Pencil,
  Trash2,
  Database,
  MapPin,
  MapPinOff,
} from "lucide-react";

interface AdminUser {
  USERID: number;
  Badgenumber: string;
  Name: string;
  role: string;
}

interface MachineItem {
  ID: number;
  MachineAlias: string;
  sn: string;
  ProductType: string;
  Enabled: boolean;
}

interface AttendanceLog {
  CHECKTIME: string;
  rawChecktime?: string;
  USERID: number;
  Badgenumber: string;
  Name: string;
  DEPTNAME: string;
  SENSORID: string;
  MachineAlias: string;
  VERIFYCODE: number;
}

interface DepartmentItem {
  DEPTID: number;
  DEPTNAME: string;
}

interface DashboardStats {
  counts: {
    totalUsers: number;
    totalMachines: number;
    todayCheckins: number;
  };
  recentLogs: AttendanceLog[];
  machines: MachineItem[];
  departments: DepartmentItem[];
  adminUsers: AdminUser[];
  bypassEnabled?: boolean;
}

export default function AdminPage() {
  // Autentikasi Admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [adminName, setAdminName] = useState<string>("Administrator");

  // Data Dashboard
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"logs" | "machines" | "admins" | "disklog">("logs");
  const [testingMachineId, setTestingMachineId] = useState<number | null>(null);

  // State Pengaturan Bypass Geofence (Mode Testing)
  const [bypassEnabled, setBypassEnabled] = useState<boolean>(false);
  const [togglingBypass, setTogglingBypass] = useState<boolean>(false);
  const [showBypassConfirm, setShowBypassConfirm] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDept, selectedMachine]);

  // State Aksi Hapus Presensi
  const [deletingLog, setDeletingLog] = useState<AttendanceLog | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);

  // State Aksi Edit Presensi
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [editChecktimeInput, setEditChecktimeInput] = useState<string>("");
  const [editSensorIdInput, setEditSensorIdInput] = useState<string>("4");
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [showEditConfirm, setShowEditConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = sessionStorage.getItem("antikeri_admin_auth");
      const savedName = sessionStorage.getItem("antikeri_admin_name");
      if (savedAuth === "true") {
        setIsAdminAuthenticated(true);
        if (savedName) setAdminName(savedName);
      }
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchDashboardData();
    }
  }, [isAdminAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.error("Masukkan kata sandi atau PIN admin");
      return;
    }

    try {
      setLoginLoading(true);
      const res = await axios.post("/api/admin/login", {
        username: adminUsername,
        password: adminPassword,
      });

      if (res.data?.success) {
        setIsAdminAuthenticated(true);
        const name = res.data.user?.name || "Administrator";
        setAdminName(name);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("antikeri_admin_auth", "true");
          sessionStorage.setItem("antikeri_admin_name", name);
        }
        toast.success(`Selamat datang, ${name}!`);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Gagal melakukan verifikasi admin.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminPassword("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("antikeri_admin_auth");
      sessionStorage.removeItem("antikeri_admin_name");
    }
    toast.info("Anda telah keluar dari dashboard admin.");
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const res = await axios.get("/api/admin/stats");
      setData(res.data);
      if (typeof res.data?.bypassEnabled === "boolean") {
        setBypassEnabled(res.data.bypassEnabled);
      }
    } catch {
      toast.error("Gagal memuat data statistik dashboard.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleConfirmToggleBypass = async () => {
    const nextState = !bypassEnabled;
    try {
      setTogglingBypass(true);
      const res = await axios.post("/api/admin/bypass", { enabled: nextState });
      if (res.data?.success) {
        setBypassEnabled(nextState);
        setShowBypassConfirm(false);
        toast.success(
          res.data.message ||
            `Fitur bypass testing berhasil di${nextState ? "aktifkan" : "nonaktifkan"}.`
        );
      } else {
        toast.error(res.data?.error || "Gagal mengubah pengaturan bypass.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Terjadi kesalahan saat mengubah status bypass.");
      }
    } finally {
      setTogglingBypass(false);
    }
  };

  const handleTestSpeaker = async (sensorId: number, machineLabel: string) => {
    const toastId = toast.loading(`Memicu speaker mesin ${machineLabel}...`);
    try {
      setTestingMachineId(sensorId);
      const res = await axios.post("/api/sensors/test-voice", {
        sensorId: String(sensorId),
        voiceIndex: 0,
      });

      if (res.data?.success) {
        toast.success(`Speaker ${machineLabel} berbunyi "Terima Kasih"!`, { id: toastId });
      } else {
        toast.error(res.data?.message || `Mesin ${machineLabel} tidak merespon`, { id: toastId });
      }
    } catch {
      toast.error(`Gagal menghubungi mesin ${machineLabel}. Pastikan mesin aktif di LAN.`, {
        id: toastId,
      });
    } finally {
      setTestingMachineId(null);
    }
  };

  // Helper untuk format display waktu lokal Indonesia (id-ID) tanpa pergeseran zona waktu
  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return "";
    // Bersihkan dari format ISO UTC jika ada ("T", "Z")
    const clean = timeStr.replace("T", " ").replace("Z", "").slice(0, 19);
    const [datePart, timePart] = clean.split(" ");
    if (!datePart || !timePart) {
      const d = new Date(timeStr);
      return isNaN(d.getTime()) ? timeStr : d.toLocaleString("id-ID");
    }
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm, ss] = timePart.split(":").map(Number);
    const dateObj = new Date(y, m - 1, d, hh, mm, ss || 0);
    if (isNaN(dateObj.getTime())) return timeStr;
    return dateObj.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Helper untuk preview tanggal regional Indonesia (id-ID) lengkap dengan hari dan WIB
  const formatIndonesiaDatePreview = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const [dPart, tPart] = isoStr.split("T");
      if (!dPart) return "";
      const [year, month, day] = dPart.split("-").map(Number);
      const [hour, minute] = (tPart || "00:00").split(":").map(Number);
      const date = new Date(year, month - 1, day, hour, minute);
      const dateStr = date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return `${dateStr}, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`;
    } catch {
      return isoStr;
    }
  };

  // Buka Modal Edit
  const handleOpenEdit = (log: AttendanceLog) => {
    setEditingLog(log);
    const raw = (log.rawChecktime || log.CHECKTIME || "").replace("T", " ").slice(0, 16);
    setEditChecktimeInput(raw.replace(" ", "T"));
    setEditSensorIdInput(log.SENSORID || "4");
  };

  // Eksekusi Simpan Perubahan Waktu Presensi
  const handleConfirmEdit = async () => {
    if (!editingLog || !editChecktimeInput) return;

    try {
      setEditSubmitting(true);
      // Format ke "YYYY-MM-DD HH:MM:SS"
      let formattedNewTime = editChecktimeInput.replace("T", " ");
      if (formattedNewTime.length === 16) {
        formattedNewTime += ":00";
      }

      const originalTime =
        editingLog.rawChecktime ||
        new Date(editingLog.CHECKTIME).toISOString().slice(0, 19).replace("T", " ");

      const res = await axios.put("/api/admin/logs", {
        userId: editingLog.USERID,
        originalChecktime: originalTime,
        newChecktime: formattedNewTime,
        sensorId: editSensorIdInput,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Waktu presensi berhasil diperbarui!");
        setEditingLog(null);
        setShowEditConfirm(false);
        fetchDashboardData();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Gagal memperbarui data presensi.");
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // Eksekusi Hapus Presensi
  const handleConfirmDelete = async () => {
    if (!deletingLog) return;

    try {
      setDeleteSubmitting(true);
      const originalTime =
        deletingLog.rawChecktime ||
        new Date(deletingLog.CHECKTIME).toISOString().slice(0, 19).replace("T", " ");

      const res = await axios.delete("/api/admin/logs", {
        data: {
          userId: deletingLog.USERID,
          checktime: originalTime,
        },
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Data presensi berhasil dihapus!");
        setDeletingLog(null);
        fetchDashboardData();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Gagal menghapus data presensi.");
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filter logs berdasarkan pencarian teks, departemen, dan mesin
  const filteredLogs = (data?.recentLogs || []).filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (log.Name || "").toLowerCase().includes(q) ||
      (log.Badgenumber || "").toLowerCase().includes(q) ||
      (log.DEPTNAME || "").toLowerCase().includes(q) ||
      (log.MachineAlias || "").toLowerCase().includes(q);

    const matchesDept =
      selectedDept === "all" ||
      (log.DEPTNAME || "").trim().toLowerCase() === selectedDept.trim().toLowerCase();

    const matchesMachine =
      selectedMachine === "all" ||
      String(log.SENSORID) === selectedMachine;

    return matchesSearch && matchesDept && matchesMachine;
  });

  // Kalkulasi Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Helper nomor halaman untuk pagination bar
  const getPaginationPages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-600 border-t-zinc-800 dark:border-t-zinc-200 rounded-full animate-spin" />
      </main>
    );
  }

  // Layar Login Admin Sederhana
  if (!isAdminAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 antialiased text-zinc-900 dark:text-zinc-100">
        <div className="w-full max-w-sm relative">
          <div className="absolute right-0 -top-10">
            <ThemeToggle />
          </div>
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Dashboard Admin
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                PT. Citi Plumb — Sistem Manajemen Presensi
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-3.5 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Username atau NIK Admin
                  </label>
                  <Input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Contoh: admin atau NIK"
                    className="h-10 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Kata Sandi atau PIN Admin
                  </label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan sandi / PIN..."
                    className="h-10 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm"
                    autoFocus
                  />
                </div>

                <div className="text-[11px] text-zinc-400 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-start gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    Bisa login dengan NIK & PIN Super Admin dari database atau master password.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-colors cursor-pointer"
                >
                  {loginLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
                </Button>

                <div className="text-center pt-1">
                  <Link
                    href="/"
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Kembali ke Presensi Karyawan
                  </Link>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  // Tampilan Utama Dashboard Admin
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none truncate">
                Admin Presensi
              </h1>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">PT. Citi Plumb</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Badge
              variant="outline"
              className="hidden md:inline-flex bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-normal"
            >
              {adminName}
            </Badge>

            <ThemeToggle />

            <Button
              variant={activeTab === "disklog" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(activeTab === "disklog" ? "logs" : "disklog")}
              title="Fitur Disklog DB"
              className={`h-8 px-2 sm:px-3 text-xs cursor-pointer ${
                activeTab === "disklog"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Database className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Disklog DB</span>
            </Button>

            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                title="Halaman Absensi Karyawan"
                className="h-8 px-2 sm:px-3 text-xs border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Halaman Absensi</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Keluar dari Admin"
              className="h-8 px-2 sm:px-3 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Karyawan</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {data?.counts?.totalUsers ?? "..."}
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Terdaftar di USERINFO</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Presensi Hari Ini</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {data?.counts?.todayCheckins ?? "..."}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  Transaksi Masuk / Pulang
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
            <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Mesin Presensi</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {data?.counts?.totalMachines ?? 6} Unit
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Solution X105-ID</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kontrol Bypass Lokasi GPS (Geofence Testing) */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs rounded-xl overflow-hidden">
          <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-3.5">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  bypassEnabled
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {bypassEnabled ? (
                  <MapPin className="w-4 h-4 animate-pulse" />
                ) : (
                  <MapPinOff className="w-4 h-4" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Bypass Lokasi GPS (Mode Testing Luar Kantor)
                  </h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium ${
                      bypassEnabled
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                        : "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                    }`}
                  >
                    {bypassEnabled ? "● Bypass Aktif (Testing Diizinkan)" : "✓ Bypass Nonaktif (Ketat 100m)"}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal max-w-2xl">
                  {bypassEnabled
                    ? "Tombol bypass ditampilkan di halaman presensi karyawan sehingga presensi dapat diuji coba dari luar area PT. Citi Plumb."
                    : "Geofence 100 meter diberlakukan secara ketat. Karyawan wajib berada di lokasi kantor/pabrik dan tombol bypass disembunyikan."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant={bypassEnabled ? "destructive" : "default"}
              size="sm"
              onClick={() => setShowBypassConfirm(true)}
              disabled={togglingBypass}
              className={`w-full sm:w-auto h-8 px-3 text-xs font-medium cursor-pointer shrink-0 transition-colors ${
                bypassEnabled
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900"
              }`}
            >
              {togglingBypass ? (
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : bypassEnabled ? (
                <MapPinOff className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
              )}
              {bypassEnabled ? "Matikan Bypass" : "Aktifkan Bypass"}
            </Button>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
          <button
            onClick={() => setActiveTab("logs")}
            className={`shrink-0 pb-2.5 px-2.5 sm:px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "logs"
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Log Presensi Terbaru
          </button>
          <button
            onClick={() => setActiveTab("machines")}
            className={`shrink-0 pb-2.5 px-2.5 sm:px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "machines"
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Mesin Sensor ({data?.machines?.length || 6})
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`shrink-0 pb-2.5 px-2.5 sm:px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "admins"
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Daftar Admin Sistem
          </button>
          <button
            onClick={() => setActiveTab("disklog")}
            className={`shrink-0 pb-2.5 px-2.5 sm:px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "disklog"
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Disklog Absensi
          </button>
        </div>

        {/* TAB 1: Log Presensi Terbaru */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {/* Filter Toolbar: Pencarian, Departemen, dan Mesin */}
            <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 flex-1 items-stretch sm:items-center flex-wrap">
                {/* Pencarian Nama / NIK */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Cari nama, NIK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 text-xs bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Filter Departemen */}
                <div className="w-full sm:w-48">
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="w-full h-9 px-3 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <SelectValue placeholder="Semua Departemen" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <SelectItem value="all">Semua Departemen</SelectItem>
                      {(data?.departments || []).map((d) => (
                        <SelectItem key={d.DEPTID} value={d.DEPTNAME}>
                          {d.DEPTNAME}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Mesin / Sensor */}
                <div className="w-full sm:w-44">
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger className="w-full h-9 px-3 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Cpu className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <SelectValue placeholder="Semua Mesin" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <SelectItem value="all">Semua Mesin</SelectItem>
                      {(data?.machines || []).map((m) => (
                        <SelectItem key={m.ID} value={String(m.ID)}>
                          {m.MachineAlias}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tombol Reset Filter jika ada filter aktif */}
                {(selectedDept !== "all" || selectedMachine !== "all" || searchQuery) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDept("all");
                      setSelectedMachine("all");
                      setSearchQuery("");
                    }}
                    className="h-9 px-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {filteredLogs.length} data {filteredLogs.length > 0 && `(Hal ${currentPage}/${totalPages})`}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDashboardData}
                  disabled={loadingData}
                  className="h-9 text-xs border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 cursor-pointer transition-colors"
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 mr-1.5 ${loadingData ? "animate-spin" : ""}`}
                  />
                  Segarkan
                </Button>
              </div>
            </div>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                      <th className="py-2.5 px-3 sm:px-4 min-w-[140px]">Waktu Presensi</th>
                      <th className="py-2.5 px-3 sm:px-4 min-w-[75px]">NIK</th>
                      <th className="py-2.5 px-3 sm:px-4 min-w-[120px]">Nama Karyawan</th>
                      <th className="py-2.5 px-3 sm:px-4 min-w-[110px]">Departemen</th>
                      <th className="py-2.5 px-3 sm:px-4 min-w-[110px]">Mesin Sensor</th>
                      <th className="py-2.5 px-3 sm:px-4 min-w-[90px]">Metode</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right min-w-[70px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-400 dark:text-zinc-500">
                          {loadingData ? "Memuat log presensi..." : "Tidak ada transaksi presensi ditemukan."}
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log, index) => {
                        const formattedTime = formatDisplayTime(log.rawChecktime || log.CHECKTIME);

                        return (
                          <tr key={index} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-2.5 px-3 sm:px-4 font-mono text-zinc-700 dark:text-zinc-300">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span className="truncate">{formattedTime}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 font-mono text-zinc-500 dark:text-zinc-400">
                              {log.Badgenumber || `#${log.USERID}`}
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 font-medium text-zinc-900 dark:text-zinc-100">
                              {log.Name || "Karyawan"}
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 text-zinc-600 dark:text-zinc-300">
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span className="truncate">{log.DEPTNAME || "Umum"}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 text-zinc-700 dark:text-zinc-300">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              >
                                {log.MachineAlias || `Sensor ${log.SENSORID}`}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 text-zinc-600 dark:text-zinc-300">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                              >
                                {log.VERIFYCODE === 1 ? "Sidik Jari" : "Presensi Web"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 sm:px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(log)}
                                  title="Edit Waktu Presensi"
                                  className="h-7 w-7 p-0 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md cursor-pointer transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingLog(log)}
                                  title="Hapus Data Presensi"
                                  className="h-7 w-7 p-0 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Kontrol Pagination */}
              {filteredLogs.length > 0 && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="text-center sm:text-left">
                      Menampilkan <strong className="font-medium text-zinc-900 dark:text-zinc-100">{startIndex + 1}</strong> -{" "}
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">{endIndex}</strong> dari{" "}
                      <strong className="font-medium text-zinc-900 dark:text-zinc-100">{filteredLogs.length}</strong> data presensi
                    </span>
                    <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Baris:</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(val) => {
                          setItemsPerPage(Number(val));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-7 w-18 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Pagination className="mx-0 w-auto justify-center md:justify-end">
                    <PaginationContent className="flex-wrap justify-center">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={currentPage === 1 ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}
                        />
                      </PaginationItem>

                      {getPaginationPages().map((item, idx) => {
                        if (item === "ellipsis") {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={item}>
                            <PaginationLink
                              isActive={currentPage === item}
                              onClick={() => setCurrentPage(item)}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={currentPage === totalPages ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: Daftar Mesin & Kontrol Suara */}
        {activeTab === "machines" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.machines || []).map((m) => {
              const isTesting = testingMachineId === m.ID;
              return (
                <Card key={m.ID} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {m.MachineAlias || `Sensor ${m.ID}`}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-normal"
                        >
                          Sensor ID #{m.ID}
                        </Badge>
                      </div>

                      <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                        <p>Model: {m.ProductType || "Solution X105-ID"}</p>
                        <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">SN: {m.sn || "-"}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestSpeaker(m.ID, m.MachineAlias)}
                      disabled={isTesting}
                      className="h-8 text-xs border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
                    >
                      <Volume2 className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? "animate-pulse" : ""}`} />
                      {isTesting ? "Membunyikan..." : "Test Suara"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 3: Daftar Admin Terdaftar di Sistem */}
        {activeTab === "admins" && (
          <div className="space-y-4">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-4">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Daftar Super Administrator dari Database (USERINFO)
              </h4>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(data?.adminUsers || []).map((admin) => (
                  <div key={admin.USERID} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{admin.Name}</p>
                        <p className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">NIK: {admin.Badgenumber}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[11px] border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {admin.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: Fitur Disklog Absensi (Maintenance Database) */}
        {activeTab === "disklog" && (
          <div className="max-w-3xl mx-auto">
            <DiskLogAbsensi onClose={() => setActiveTab("logs")} />
          </div>
        )}
      </main>

      {/* Modal Dialog Edit Waktu Presensi */}
      <Dialog open={!!editingLog} onOpenChange={(isOpen) => !isOpen && setEditingLog(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-md p-4 sm:p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Waktu Presensi
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Ubah waktu dan sensor presensi untuk{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{editingLog?.Name}</strong> (#{editingLog?.Badgenumber})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Waktu Presensi Baru
                </label>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 font-normal border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  WIB (UTC+7)
                </Badge>
              </div>
              <Input
                type="datetime-local"
                value={editChecktimeInput}
                onChange={(e) => setEditChecktimeInput(e.target.value)}
                className="h-10 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono"
              />
              {/* Preview Format Regional Indonesia */}
              <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800/80 px-2.5 py-1.5 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {formatIndonesiaDatePreview(editChecktimeInput)}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                  id-ID
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Mesin / Sensor ID</label>
              <Select value={editSensorIdInput} onValueChange={setEditSensorIdInput}>
                <SelectTrigger className="w-full h-10 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs">
                  <SelectValue placeholder="Pilih sensor" />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  {(data?.machines || []).map((m) => (
                    <SelectItem key={m.ID} value={String(m.ID)}>
                      {m.MachineAlias} (Sensor #{m.ID})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingLog(null)}
              className="w-full sm:w-auto h-9 px-3 text-xs border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowEditConfirm(true)}
              className="w-full sm:w-auto h-9 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 cursor-pointer font-medium transition-colors"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Reusable */}
      <ConfirmDialog
        open={!!deletingLog}
        title="Hapus Data Presensi"
        description={
          deletingLog ? (
            <span>
              Apakah Anda yakin ingin menghapus data presensi karyawan{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{deletingLog.Name}</strong> (#{deletingLog.Badgenumber})
              pada waktu{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {formatDisplayTime(deletingLog.rawChecktime || deletingLog.CHECKTIME)}
              </strong>
              ? Data ini akan dihapus secara permanen dari database.
            </span>
          ) : (
            ""
          )
        }
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        variant="destructive"
        loading={deleteSubmitting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingLog(null)}
      />

      {/* Dialog Konfirmasi Simpan Edit Reusable */}
      <ConfirmDialog
        open={showEditConfirm}
        title="Konfirmasi Perubahan Waktu"
        description={
          <span>
            Apakah Anda yakin ingin mengubah waktu presensi karyawan{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">{editingLog?.Name}</strong> menjadi{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {editChecktimeInput.replace("T", " ")}
            </strong>
            ?
          </span>
        }
        confirmText="Ya, Simpan"
        cancelText="Kembali"
        variant="default"
        loading={editSubmitting}
        onConfirm={handleConfirmEdit}
        onCancel={() => setShowEditConfirm(false)}
      />

      {/* Dialog Konfirmasi Toggle Bypass Reusable */}
      <ConfirmDialog
        open={showBypassConfirm}
        title={bypassEnabled ? "Nonaktifkan Fitur Bypass?" : "Aktifkan Fitur Bypass Lokasi?"}
        description={
          bypassEnabled ? (
            <span>
              Apakah Anda yakin ingin <strong className="text-zinc-800 dark:text-zinc-200">menonaktifkan</strong> fitur bypass testing? Tombol bypass di halaman presensi karyawan akan disembunyikan sepenuhnya, dan seluruh karyawan wajib berada dalam radius 100 meter dari kantor/pabrik.
            </span>
          ) : (
            <span>
              Apakah Anda yakin ingin <strong className="text-zinc-800 dark:text-zinc-200">mengaktifkan</strong> fitur bypass testing? Tombol bypass akan dimunculkan di halaman presensi karyawan untuk keperluan simulasi & pengujian dari luar kantor.
            </span>
          )
        }
        confirmText={bypassEnabled ? "Ya, Nonaktifkan" : "Ya, Aktifkan Bypass"}
        cancelText="Batal"
        variant={bypassEnabled ? "destructive" : "default"}
        loading={togglingBypass}
        onConfirm={handleConfirmToggleBypass}
        onCancel={() => setShowBypassConfirm(false)}
      />
    </div>
  );
}
