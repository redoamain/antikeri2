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
} from "lucide-react";
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

function getLocalISOString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

const HomePage: React.FC = () => {
  // Keamanan Sandi Akses
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Form Absensi
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [checktime, setChecktime] = useState<string>(getLocalISOString());
  const [loading, setLoading] = useState<boolean>(false);
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [openCombobox, setOpenCombobox] = useState<boolean>(false);

  // Tempat Sensor ID & SN (default ATT Office: SENSORID 4)
  const [sensorId, setSensorId] = useState<string>("4");
  const [sn, setSn] = useState<string>("A6G6200360023");
  const [machines, setMachines] = useState<MachineOption[]>([]);

  // Lokasi Resmi PT. Citi Plumb
  const [locations, setLocations] = useState<LocationItem[]>([
    {
      id: "office",
      name: "PT. Citi Plumb",
      lat: -7.0975488,
      lng: 112.3876864,
      radius: 100,
    },
    {
      id: "factory",
      name: "PT. Citi Plumb",
      lat: -7.1043177,
      lng: 112.3820146,
      radius: 100,
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
            `Di luar area PT. Citi Plumb (Jarak: ${evalRes.distance}m, maks: 100m)`
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
    setChecktime(getLocalISOString());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!geo.isInside || geo.latitude === null || geo.longitude === null) {
      toast.error(
        "Absen ditolak: Anda harus berada di area PT. Citi Plumb (Maksimal radius 100 meter)."
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

    try {
      setLoading(true);

      const localDate = new Date(checktime);
      const jakartaTime = new Date(localDate.getTime() + 7 * 60 * 60 * 1000);
      const formattedDate = jakartaTime
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      await axios.post("/api/users", {
        userId: selectedUser.USERID,
        checktime: formattedDate,
        sensorId: sensorId,
        sn: sn,
        verifyCode: 1, // 1 = Fingerprint / Sidik Jari
        latitude: geo.latitude,
        longitude: geo.longitude,
      });

      const currentMachine = machines.find((m) => m.SENSORID === sensorId);
      const currentLabel =
        currentMachine?.label ||
        (sensorId === "4"
          ? "ATT Office"
          : sensorId === "6"
          ? "ATT Security"
          : `Sensor ${sensorId}`);

      toast.success(
        `Absen berhasil dicatat: ${selectedUser.Name} (${currentLabel} - Sidik Jari)`
      );
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
      <main className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
      </main>
    );
  }

  // Layar Kunci Sandi Akses (Minimalis & Rapi)
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 antialiased text-zinc-900">
        <div className="w-full max-w-sm">
          <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-2 text-zinc-700">
                <Lock className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-semibold text-zinc-900">
                Akses Keamanan
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Masukkan kata sandi untuk mengakses sistem presensi
              </CardDescription>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="pt-5 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Kata Sandi
                  </label>
                  <Input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan sandi..."
                    className="h-10 px-3 border-zinc-200 bg-white"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={authLoading || !passwordInput}
                  className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm transition-colors cursor-pointer"
                >
                  {authLoading ? "Memverifikasi..." : "Buka Akses"}
                </Button>
              </CardContent>

              <CardFooter className="border-t border-zinc-100 py-2.5 px-4 bg-zinc-50/50 flex justify-center text-[11px] text-zinc-400">
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
    <main className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 antialiased text-zinc-900">
      <div className="w-full max-w-md">
        <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl">
          <CardHeader className="border-b border-zinc-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-zinc-800" />
                  Presensi Karyawan
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 mt-0.5">
                  PT. Citi Plumb — Lamongan
                </CardDescription>
              </div>

              {/* Status Koneksi DB & Tombol Kunci */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dbLoading
                        ? "bg-amber-400 animate-pulse"
                        : dbConnected
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span>
                    {dbLoading
                      ? "Menghubungkan"
                      : dbConnected
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Kunci Akses Aplikasi"
                  className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="pt-5 space-y-4">
              {/* Status Verifikasi Lokasi Geofence */}
              <div className="rounded-lg border p-3 text-xs transition-colors bg-zinc-50 border-zinc-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-1.5 text-zinc-700">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    Area PT. Citi Plumb
                  </span>

                  <button
                    type="button"
                    onClick={() => checkLocation()}
                    disabled={geo.loading}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RotateCcw
                      className={`w-3 h-3 ${geo.loading ? "animate-spin" : ""}`}
                    />
                    Cek Lokasi
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-200/60">
                  {geo.loading ? (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Mendeteksi koordinat GPS perangkat Anda...</span>
                    </div>
                  ) : geo.error ? (
                    <div className="flex items-start gap-1.5 text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{geo.error}</span>
                    </div>
                  ) : geo.isInside ? (
                    <div className="flex items-center justify-between text-emerald-700">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium">
                          Di Dalam Area PT. Citi Plumb
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600">
                        Jarak: ~{geo.distance}m (Maks. 100m)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 text-red-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Di Luar Area PT. Citi Plumb (Terkunci)</span>
                      </div>
                      <span className="text-[11px] text-red-500">
                        Jarak Anda saat ini: ~
                        {geo.distance !== null && geo.distance >= 1000
                          ? `${(geo.distance / 1000).toFixed(1)} km`
                          : `${geo.distance} meter`}{" "}
                        (Maksimal radius: 100 meter)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pilih Karyawan */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                  Karyawan
                </label>

                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10 px-3 border-zinc-200 bg-white hover:bg-zinc-50 text-left font-normal"
                    >
                      <span
                        className={
                          selectedUser ? "text-zinc-900" : "text-zinc-400"
                        }
                      >
                        {selectedUser ? selectedUser.Name : "Pilih karyawan..."}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 text-zinc-400 opacity-70" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
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
                                    ? "opacity-100 text-zinc-900"
                                    : "opacity-0"
                                }`}
                              />
                              <span className="flex-1">{user.Name}</span>
                              <span className="text-xs text-zinc-400">
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
                <label className="text-xs font-medium text-zinc-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                  Tempat / Sensor ID
                </label>

                <Select value={sensorId} onValueChange={handleSensorChange}>
                  <SelectTrigger className="w-full h-10 px-3 border-zinc-200 bg-white">
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
                        <SelectItem value="4">ATT Office</SelectItem>
                        <SelectItem value="6">ATT Security</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Waktu Absen */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Waktu Absen
                  </label>
                  <button
                    type="button"
                    onClick={setTimeToNow}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Set Sekarang
                  </button>
                </div>

                <Input
                  type="datetime-local"
                  value={checktime}
                  onChange={(e) => setChecktime(e.target.value)}
                  className="h-10 px-3 border-zinc-200 bg-white"
                />
              </div>

              {/* Info Metode */}
              <div className="rounded-lg bg-zinc-50 border border-zinc-200/80 p-2.5 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Metode Verifikasi</span>
                <Badge
                  variant="outline"
                  className="bg-white border-zinc-200 text-zinc-700 font-normal gap-1 py-0.5"
                >
                  <Fingerprint className="w-3 h-3 text-emerald-600" />
                  Sidik Jari (VERIFYCODE: 1)
                </Badge>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !selectedUser || !geo.isInside || geo.loading}
                className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
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

            <CardFooter className="border-t border-zinc-100 py-2.5 px-4 bg-zinc-50/50 flex items-center justify-between text-[11px] text-zinc-400">
              <span>
                Tempat:{" "}
                {machines.find((m) => m.SENSORID === sensorId)?.label ||
                  (sensorId === "4"
                    ? "ATT Office"
                    : sensorId === "6"
                    ? "ATT Security"
                    : `Sensor ${sensorId}`)}
              </span>
              <span>SN: {sn}</span>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
};

export default HomePage;