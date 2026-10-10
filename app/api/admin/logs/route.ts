import { NextResponse } from "next/server";
import sql from "mssql";
import config from "@/lib/config";

// PUT: Memperbarui waktu presensi atau sensor
export async function PUT(request: Request) {
  let pool;
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, originalChecktime, newChecktime, sensorId } = body;

    if (!userId || !originalChecktime || !newChecktime) {
      return NextResponse.json(
        { error: "userId, originalChecktime, dan newChecktime wajib diisi." },
        { status: 400 }
      );
    }

    pool = await sql.connect(config);

    const updateQuery = `
      UPDATE CHECKINOUT
      SET 
        CHECKTIME = CONVERT(DATETIME, @newChecktime, 120),
        SENSORID = ISNULL(@sensorId, SENSORID)
      WHERE USERID = @userId 
        AND CHECKTIME = CONVERT(DATETIME, @originalChecktime, 120)
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, parseInt(String(userId), 10))
      .input("originalChecktime", sql.VarChar, String(originalChecktime).slice(0, 19))
      .input("newChecktime", sql.VarChar, String(newChecktime).slice(0, 19))
      .input("sensorId", sql.VarChar, sensorId ? String(sensorId) : null)
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "Data presensi tidak ditemukan atau sudah diperbarui." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Waktu presensi berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Error updating attendance log:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data presensi di database." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.close();
  }
}

// DELETE: Menghapus data presensi
export async function DELETE(request: Request) {
  let pool;
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, checktime } = body;

    if (!userId || !checktime) {
      return NextResponse.json(
        { error: "userId dan checktime wajib disertakan untuk menghapus log presensi." },
        { status: 400 }
      );
    }

    pool = await sql.connect(config);

    const deleteQuery = `
      DELETE FROM CHECKINOUT
      WHERE USERID = @userId 
        AND CHECKTIME = CONVERT(DATETIME, @checktime, 120)
    `;

    const result = await pool
      .request()
      .input("userId", sql.Int, parseInt(String(userId), 10))
      .input("checktime", sql.VarChar, String(checktime).slice(0, 19))
      .query(deleteQuery);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "Data presensi tidak ditemukan atau sudah dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data presensi berhasil dihapus dari database.",
    });
  } catch (error) {
    console.error("Error deleting attendance log:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data presensi di database." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.close();
  }
}
