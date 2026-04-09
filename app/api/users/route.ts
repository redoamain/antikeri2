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
// Handler untuk metode POST
export async function POST(request: Request) {
  let pool;
  try {
    // Ambil data dari request body
    const { userId, checktime, sensorId, sn } = await request.json();
    console.log("presesi jam : ", checktime);
    // Validasi data
    if (!userId || !checktime) {
      return NextResponse.json(
        { error: "userId and checktime are required" },
        { status: 400 }
      );
    }

    // Buat koneksi ke SQL Server
    pool = await sql.connect(config);

    // Jalankan query untuk menyisipkan data
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("checktime", sql.VarChar, checktime)
      .input("sensorId", sql.Int, sensorId)
      .input("sn", sql.VarChar, sn)
      .query(
        "INSERT INTO CHECKINOUT (userId, checktime,sensorId,sn) VALUES (@userId, @checktime,@sensorid,@sn)"
      );

    // Kirim respons sukses
    return NextResponse.json({
      message: "Check-in/out data inserted successfully",
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
