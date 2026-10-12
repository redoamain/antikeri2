"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Check,
  ChevronsUpDown,
  User as UserIcon,
  Clock,
  Fingerprint,
  RotateCcw,
  Cpu,
  MapPin,
  AlertCircle,
  Lock,
  LogOut,
  Volume2,
  Camera,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FaceVerificationModal } from "@/components/FaceVerificationModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MachineOption {
  SENSORID: string;
  sn: string;
  label?: string;
}

interface LocationItem {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  radius: number;
}

interface GeoState {
  loading: boolean;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
  isInside: boolean;
  error: string | null;
}

// Formula Haversine untuk menghitung jarak akurat dalam satuan meter
function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Mendapatkan waktu saat ini dalam zona waktu resmi Indonesia (Asia/Jakarta / WIB, UTC+7)
function getIndonesiaNowISO(): string {
  try {
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return formatter.format(new Date()).replace(" ", "T");
  } catch {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  }
}

// Format representasi teks tanggal regional Indonesia (id-ID) lengkap dengan hari dan WIB
function formatIndonesiaDatePreview(isoStr: string): string {
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
}

const HomePage: React.FC = () => {
  // Keamanan Sandi Akses
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Form Absensi
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checktime, setChecktime] = useState<string>(getIndonesiaNowISO());
  const [loading, setLoading] = useState<boolean>(false);
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [openCombobox, setOpenCombobox] = useState<boolean>(false);

  // Tempat Sensor ID & SN (default ATT Office: SENSORID 1)
  const [sensorId, setSensorId] = useState<string>("1");
  const [sn, setSn] = useState<string>("A5NS190560046");
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [testingVoice, setTestingVoice] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);

  // Lokasi Resmi PT. Citi Plumb
  const [locations, setLocations] = useState<LocationItem[]>([
    {
      id: "office",
      name: "PT. Citi Plumb",
      lat: -7.0975488,
      lng: 112.3876864,
      radius: 500,
    },
    {
      id: "factory",
      name: "PT. Citi Plumb",
      lat: -7.1043177,
      lng: 112.3820146,
      radius: 500,
    },
  ]);

  // State Geolocation
  const [geo, setGeo] = useState<GeoState>({
    loading: true,
    latitude: null,
    longitude: null,
    distance: null,
    isInside: false,
    error: null,
  });
  const [isMockLocation, setIsMockLocation] = useState<boolean>(false);
  const [bypassAllowed, setBypassAllowed] = useState<boolean>(false);

  // Periksa session saat pertama kali mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = sessionStorage.getItem("antikeri_auth");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }
      setCheckingAuth(false);
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      toast.error("Masukkan kata sandi akses terlebih dahulu");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await axios.post("/api/auth", { password: passwordInput });
      if (res.data?.success) {
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("antikeri_auth", "true");
        }
        toast.success("Akses berhasil dibuka");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Kata sandi salah");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("antikeri_auth");
    }
    toast.info("Akses aplikasi berhasil dikunci");
  };

  const evaluatePosition = (lat: number, lng: number, locList: LocationItem[]) => {
    const validLocs = locList.filter(
      (l) => typeof l.lat === "number" && typeof l.lng === "number"
    );

    let isInside = false;
    let minDistance = Infinity;

    for (const loc of validLocs) {
      if (loc.lat !== null && loc.lng !== null) {
        const d = getDistanceInMeters(lat, lng, loc.lat, loc.lng);
        if (d < minDistance) {
          minDistance = d;
        }
        if (d <= (loc.radius || 100)) {
          isInside = true;
          minDistance = d;
          break;
        }
      }
    }

    return {
      isInside,
      distance: minDistance === Infinity ? null : minDistance,
    };
  };

  const checkLocation = (customLocList?: LocationItem[]) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeo((prev) => ({
        ...prev,
        loading: false,
        isInside: false,
        error: "Browser atau perangkat tidak mendukung GPS/Lokasi.",
      }));
      return;
    }

    setGeo((prev) => ({ ...prev, loading: true, error: null }));

    const currentLocs = customLocList || locations;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const evalRes = evaluatePosition(lat, lng, currentLocs);

        setGeo({
          loading: false,
          latitude: lat,
          longitude: lng,
          distance: evalRes.distance,
          isInside: evalRes.isInside,
          error: null,
        });

        if (!evalRes.isInside) {
          toast.error(
            `Di luar area PT. Citi Plumb (Jarak: ${evalRes.distance}m, maks: ${currentLocs[0]?.radius || 100}m)`
          );
        } else {
          toast.success(
            `Lokasi terverifikasi di area PT. Citi Plumb (${evalRes.distance}m)`
          );
        }
      },
      (err) => {
        let errMsg = "Gagal mendeteksi lokasi GPS.";
        if (err.code === 1) {
          errMsg = "Izin akses lokasi ditolak. Harap izinkan GPS pada browser.";
        } else if (err.code === 2) {
          errMsg = "Posisi GPS tidak tersedia. Pastikan GPS aktif.";
        } else if (err.code === 3) {
          errMsg = "Waktu pencarian sinyal GPS habis. Coba lagi.";
        }

        setGeo((prev) => ({
          ...prev,
          loading: false,
          isInside: false,
          error: errMsg,
        }));
        toast.error(errMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const enableMockLocation = () => {
    if (!bypassAllowed) {
      toast.error("Fitur bypass testing sedang dinonaktifkan oleh Administrator.");
      return;
    }
    setIsMockLocation(true);
    setGeo({
      loading: false,
      latitude: -7.0975488,
      longitude: 112.3876864,
      distance: 0,
      isInside: true,
      error: null,
    });
    toast.info("Mode Testing Aktif: Lokasi disimulasikan di area PT. Citi Plumb (0 meter).");
  };

  const disableMockLocation = () => {
    setIsMockLocation(false);
    checkLocation();
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setDbLoading(true);
      try {
        const [usersRes, sensorsRes, locationRes] = await Promise.all([
          axios.get("/api/users"),
          axios.get("/api/sensors?userId=8597"),
          axios.get("/api/location").catch(() => ({ data: null })),
        ]);

        const users = usersRes.data;
        const formattedUsers = users.map(
          (user: { userid: number; name: string }) => ({
            USERID: user.userid,
            Name: user.name,
            SENSORID: sensorId,
            VERIFCODE: sn,
          })
        );
        setAllowedUsers(formattedUsers);

        if (sensorsRes.data) {
          const { frequentSensor, machines: machineList } = sensorsRes.data;
          if (machineList && machineList.length > 0) {
            setMachines(machineList);
          }
          if (frequentSensor?.SENSORID) {
            setSensorId(String(frequentSensor.SENSORID));
            if (frequentSensor.sn) {
              setSn(frequentSensor.sn);
            }
          }
        }

        let currentLocList = locations;
        if (locationRes?.data?.locations) {
          currentLocList = locationRes.data.locations;
          setLocations(currentLocList);
        }

        if (typeof locationRes?.data?.bypassEnabled === "boolean") {
          const isAllowed = locationRes.data.bypassEnabled;
          setBypassAllowed(isAllowed);
          if (!isAllowed) {
            setIsMockLocation(false);
          }
        }

        checkLocation(currentLocList);
        setDbConnected(true);
      } catch {
        setDbConnected(false);
        toast.error("Gagal terhubung ke database");
      } finally {
        setDbLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleSensorChange = (newSensorId: string) => {
    setSensorId(newSensorId);
    const found = machines.find((m) => m.SENSORID === newSensorId);
    if (found && found.sn) {
      setSn(found.sn);
    }
  };

  const setTimeToNow = () => {
    setChecktime(getIndonesiaNowISO());
  };

  const handleTestMachineVoice = async () => {
    try {
      setTestingVoice(true);
      const res = await axios.post("/api/sensors/test-voice", { sensorId });
      const currentMachine = machines.find((m) => m.SENSORID === sensorId);
      const currentLabel =
        currentMachine?.label ||
        (sensorId === "1"
          ? "ATT Office"
          : sensorId === "4"
          ? "ATT Injection"
          : sensorId === "6"
          ? "ATT Security"
          : `Sensor ${sensorId}`);

      if (res.data?.success) {
        toast.success(`Suara "Terima Kasih" berbunyi di mesin ${currentLabel}!`);
      } else {
        toast.error(res.data?.message || `Mesin ${currentLabel} tidak merespon`);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Gagal menghubungi speaker mesin fisik.");
      }
    } finally {
      setTestingVoice(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!geo.isInside || geo.latitude === null || geo.longitude === null) {
      toast.error(
        `Absen ditolak: Anda harus berada di area PT. Citi Plumb (Maksimal radius ${locations[0]?.radius || 100} meter).`
      );
      return;
    }

    if (!selectedUser) {
      toast.error("Pilih karyawan terlebih dahulu");
      return;
    }

    if (!checktime) {
      toast.error("Tentukan waktu absensi");
      return;
    }

    if (!sensorId) {
      toast.error("Tentukan sensor ID terlebih dahulu");
      return;
    }

    // Buka verifikasi kamera depan anti-joki terlebih dahulu
    setShowCameraModal(true);
  };

  const handleVerifiedAttendance = async () => {
    setShowCameraModal(false);

    if (!selectedUser || geo.latitude === null || geo.longitude === null) {
      return;
    }

    try {
      setLoading(true);

      // Format waktu sesuai input regional Indonesia (YYYY-MM-DD HH:MM:SS)
      let formattedDate = checktime.replace("T", " ");
      if (formattedDate.length === 16) {
        formattedDate += ":00";
      }

      const res = await axios.post("/api/users", {
        userId: selectedUser.USERID,
        checktime: formattedDate,
        sensorId: sensorId,
        sn: sn,
        verifyCode: 1, // 1 = Fingerprint / Sidik Jari
        latitude: geo.latitude,
        longitude: geo.longitude,
        isMock: isMockLocation,
        isBypass: isMockLocation,
      });

      const currentMachine = machines.find((m) => m.SENSORID === sensorId);
      const currentLabel =
        currentMachine?.label ||
        (sensorId === "1"
          ? "ATT Office"
          : sensorId === "4"
          ? "ATT Injection"
          : sensorId === "6"
          ? "ATT Security"
          : `Sensor ${sensorId}`);

      if (res.data?.machineSound?.success) {
        toast.success(
          `Absen berhasil dicatat: ${selectedUser.Name} (${currentLabel} - Sidik Jari) • Mesin berbunyi`
        );
      } else {
        toast.success(
          `Absen berhasil dicatat: ${selectedUser.Name} (${currentLabel} - Sidik Jari)`
        );
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Gagal menyimpan data absensi");
      }
    } finally {
      setLoading(false);
    }
  };

  // Layar Loading Awal
  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-600 border-t-zinc-800 dark:border-t-zinc-200 rounded-full animate-spin" />
      </main>
    );
  }

  // Layar Kunci Sandi Akses (Minimalis & Rapi)
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 antialiased text-zinc-900 dark:text-zinc-100">
        <div className="w-full max-w-sm relative">
          <div className="absolute right-0 -top-10">
            <ThemeToggle />
          </div>
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-700 dark:text-zinc-300">
                <Lock className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Akses Keamanan
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Masukkan kata sandi untuk mengakses sistem presensi
              </CardDescription>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="pt-5 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Kata Sandi
                  </label>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan sandi..."
                    className="h-10 px-3 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={authLoading || !passwordInput}
                  className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-colors cursor-pointer"
                >
                  {authLoading ? "Memverifikasi..." : "Buka Akses"}
                </Button>
              </CardContent>

              <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 py-2.5 px-4 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-center text-[11px] text-zinc-400 dark:text-zinc-500">
                PT. Citi Plumb — Sistem Presensi
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  // Layar Utama Presensi
  return (
    <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-3 sm:p-4 antialiased text-zinc-900 dark:text-zinc-100">
      <div className="w-full max-w-md my-auto">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-xl">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4 px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
                  <Fingerprint className="w-5 h-5 text-zinc-800 dark:text-zinc-200 shrink-0" />
                  <span className="truncate">Presensi Karyawan</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  PT. Citi Plumb — Lamongan
                </CardDescription>
              </div>

              {/* Status Koneksi DB & Tombol Kunci */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      dbLoading
                        ? "bg-amber-400 animate-pulse"
                        : dbConnected
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {dbLoading
                      ? "Menghubungkan"
                      : dbConnected
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>

                <ThemeToggle />

                <Link
                  href="/admin"
                  title="Dashboard Admin"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Kunci Akses Aplikasi"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="pt-4 sm:pt-5 px-4 sm:px-6 space-y-3.5 sm:space-y-4">
              {/* Status Verifikasi Lokasi Geofence */}
              <div className="rounded-lg border p-3 text-xs transition-colors bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                  <span className="font-medium flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span>Area PT. Citi Plumb</span>
                    {isMockLocation && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-normal"
                      >
                        Mode Testing
                      </Badge>
                    )}
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isMockLocation ? (
                      <button
                        type="button"
                        onClick={disableMockLocation}
                        className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Gunakan GPS Asli
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => checkLocation()}
                          disabled={geo.loading}
                          className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <RotateCcw
                            className={`w-3 h-3 ${geo.loading ? "animate-spin" : ""}`}
                          />
                          Cek Lokasi
                        </button>
                        {bypassAllowed && (
                          <button
                            type="button"
                            onClick={enableMockLocation}
                            title="Simulasi lokasi kantor untuk pengujian dari luar area"
                            className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer transition-colors underline underline-offset-2"
                          >
                            Bypass Testing
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  {geo.loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Mendeteksi koordinat GPS perangkat Anda...</span>
                    </div>
                  ) : geo.error ? (
                    <div className="flex items-start justify-between gap-2 text-red-600 dark:text-red-400">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{geo.error}</span>
                      </div>
                      {bypassAllowed && (
                        <button
                          type="button"
                          onClick={enableMockLocation}
                          className="text-[11px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-medium transition-colors shrink-0 cursor-pointer"
                        >
                          Mode Testing
                        </button>
                      )}
                    </div>
                  ) : isMockLocation ? (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium">
                          Lokasi Disimulasikan (Area Kantor)
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                        Jarak: 0m (Siap Uji Coba)
                      </span>
                    </div>
                  ) : geo.isInside ? (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium">
                          Di Dalam Area PT. Citi Plumb
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-500">
                        Jarak: ~{geo.distance}m (Maks. {locations[0]?.radius || 100}m)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 text-red-600 dark:text-red-400">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <span>Di Luar Area PT. Citi Plumb (Terkunci)</span>
                        </div>
                        {bypassAllowed && (
                          <button
                            type="button"
                            onClick={enableMockLocation}
                            className="text-[11px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            Bypass Uji Coba
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-red-500 dark:text-red-400">
                        Jarak Anda saat ini: ~
                        {geo.distance !== null && geo.distance >= 1000
                          ? `${(geo.distance / 1000).toFixed(1)} km`
                          : `${geo.distance} meter`}{" "}
                        (Maksimal radius: {locations[0]?.radius || 100} meter)
                        {geo.latitude !== null && geo.longitude !== null && (
                          <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                            Koordinat Terdeteksi: {geo.latitude.toFixed(6)}, {geo.longitude.toFixed(6)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pilih Karyawan */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  Karyawan
                </label>

                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10 px-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-left font-normal"
                    >
                      <span
                        className={
                          selectedUser ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                        }
                      >
                        {selectedUser ? selectedUser.Name : "Pilih karyawan..."}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 opacity-70" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    align="start"
                  >
                    <Command className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                      <CommandInput placeholder="Cari nama karyawan..." />
                      <CommandList>
                        <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {allowedUsers.map((user) => (
                            <CommandItem
                              key={user.USERID}
                              value={user.Name}
                              onSelect={() => {
                                setSelectedUser(user);
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedUser?.USERID === user.USERID
                                    ? "opacity-100 text-zinc-900 dark:text-zinc-100"
                                    : "opacity-0"
                                }`}
                              />
                              <span className="flex-1">{user.Name}</span>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                #{user.USERID}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tempat / Sensor ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    Tempat / Sensor ID
                  </label>
                  <button
                    type="button"
                    onClick={handleTestMachineVoice}
                    disabled={testingVoice}
                    title="Uji speaker mesin sensor langsung"
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Volume2
                      className={`w-3 h-3 ${testingVoice ? "animate-pulse text-emerald-600 dark:text-emerald-400" : ""}`}
                    />
                    {testingVoice ? "Membunyikan..." : "Tes Suara Mesin"}
                  </button>
                </div>

                <Select value={sensorId} onValueChange={handleSensorChange}>
                  <SelectTrigger className="w-full h-10 px-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    <SelectValue placeholder="Pilih sensor ID" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((m) => (
                      <SelectItem key={m.SENSORID} value={m.SENSORID}>
                        <span>{m.label || `Sensor ${m.SENSORID}`}</span>
                      </SelectItem>
                    ))}
                    {machines.length === 0 && (
                      <>
                        <SelectItem value="1">ATT Office</SelectItem>
                        <SelectItem value="4">ATT Injection</SelectItem>
                        <SelectItem value="6">ATT Security</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Waktu Absen - Regional Indonesia (id-ID / WIB) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Waktu Absen</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-normal border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                    >
                      WIB (UTC+7)
                    </Badge>
                  </label>
                  <button
                    type="button"
                    onClick={setTimeToNow}
                    title="Setel otomatis ke waktu Indonesia (WIB) saat ini"
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Set Sekarang (WIB)
                  </button>
                </div>

                <Input
                  type="datetime-local"
                  value={checktime}
                  onChange={(e) => setChecktime(e.target.value)}
                  className="h-10 px-3 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-sm"
                />

                {/* Preview Format Regional Indonesia */}
                <div className="rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800/80 px-2.5 py-1.5 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {formatIndonesiaDatePreview(checktime)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                    id-ID
                  </span>
                </div>
              </div>

              {/* Info Metode */}
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Metode Verifikasi</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-normal gap-1 py-0.5 text-[11px]"
                  >
                    <Camera className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    Kamera Wajah
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-normal gap-1 py-0.5 text-[11px]"
                  >
                    <Fingerprint className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Sidik Jari
                  </Badge>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !selectedUser || !geo.isInside || geo.loading}
                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-600 text-white dark:text-zinc-900 font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {loading
                  ? "Menyimpan..."
                  : geo.loading
                  ? "Memeriksa Lokasi GPS..."
                  : !geo.isInside
                  ? "Di Luar Area PT. Citi Plumb (Terkunci)"
                  : "Simpan Absensi"}
              </Button>
            </CardContent>

            <CardFooter className="border-t border-zinc-100 dark:border-zinc-800 py-2.5 px-4 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              <span className="truncate">
                Tempat:{" "}
                {machines.find((m) => m.SENSORID === sensorId)?.label ||
                  (sensorId === "1"
                    ? "ATT Office"
                    : sensorId === "4"
                    ? "ATT Injection"
                    : sensorId === "6"
                    ? "ATT Security"
                    : `Sensor ${sensorId}`)}
              </span>
              <span className="shrink-0 font-mono">SN: {sn}</span>
            </CardFooter>
          </form>
        </Card>

        {/* Modal Kamera Verifikasi Wajah Anti-Joki (Simulasi Jepretan Tanpa Simpan Foto) */}
        <FaceVerificationModal
          open={showCameraModal}
          userName={selectedUser?.Name || "Karyawan"}
          onVerified={handleVerifiedAttendance}
          onCancel={() => setShowCameraModal(false)}
        />
      </div>
    </main>
  );
};

export default HomePage;