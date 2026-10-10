import { NextResponse } from "next/server";
import sql from "mssql";
import config from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!password) {
      return NextResponse.json(
        { error: "Kata sandi atau PIN wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Verifikasi Master Password dari ENV (Default: admin123 atau APP_PASSWORD)
    const masterAdminPass = process.env.ADMIN_PASSWORD || "admin123";
    const appPass = process.env.APP_PASSWORD || "2027";

    if (
      (username.toLowerCase() === "admin" || !username) &&
      (password === masterAdminPass || password === appPass)
    ) {
      return NextResponse.json({
        success: true,
        user: {
          name: "Master Administrator",
          username: "admin",
          role: "Super Admin",
        },
      });
    }

    // 2. Verifikasi Akun Super Admin di Database (USERINFO dengan privilege = 3)
    let pool;
    try {
      pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("identifier", sql.VarChar, username)
        .input("pin", sql.VarChar, password)
        .query(`
          SELECT TOP 1 USERID, Badgenumber, Name, privilege, mverifypass 
          FROM USERINFO 
          WHERE (Badgenumber = @identifier OR CAST(USERID AS VARCHAR) = @identifier)
            AND (privilege = 3 OR SECURITYFLAGS = 15)
        `);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        // Cek kecocokan PIN (mverifypass) atau master password
        if (
          user.mverifypass === password ||
          password === masterAdminPass ||
          password === appPass
        ) {
          return NextResponse.json({
            success: true,
            user: {
              id: user.USERID,
              name: user.Name,
              username: user.Badgenumber,
              role: "Super Administrator",
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB Admin Auth check error:", dbErr);
    } finally {
      if (pool) await pool.close();
    }

    return NextResponse.json(
      { error: "Username atau kata sandi/PIN admin tidak cocok." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses login admin." },
      { status: 500 }
    );
  }
}
