"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Play,
} from "lucide-react";

interface DatabaseFile {
  name: string;
  physical_name: string;
  size_mb: number;
  type_desc: string;
}

interface DiskLogAbsensiProps {
  onClose?: () => void;
}

export default function DiskLogAbsensi({ onClose }: DiskLogAbsensiProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedSpace, setSavedSpace] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("execute");

  // Status database
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [dbFiles, setDbFiles] = useState<DatabaseFile[]>([]);
  const [recoveryModel, setRecoveryModel] = useState<string>("FULL");

  // Fetch status ukuran file database
  const fetchDbStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await axios.get("/api/admin/disklog");
      if (res.data?.success) {
        setDbFiles(res.data.files || []);
        if (res.data.recoveryModel) setRecoveryModel(res.data.recoveryModel);
      }
    } catch (err) {
      console.warn("Gagal mengambil status database:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleExecuteSQL = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    const toastId = toast.loading("Mengeksekusi shrink file log database...");

    try {
      const response = await axios.post("/api/admin/disklog");

      if (response.data?.success) {
        const msg = response.data.message || "Query disklog berhasil dijalankan!";
        toast.success(msg, { id: toastId });
        setStatusMessage(msg);
        setSavedSpace(response.data.savedMb ?? null);
        if (response.data.afterFiles) {
          setDbFiles(response.data.afterFiles);
        } else {
          fetchDbStatus();
        }
      } else {
        toast.error(response.data?.error || "Terjadi kesalahan", { id: toastId });
        setStatusMessage("Gagal mengeksekusi perintah.");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error, { id: toastId });
        setStatusMessage(error.response.data.error);
      } else {
        toast.error("Gagal saat mengeksekusi query database.", { id: toastId });
        setStatusMessage("Gagal");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const logFile = dbFiles.find((f) => f.type_desc === "LOG");
  const dataFile = dbFiles.find((f) => f.type_desc === "ROWS");

  return (
    <Card className="flex flex-col border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-xl text-zinc-900 dark:text-zinc-100">
      {/* HEADER */}
      <CardHeader className="pb-3 px-4 sm:px-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100 min-w-0">
            <div className="p-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <span className="truncate">Disklog Absensi & Repair System</span>
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer shrink-0"
            >
              Tutup
            </Button>
          )}
        </div>
        <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
          Perawatan ukuran transaction log database SQL Server (Absensi_log.ldf) tanpa proteksi password tambahan.
        </CardDescription>
      </CardHeader>

      {/* RINGKASAN UKURAN FILE DATABASE */}
      <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <HardDrive className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Data File (.mdf)</p>
              <p className="font-mono font-medium text-zinc-800 dark:text-zinc-100">
                {dataFile ? `${dataFile.size_mb} MB` : "Memuat..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <FileText className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Log File (.ldf)</p>
              <p className="font-mono font-medium text-zinc-800 dark:text-zinc-100">
                {logFile ? `${logFile.size_mb} MB` : "Memuat..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] text-zinc-400 uppercase font-semibold">Recovery Model</p>
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                {recoveryModel}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <CardContent className="flex-1 p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="grid grid-cols-2 max-w-sm mb-2">
            <TabsTrigger value="execute" className="flex items-center gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5" />
              Eksekusi Disklog
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-1.5 text-xs">
              <HardDrive className="h-3.5 w-3.5" />
              Info File Database
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXECUTE TAB */}
          <TabsContent value="execute" className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 space-y-3.5">
              <div>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Eksekusi Maintenance SQL Database
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Query ini akan menyusutkan file log transaksi database Absensi ke ukuran 1 MB untuk mencegah hard disk penuh.
                </p>
              </div>

              <div className="bg-zinc-900 dark:bg-zinc-950 text-zinc-200 p-3 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto border border-zinc-800 dark:border-zinc-800/80">
                <p className="text-zinc-500 dark:text-zinc-400">-- Perintah SQL yang akan dieksekusi:</p>
                <p className="text-emerald-400">ALTER DATABASE absensi SET RECOVERY SIMPLE;</p>
                <p className="text-sky-300">DBCC SHRINKFILE (absensi_log, 1);</p>
                <p className="text-emerald-400">ALTER DATABASE absensi SET RECOVERY FULL;</p>
              </div>

              <Button
                onClick={handleExecuteSQL}
                disabled={isProcessing}
                className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium cursor-pointer transition-colors"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isProcessing ? "Mengeksekusi Disklog..." : "Jalankan Query Disklog Sekarang (Shrink Log)"}
              </Button>

              {statusMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                    statusMessage.includes("berhasil") || statusMessage === "Success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {statusMessage.includes("berhasil") || statusMessage === "Success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p>{statusMessage}</p>
                    {savedSpace !== null && savedSpace > 0 && (
                      <p className="text-[11px] font-normal mt-0.5 text-emerald-700 dark:text-emerald-400">
                        Penghematan ruang disk: <strong>{savedSpace} MB</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: INFO FILE DATABASE */}
          <TabsContent value="info" className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Daftar Berkas Fisik SQL Server (sys.database_files)
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDbStatus}
                disabled={loadingStatus}
                className="h-7 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingStatus ? "animate-spin" : ""}`} />
                Segarkan
              </Button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-x-auto bg-white dark:bg-zinc-900">
              <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                    <th className="py-2 px-3 min-w-[120px]">Nama Logical</th>
                    <th className="py-2 px-3 min-w-[80px]">Tipe</th>
                    <th className="py-2 px-3 min-w-[90px]">Ukuran</th>
                    <th className="py-2 px-3 min-w-[180px]">Path Fisik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {dbFiles.map((file) => (
                    <tr key={file.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {file.name}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            file.type_desc === "LOG"
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                              : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {file.type_desc}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {file.size_mb} MB
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-xs">
                        {file.physical_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 pt-3">
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center w-full leading-relaxed">
          Peringatan: Menjalankan query ini akan mengubah recovery model database ke SIMPLE, mengecilkan file log transaksi (DBCC SHRINKFILE), dan mengembalikannya ke FULL. Pastikan Anda memiliki backup sebelum melakukan eksekusi.
        </p>
      </CardFooter>
    </Card>
  );
}
