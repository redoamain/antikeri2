import { NextResponse } from "next/server";
import sql from "mssql";
import config from "@/lib/config";

export async function GET(request: Request) {
  let pool;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "8597";

    pool = await sql.connect(config);

    // 1. Cari sensor yang paling sering digunakan oleh userId tertentu (default: 8597)
    let frequentSensor = null;
    if (userId) {
      const frequentResult = await pool
        .request()
        .input("userId", sql.Int, parseInt(userId, 10))
        .query(`
          SELECT TOP 1 SENSORID, sn, COUNT(*) as total
          FROM CHECKINOUT
          WHERE USERID = @userId AND SENSORID IS NOT NULL
          GROUP BY SENSORID, sn
          ORDER BY total DESC
        `);

      if (frequentResult.recordset.length > 0) {
        frequentSensor = frequentResult.recordset[0];
      }
    }

    // 2. Ambil daftar mesin/sensor dari tabel Machines jika ada, atau distinct dari CHECKINOUT
    let machinesList: { SENSORID: string; sn: string; label?: string }[] = [];
    try {
      const machinesResult = await pool.request().query(`
        SELECT *
        FROM Machines
        ORDER BY 
          CASE 
            WHEN MachineAlias LIKE '%Office%' THEN 1
            WHEN MachineAlias LIKE '%Security%' THEN 2
            ELSE 3
          END,
          ID ASC
      `);
      machinesList = machinesResult.recordset.map((m) => {
        let cleanLabel = m.MachineAlias || `Sensor ${m.ID}`;
        if (cleanLabel.toLowerCase().includes("office")) {
          cleanLabel = "ATT Office";
        } else if (cleanLabel.toLowerCase().includes("security")) {
          cleanLabel = "ATT Security";
        }
        return {
          SENSORID: String(m.ID),
          sn: m.sn || "",
          label: cleanLabel,
        };
      });
    } catch {
      // Fallback jika koneksi database gagal
      machinesList = [
        { SENSORID: "1", sn: "A5NS190560046", label: "ATT Office" },
        { SENSORID: "4", sn: "A6G6200360023", label: "ATT Injection" },
        { SENSORID: "6", sn: "NHZ4244900678", label: "ATT Security" },
        { SENSORID: "3", sn: "A5NS193460452", label: "ATT Spray" },
        { SENSORID: "5", sn: "NHZ4244900223", label: "ATT Assembly" },
        { SENSORID: "2", sn: "A6G6212260014", label: "X OFFLINE X" },
      ];
    }

    // Jika list mesin kosong, sediakan fallback sensor default
    if (machinesList.length === 0) {
      machinesList = [
        { SENSORID: "1", sn: "A5NS190560046", label: "ATT Office" },
        { SENSORID: "4", sn: "A6G6200360023", label: "ATT Injection" },
        { SENSORID: "6", sn: "NHZ4244900678", label: "ATT Security" },
      ];
    }

    const defaultSensor =
      machinesList.find((m) => m.label?.toLowerCase().includes("office")) ||
      machinesList.find((m) => m.SENSORID === "1") ||
      frequentSensor ||
      machinesList[0];

    return NextResponse.json({
      userId,
      frequentSensor: frequentSensor || defaultSensor,
      machines: machinesList,
    });
  } catch (error) {
    console.error("Error fetching sensors:", error);
    return NextResponse.json(
      {
        userId: "8597",
        frequentSensor: { SENSORID: "1", sn: "A5NS190560046", label: "ATT Office" },
        machines: [
          { SENSORID: "1", sn: "A5NS190560046", label: "ATT Office" },
          { SENSORID: "4", sn: "A6G6200360023", label: "ATT Injection" },
          { SENSORID: "6", sn: "NHZ4244900678", label: "ATT Security" },
          { SENSORID: "3", sn: "A5NS193460452", label: "ATT Spray" },
          { SENSORID: "5", sn: "NHZ4244900223", label: "ATT Assembly" },
        ],
      },
      { status: 200 }
    );
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}
