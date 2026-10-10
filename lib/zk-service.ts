import ZKLib from "node-zklib";
import sql from "mssql";
import config from "./config";

export interface MachineInfo {
  ip: string;
  port: number;
  label: string;
}

export const KNOWN_MACHINES: Record<string, MachineInfo> = {
  "1": { ip: "192.168.1.241", port: 4370, label: "ATT Admin" },
  "2": { ip: "192.168.1.242", port: 4370, label: "ATT 2 Injection" },
  "3": { ip: "192.168.1.243", port: 4370, label: "ATT 3 Belakang" },
  "4": { ip: "192.168.1.244", port: 4370, label: "ATT Office" },
  "5": { ip: "192.168.1.245", port: 4370, label: "ATT Assembly" },
  "6": { ip: "192.168.1.246", port: 4370, label: "ATT Security" },
};

/**
 * Mendapatkan informasi IP & Port mesin berdasarkan Sensor ID dari database atau daftar fallback.
 */
export async function getMachineInfo(sensorId: string | number): Promise<MachineInfo> {
  const sid = String(sensorId || "4").trim();

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(sid, 10))
      .query("SELECT TOP 1 ID, MachineAlias, IP, Port FROM Machines WHERE ID = @id");

    if (result.recordset.length > 0) {
      const row = result.recordset[0];
      if (row.IP) {
        return {
          ip: String(row.IP).trim(),
          port: Number(row.Port) || 4370,
          label: row.MachineAlias || `Sensor ${sid}`,
        };
      }
    }
  } catch (err) {
    console.warn(`[ZK-Device] Gagal query Machines untuk Sensor ${sid}, menggunakan fallback:`, err);
  }

  return (
    KNOWN_MACHINES[sid] || {
      ip: "192.168.1.244",
      port: 4370,
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
