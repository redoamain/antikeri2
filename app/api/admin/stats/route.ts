import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sql from "mssql";
import config from "@/lib/config";

export async function GET(request: Request) {
  let pool;
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date"); // YYYY-MM-DD
    const deptFilter = searchParams.get("deptName");
    const sensorFilter = searchParams.get("sensorId");

    pool = await sql.connect(config);

    // 1. Hitung statistik ringkasan (menggunakan zona waktu Indonesia / WIB)
    const countsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM USERINFO) as totalUsers,
        (SELECT COUNT(*) FROM Machines) as totalMachines,
        (SELECT COUNT(*) FROM CHECKINOUT WHERE CAST(CHECKTIME AS DATE) = CAST(DATEADD(hour, 7, GETUTCDATE()) AS DATE)) as todayCheckins
    `);

    const counts = countsResult.recordset[0] || {
      totalUsers: 0,
      totalMachines: 0,
      todayCheckins: 0,
    };

    // 2. Ambil log presensi dengan filter opsional (format string murni agar tidak tergeser zona waktu)
    let logQuery = `
      SELECT TOP 1000 
        CONVERT(VARCHAR(19), c.CHECKTIME, 120) as CHECKTIME, 
        CONVERT(VARCHAR(19), c.CHECKTIME, 120) as rawChecktime,
        c.USERID, 
        u.Badgenumber, 
        u.Name, 
        d.DEPTNAME, 
        c.SENSORID, 
        m.MachineAlias,
        c.VERIFYCODE
      FROM CHECKINOUT c
      LEFT JOIN USERINFO u ON c.USERID = u.USERID
      LEFT JOIN DEPARTMENTS d ON u.DEFAULTDEPTID = d.DEPTID
      LEFT JOIN Machines m ON c.SENSORID = CAST(m.ID AS VARCHAR)
      WHERE 1=1
    `;

    const logReq = pool.request();

    if (dateFilter) {
      logQuery += ` AND CAST(c.CHECKTIME AS DATE) = @dateFilter`;
      logReq.input("dateFilter", sql.Date, dateFilter);
    }

    if (deptFilter && deptFilter !== "all") {
      logQuery += ` AND d.DEPTNAME = @deptFilter`;
      logReq.input("deptFilter", sql.NVarChar, deptFilter);
    }

    if (sensorFilter && sensorFilter !== "all") {
      logQuery += ` AND c.SENSORID = @sensorFilter`;
      logReq.input("sensorFilter", sql.VarChar, sensorFilter);
    }

    logQuery += ` ORDER BY c.CHECKTIME DESC`;

    const logsResult = await logReq.query(logQuery);

    // 3. Ambil daftar mesin
    const machinesResult = await pool.request().query(`
      SELECT ID, MachineAlias, sn, ProductType, Enabled
      FROM Machines
      ORDER BY ID ASC
    `);

    // 4. Ambil daftar departemen untuk dropdown filter
    const departmentsResult = await pool.request().query(`
      SELECT DISTINCT d.DEPTID, LTRIM(RTRIM(d.DEPTNAME)) as DEPTNAME
      FROM DEPARTMENTS d
      INNER JOIN USERINFO u ON u.DEFAULTDEPTID = d.DEPTID
      WHERE d.DEPTNAME IS NOT NULL AND LEN(LTRIM(RTRIM(d.DEPTNAME))) > 0
      ORDER BY DEPTNAME ASC
    `);

    // 5. Ambil daftar Super Admin
    const adminsResult = await pool.request().query(`
      SELECT USERID, Badgenumber, Name, privilege, mverifypass
      FROM USERINFO
      WHERE privilege = 3 OR SECURITYFLAGS = 15
      ORDER BY USERID ASC
    `);

    // 6. Ambil status fitur bypass testing
    let bypassEnabled = false;
    try {
      const locPath = path.join(process.cwd(), "lib", "locations.json");
      if (fs.existsSync(locPath)) {
        const locData = JSON.parse(fs.readFileSync(locPath, "utf-8"));
        bypassEnabled = Boolean(locData.bypassEnabled);
      }
    } catch (e) {
      console.warn("Gagal membaca status bypass dari locations.json:", e);
    }

    return NextResponse.json({
      counts,
      recentLogs: logsResult.recordset,
      machines: machinesResult.recordset,
      departments: departmentsResult.recordset,
      bypassEnabled,
      adminUsers: adminsResult.recordset.map((a) => ({
        USERID: a.USERID,
        Badgenumber: a.Badgenumber,
        Name: a.Name,
        role: a.privilege === 3 ? "Super Administrator" : "Operator Departemen",
      })),
    });
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dashboard admin." },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
