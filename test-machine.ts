import ZKLib from "node-zklib";
import dotenv from "dotenv";

dotenv.config();

const targetIp =
  process.argv[2] ||
  process.env.MACHINE_OFFICE_IP ||
  process.env.MACHINE_4_IP ||
  "192.168.1.244";
const targetPort =
  Number(process.argv[3]) ||
  Number(process.env.MACHINE_PORT) ||
  4370;

console.log(`\n==============================================`);
console.log(`Menguji Koneksi ke Mesin Solution X105-ID`);
console.log(`Target: ${targetIp}:${targetPort}`);
console.log(`==============================================\n`);

async function runTest() {
  const zk = new ZKLib(targetIp, targetPort, 4000, 4000);

  try {
    console.log(`[1/3] Menghubungkan via ZK Protocol...`);
    await zk.createSocket();
    console.log(`  -> Berhasil terhubung ke socket mesin!\n`);

    console.log(`[2/3] Membaca data perangkat...`);
    try {
      const serial = await zk.getSerialNumber().catch(() => null);
      if (serial) console.log(`  -> Serial Number  : ${serial}`);

      const version = await zk.getFirmware().catch(() => null);
      if (version) console.log(`  -> Firmware Version: ${version}`);

      const deviceName = await zk.getDeviceName().catch(() => null);
      if (deviceName) console.log(`  -> Device Name     : ${deviceName}`);
    } catch (e) {
      console.log(`  -> Info detail perangkat tidak dapat dibaca, tapi socket aktif.`);
    }

    console.log(`\n[3/3] Membunyikan suara ucapan "Terima Kasih" (CMD 1017)...`);
    const data = Buffer.alloc(4);
    data.writeUInt32LE(0, 0); // Voice index 0 = "Terima Kasih"
    await zk.executeCmd(1017, data);
    console.log(`  -> PERINTAH SUARA BERHASIL DIKIRIM! Dengarkan suara pada speaker mesin fisik.`);

    console.log(`\n==============================================`);
    console.log(`STATUS: PENGUJIAN BERHASIL SEMPURNA!`);
    console.log(`==============================================\n`);
  } catch (err) {
    console.error(`\n[GAGAL] Tidak dapat terhubung ke ${targetIp}:${targetPort}:`);
    console.error(`Pesan Error: ${err instanceof Error ? err.message : String(err)}`);
    console.log(`\nTips Pengecekan:`);
    console.log(`1. Pastikan mesin dalam keadaan ON dan kabel LAN terpasang.`);
    console.log(`2. Cek IP di menu mesin: M/OK -> Comm. -> Ethernet -> IP Address.`);
    console.log(`3. Pastikan laptop/server berada di satu segmen jaringan WiFi/LAN yang sama.`);
    console.log(`4. Pastikan Comm Key di mesin bernilai 0.`);
  } finally {
    try {
      await zk.disconnect();
    } catch {}
  }
}

runTest();
