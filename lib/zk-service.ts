import ZKLib from "node-zklib";
import sql from "mssql";
import config from "./config";

export interface MachineInfo {
  ip: string;
  port: number;
  label: string;
}

export function getKnownMachines(): Record<string, MachineInfo> {
  const defaultPort = Number(process.env.MACHINE_PORT) || 4370;
  return {
    "1": {
      ip: process.env.MACHINE_1_IP || process.env.MACHINE_OFFICE_IP || "192.168.1.241",
      port: defaultPort,
      label: "ATT Office",
    },
    "2": {
      ip: process.env.MACHINE_2_IP || "192.168.1.242",
      port: defaultPort,
      label: "X OFFLINE X",
    },
    "3": {
      ip: process.env.MACHINE_3_IP || "192.168.1.243",
      port: defaultPort,
      label: "ATT Spray",
    },
    "4": {
      ip: process.env.MACHINE_4_IP || "192.168.1.244",
      port: defaultPort,
      label: "ATT Injection",
    },
    "5": {
      ip: process.env.MACHINE_5_IP || "192.168.1.245",
      port: defaultPort,
      label: "ATT Assembly",
    },
    "6": {
      ip: process.env.MACHINE_6_IP || "192.168.1.246",
      port: defaultPort,
      label: "ATT Security",
    },
  };
}

export const KNOWN_MACHINES: Record<string, MachineInfo> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      return getKnownMachines()[prop];
    },
  }
);

/**
 * Mendapatkan informasi IP & Port mesin berdasarkan Sensor ID dari database atau env fallback.
 */
export async function getMachineInfo(sensorId: string | number): Promise<MachineInfo> {
  const sid = String(sensorId || "1").trim();
  const known = getKnownMachines();

  // 1. Query ke database jika ada
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(sid, 10))
      .query("SELECT TOP 1 ID, MachineAlias, IP, Port FROM Machines WHERE ID = @id");

    if (result.recordset.length > 0) {
      const row = result.recordset[0];
      const dbIp = row.IP ? String(row.IP).trim() : "";
      const resolvedIp = dbIp || known[sid]?.ip || "";
      if (resolvedIp) {
        return {
          ip: resolvedIp,
          port: Number(row.Port) || Number(process.env.MACHINE_PORT) || 4370,
          label: row.MachineAlias || known[sid]?.label || `Sensor ${sid}`,
        };
      }
    }
  } catch (err) {
    console.warn(`[ZK-Device] Gagal query Machines untuk Sensor ${sid}, menggunakan konfigurasi ENV:`, err);
  }

  return (
    known[sid] || {
      ip: process.env.MACHINE_1_IP || process.env.MACHINE_OFFICE_IP || "192.168.1.241",
      port: Number(process.env.MACHINE_PORT) || 4370,
      label: "ATT Office",
    }
  );
}

/**
 * Mengirim perintah suara ke speaker fisik mesin ZKTeco.
 * @param ip Alamat IP mesin sensor
 * @param port Port mesin (default 4370)
 * @param voiceIndex Index suara (0 = "Terima Kasih" / Thank You, 10 = Beep)
 */
export async function triggerMachineVoice(
  ip: string,
  port = 4370,
  voiceIndex = 0
): Promise<{ success: boolean; ip: string; port: number; message: string }> {
  const zk = new ZKLib(ip, port, 3000, 4000);

  try {
    console.log(`[ZK-Device] Menghubungkan ke mesin ${ip}:${port}...`);
    await zk.createSocket();

    // Command 1017 = CMD_TESTVOICE
    // Data = 4 bytes unsigned int (little-endian) untuk voice index
    const data = Buffer.alloc(4);
    data.writeUInt32LE(voiceIndex, 0);

    console.log(
      `[ZK-Device] Mengirim perintah CMD_TESTVOICE (${voiceIndex === 0 ? "Terima Kasih" : `Index ${voiceIndex}`}) ke ${ip}...`
    );
    await zk.executeCmd(1017, data);

    console.log(`[ZK-Device] Berhasil membunyikan suara di mesin fisik ${ip}!`);
    return {
      success: true,
      ip,
      port,
      message: `Suara berhasil dibunyikan pada mesin (${ip}:${port})`,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ZK-Device] Gagal memicu suara mesin di ${ip}:${port}:`, errMsg);
    return {
      success: false,
      ip,
      port,
      message: `Gagal memicu suara mesin (${ip}:${port}): ${errMsg}`,
    };
  } finally {
    try {
      await zk.disconnect();
    } catch {
      // Abaikan error saat disconnect
    }
  }
}

/**
 * Memicu suara ucapan "Terima Kasih" pada mesin yang sesuai dengan Sensor ID absensi.
 */
export async function triggerAttendanceVoice(
  sensorId: string | number
): Promise<{ success: boolean; ip: string; port: number; message: string }> {
  const machine = await getMachineInfo(sensorId);
  return await triggerMachineVoice(machine.ip, machine.port, 0);
}
