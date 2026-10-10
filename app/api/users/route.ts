import { NextResponse } from "next/server";
import sql from "mssql";
import config from "@/lib/config";



//Handler untuk metode GET
export async function GET() {
  let pool;
  try {
    // Buat koneksi ke SQL Server
    pool = await sql.connect(config);

    // Jalankan query
    const result = await pool.request().query("SELECT userid,name FROM USERINFO where title in ('IT','MARKETING')");

    // Kirim hasil sebagai respons JSON
    return NextResponse.json(result.recordset);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  } finally {
    // Pastikan untuk menutup koneksi
    if (pool) {
      await pool.close();
    }
  }
}
// export async function GET() {
//   let pool;
//   try {
//     // Cek koneksi ke SQL Server dengan menjalankan query sederhana
//     pool = await sql.connect(config);

//     // Menggunakan query ringan untuk memastikan koneksi berhasil
//     await pool.request().query("SELECT 1");

//     // Koneksi berhasil, kembalikan respons sukses
//     return NextResponse.json({ message: "Connected to the database!" });
//   } catch (error) {
//     console.error("Database connection error:", error);

//     // Jika ada error, kembalikan respons error
//     return NextResponse.json(
//       { error: "Failed to connect to the database" },
//       { status: 500 }
//     );
//   } finally {
//     // Pastikan untuk menutup koneksi jika ada
//     if (pool) {
//       await pool.close();
//     }
//   }
// }
import fs from "fs";
import path from "path";

const LOCATIONS_FILE = path.join(process.cwd(), "lib", "locations.json");

function getValidLocations(): { name: string; lat: number; lng: number; radius: number }[] {
  try {
    if (fs.existsSync(LOCATIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCATIONS_FILE, "utf-8"));
      if (Array.isArray(data.locations)) {
        return data.locations.filter(
          (l: { lat: unknown; lng: unknown }) =>
            typeof l.lat === "number" && typeof l.lng === "number"
        );
      }
    }
  } catch (err) {
    console.error("Error reading locations:", err);
  }
  return [
    {
      name: "Pabrik PT. Citi Plumb",
      lat: -7.1043177,
      lng: 112.3820146,
      radius: 100,
    },
  ];
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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

// Handler untuk metode POST
export async function POST(request: Request) {
  let pool;
  try {
    // Ambil data dari request body
    const { userId, checktime, sensorId, sn, verifyCode, latitude, longitude } =
      await request.json();
    console.log("presensi jam : ", checktime);

    // Validasi data dasar
    if (!userId || !checktime) {
      return NextResponse.json(
        { error: "userId and checktime are required" },
        { status: 400 }
      );
    }

    // Validasi lokasi geografis: periksa terhadap semua titik yang diizinkan (Pabrik / Ruang IT)
    if (typeof latitude === "number" && typeof longitude === "number") {
      const allowedLocations = getValidLocations();
      let isInside = false;
      let minDistance = Infinity;

      for (const loc of allowedLocations) {
        const d = getDistanceMeters(latitude, longitude, loc.lat, loc.lng);
        if (d < minDistance) {
          minDistance = d;
        }
        if (d <= (loc.radius || 100)) {
          isInside = true;
          break;
        }
      }

      if (!isInside) {
        return NextResponse.json(
          {
            error: `Di luar area PT. Citi Plumb. Jarak terdekat: ${minDistance} meter (maksimal radius 100 meter).`,
            distance: minDistance,
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Koordinat lokasi GPS (latitude & longitude) wajib disertakan untuk verifikasi area." },
        { status: 400 }
      );
    }

    // 1 = Fingerprint (Sidik Jari), 0 = Password
    const finalVerifyCode = typeof verifyCode === "number" ? verifyCode : 1;

    // Buat koneksi ke SQL Server
    pool = await sql.connect(config);

    // Jalankan query untuk menyisipkan data dengan VERIFYCODE = 1 (Sidik Jari)
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("checktime", sql.VarChar, checktime)
      .input("sensorId", sql.VarChar, String(sensorId ?? "1"))
      .input("sn", sql.VarChar, sn ?? "A5NS190560046")
      .input("verifyCode", sql.Int, finalVerifyCode)
      .query(
        "INSERT INTO CHECKINOUT (USERID, CHECKTIME, SENSORID, sn, VERIFYCODE) VALUES (@userId, @checktime, @sensorId, @sn, @verifyCode)"
      );

    // Kirim respons sukses
    return NextResponse.json({
      message: "Check-in/out data inserted successfully with Fingerprint verification",
      verifyCode: finalVerifyCode,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to insert data" },
      { status: 500 }
    );
  } finally {
    // Pastikan untuk menutup koneksi
    if (pool) {
      await pool.close();
    }
  }
}
