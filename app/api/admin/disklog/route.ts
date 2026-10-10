import { NextResponse } from "next/server";
import sql from "mssql";
import config from "@/lib/config";

// GET: Cek status ukuran file database dan recovery model
export async function GET() {
  let pool;
  try {
    pool = await sql.connect(config);

    const filesRes = await pool.request().query(`
      SELECT 
        name, 
        physical_name, 
        size * 8 / 1024 AS size_mb, 
        type_desc 
      FROM sys.database_files
    `);

    const dbRes = await pool.request().query(`
      SELECT recovery_model_desc 
      FROM sys.databases 
      WHERE name = '${config.database || "Absensi"}'
    `);

    const recoveryModel = dbRes.recordset[0]?.recovery_model_desc || "FULL";

    return NextResponse.json({
      success: true,
      database: config.database || "Absensi",
      recoveryModel,
      files: filesRes.recordset,
    });
  } catch (error) {
    console.error("Error fetching database file status:", error);
    return NextResponse.json(
      { error: "Gagal membaca status ukuran file database." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.close();
  }
}

// POST: Menjalankan eksekusi pembersihan log (DBCC SHRINKFILE) tanpa memerlukan password
export async function POST() {
  let pool;
  try {
    pool = await sql.connect(config);
    const dbName = config.database || "Absensi";

    // 1. Ambil ukuran sebelum shrink
    const beforeRes = await pool.request().query(`
      SELECT 
        name, 
        size * 8 / 1024 AS size_mb, 
        type_desc 
      FROM sys.database_files
    `);

    // 2. Jalankan DDL Maintenance Database (seperti di kiw)
    await pool.query(`
      ALTER DATABASE ${dbName}
      SET RECOVERY SIMPLE;

      DBCC SHRINKFILE (absensi_log, 1);

      ALTER DATABASE ${dbName}
      SET RECOVERY FULL;
    `);

    // 3. Ambil ukuran sesudah shrink
    const afterRes = await pool.request().query(`
      SELECT 
        name, 
        size * 8 / 1024 AS size_mb, 
        type_desc 
      FROM sys.database_files
    `);

    const beforeLog = beforeRes.recordset.find((f: { type_desc: string }) => f.type_desc === "LOG");
    const afterLog = afterRes.recordset.find((f: { type_desc: string }) => f.type_desc === "LOG");

    const savedMb = (beforeLog?.size_mb || 0) - (afterLog?.size_mb || 0);

    return NextResponse.json({
      success: true,
      message: `Pembersihan disklog database berhasil! Ukuran file log sekarang: ${afterLog?.size_mb ?? 1} MB${
        savedMb > 0 ? ` (berhasil menghemat ${savedMb} MB ruang disk)` : ""
      }.`,
      beforeFiles: beforeRes.recordset,
      afterFiles: afterRes.recordset,
      savedMb: Math.max(savedMb, 0),
    });
  } catch (error) {
    console.error("Error executing disklog shrink query:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengeksekusi shrink file log database." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.close();
  }
}
