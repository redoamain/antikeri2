# Panduan Integrasi Mesin Presensi Solution X105-ID (antikeri2)

Dokumentasi ini menjelaskan langkah-langkah lengkap untuk menghubungkan mesin presensi fisik **Solution X105-ID** (berbasis ZKTeco Standalone Protocol) ke sistem web **antikeri2**, termasuk sinkronisasi database, komunikasi soket jaringan, dan perintah pemicu suara fisik (*Voice Prompt Feedback*).

---

## Daftar Isi
1. [Arsitektur & Topologi Jaringan](#1-arsitektur--topologi-jaringan)
2. [Konfigurasi pada Mesin Fisik Solution X105-ID](#2-konfigurasi-pada-mesin-fisik-solution-x105-id)
3. [Konfigurasi pada Database & Aplikasi](#3-konfigurasi-pada-database--aplikasi)
4. [Uji Coba Koneksi & Pemicu Suara (Testing)](#4-uji-coba-koneksi--pemicu-suara-testing)
5. [Daftar Sensor Bawaan yang Terdaftar](#5-daftar-sensor-bawaan-yang-terdaftar)
6. [Troubleshooting & Pemecahan Masalah](#6-troubleshooting--pemecahan-masalah)

---

## 1. Arsitektur & Topologi Jaringan

Sistem web **antikeri2** berkomunikasi dua arah:
1. **Ke Database SQL Server (Port 1433):** Membaca daftar sensor (`Machines`) dan riwayat log kehadiran (`CHECKINOUT`).
2. **Ke Mesin Fisik via ZK Protocol (Port 4370):** Mengirim perintah langsung melalui soket TCP/UDP ke mesin presensi fisik menggunakan library `node-zklib` (misalnya membunyikan suara ucapan *"Terima Kasih"* atau validasi status).

```text
+------------------------+             +------------------------+
|  Mesin Solution X105-ID |             |    Server / PC Web     |
|   (IP: 192.168.1.24x)  |<----------->|   (IP: 192.168.1.13)   |
|       Port: 4370       |  Protokol   |       antikeri2        |
+------------------------+    ZK       +-----------+------------+
                                                    |
                                                    | SQL Server (1433)
                                                    v
                                       +------------------------+
                                       |      Database DB       |
                                       |     Tabel Machines     |
                                       |    Tabel CHECKINOUT    |
                                       +------------------------+
```

> **PENTING:** Mesin presensi dan komputer server/laptop **harus berada di satu segmen jaringan (Local Area Network / Switch / Router yang sama)** atau dapat saling menjangkau (*routable*).

---

## 2. Konfigurasi pada Mesin Fisik Solution X105-ID

Pastikan kabel LAN (RJ45) sudah tercolok di port belakang mesin dan lampu indikator port menyala.

### Langkah-langkah di Layar Mesin:

1. **Buka Menu Utama:**
   * Tekan tombol **M/OK** pada keypad mesin. Jika mesin terkunci oleh administrator, gunakan sidik jari/kartu admin untuk masuk.
2. **Pengaturan IP Address (Ethernet):**
   * Masuk ke menu **Comm.** (Komunikasi) &rarr; pilih **Ethernet**.
   * Atur pengaturan berikut:
     * **IP Address:** Berikan IP statis yang tidak bentrok dengan perangkat lain (contoh: `192.168.1.244`).
     * **Subnet Mask:** `255.255.255.0`
     * **Gateway:** Sesuaikan dengan IP Router Anda (contoh: `192.168.1.1`).
     * **Port:** Tetap di **`4370`** (standar ZKTeco).
   * Tekan **M/OK** untuk menyimpan perubahan.
3. **Pengaturan Kunci Komunikasi (Comm Key):**
   * Masuk ke **Comm.** &rarr; pilih **PC Comm** atau **Comm Key**.
   * Pastikan nilainya adalah **`0`** (nol / kosong tanpa sandi).
   * *Catatan: Jika Comm Key diisi angka selain 0, koneksi script akan ditolak karena enkripsi otentikasi.*
4. **Pengaturan Nomor Mesin (Device ID):**
   * Masuk ke **System** (Sistem) &rarr; **Device / Unit Info**.
   * Pastikan **Device ID / Machine ID** sesuai dengan ID sensor di database (misal: ID `1`, `2`, `4`, dll.).
5. **Pengaturan Volume Suara:**
   * Masuk ke **System** &rarr; **Voice / Audio**.
   * Pastikan volume suara aktif agar suara ucapan *"Terima Kasih"* terdengar jelas saat dipicu.

---

## 3. Konfigurasi pada Database & Aplikasi

### 3.1. Konfigurasi Environment (`.env`)
Pastikan file `.env` di direktori proyek telah terisi kredensial SQL Server dan konfigurasi IP mesin dengan benar:
```env
# Database Absensi
DB_USER=sa
DB_PASSWORD=myPass123!
DB_SERVER=127.0.0.1
DB_PORT=1433
DB_DATABASE=Absensi
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=false

# Port & IP Mesin Presensi (Aman & Tidak Di-hardcode di Tampilan)
MACHINE_PORT=4370
MACHINE_OFFICE_IP=192.168.1.244
MACHINE_1_IP=192.168.1.241
MACHINE_2_IP=192.168.1.242
MACHINE_3_IP=192.168.1.243
MACHINE_4_IP=192.168.1.244
MACHINE_5_IP=192.168.1.245
MACHINE_6_IP=192.168.1.246
```
> **Keamanan:** Alamat IP internal mesin kini diproses di sisi server (*server-side*) dan tidak pernah dibocorkan atau di-*hardcode* di tampilan antarmuka web.

### 3.2. Mendaftarkan Mesin di Tabel `Machines`
Jika Anda menambah mesin baru atau mengubah IP mesin, perbarui data di database SQL Server:
```sql
UPDATE Machines 
SET IP = '192.168.1.244', Port = 4370 
WHERE ID = 4;
```
Atau jika memasukkan mesin baru:
```sql
INSERT INTO Machines (ID, MachineAlias, IP, Port, ProductType, Enabled, Purpose)
VALUES (7, 'ATT Baru', '192.168.1.247', 4370, 'X105-ID', 1, 1);
```

### 3.3. Fallback di `lib/zk-service.ts`
Jika koneksi database terputus, aplikasi memiliki daftar fallback IP di [`lib/zk-service.ts`](lib/zk-service.ts#L11). Anda dapat menyesuaikan pemetaan IP jika diperlukan.

---

## 4. Uji Coba Koneksi & Pemicu Suara (Testing)

Proyek ini telah dilengkapi dengan perkakas uji coba otomatis untuk memverifikasi soket jaringan dan membunyikan suara mesin secara langsung.

### Metode 1: Menggunakan CLI Test Script (Rekomendasi)

Jalankan perintah berikut di terminal:

```bash
# Uji coba ke IP mesin bawaan (192.168.1.244)
bun run test:machine

# ATAU uji coba langsung ke IP mesin tertentu:
bun run test-machine.ts 192.168.1.244

# Tentukan IP dan port khusus (jika port bukan 4370):
bun run test-machine.ts 192.168.1.244 4370
```

**Hasil yang diharapkan saat sukses:**
```text
==============================================
Menguji Koneksi ke Mesin Solution X105-ID
Target: 192.168.1.244:4370
==============================================

[1/3] Menghubungkan via ZK Protocol...
  -> Berhasil terhubung ke socket mesin!

[2/3] Membaca data perangkat...
  -> Serial Number  : A6G6200360023
  -> Firmware Version: Ver 8.0.4.2-20191220
  -> Device Name     : X105-ID

[3/3] Membunyikan suara ucapan "Terima Kasih" (CMD 1017)...
  -> PERINTAH SUARA BERHASIL DIKIRIM! Dengarkan suara pada speaker mesin fisik.

==============================================
STATUS: PENGUJIAN BERHASIL SEMPURNA!
==============================================
```

### Metode 2: Menggunakan HTTP REST API

Ketika aplikasi Next.js sedang berjalan, Anda dapat memicu pengujian melalui HTTP request:

```bash
# Uji coba via IP spesifik
curl -X POST http://localhost:3289/api/sensors/test-voice \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.244",
    "port": 4370,
    "voiceIndex": 0
  }'

# Uji coba berdasarkan Sensor ID yang terdaftar
curl -X POST http://localhost:3289/api/sensors/test-voice \
  -H "Content-Type: application/json" \
  -d '{
    "sensorId": "4"
  }'
```

---

## 5. Daftar Sensor Bawaan yang Terdaftar

| ID Sensor | Nama / Alias | IP Default | Port | Serial Number | Model |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **1** | ATT Admin | `192.168.1.241` | 4370 | A5NS190560046 | Solution X105-ID |
| **2** | ATT 2 Injection | `192.168.1.242` | 4370 | A6G6212260014 | Solution X105-ID |
| **3** | ATT 3 Belakang | `192.168.1.243` | 4370 | A5NS193460452 | Solution X105-ID |
| **4** | ATT Office | `192.168.1.244` | 4370 | A6G6200360023 | Solution X105-ID |
| **5** | ATT Assembly | `192.168.1.245` | 4370 | NHZ4244900223 | Solution X105-ID |
| **6** | ATT 1 Security | `192.168.1.246` | 4370 | NHZ4244900678 | Solution X105-ID |

---

## 6. Troubleshooting & Pemecahan Masalah

### 1. Mesin Gagal Terhubung / Timeout (`[GAGAL] Tidak dapat terhubung`)
* **Tes PING:** Buka terminal dan lakukan tes:
  ```bash
  ping 192.168.1.244
  ```
  Jika ping RTO (Request Time Out):
  * Periksa apakah kabel LAN sudah terpasang kencang di mesin dan switch/router.
  * Pastikan komputer server dan mesin berada pada subnet IP yang sama (misal sama-sama `192.168.1.x`).
  * Jika menggunakan WiFi, pastikan WiFi terhubung ke router yang sama dengan switch mesin presensi (bukan koneksi hotspot HP atau jaringan terisolasi).

### 2. Ping Sukses, Tapi Script Gagal Terhubung
* Periksa pengaturan **Comm Key** di mesin: harus bernilai **`0`** (bukan angka sandi lain).
* Periksa apakah port di menu mesin berubah (pastikan tetap **`4370`**).
* Pastikan software bawaan desktop (seperti *ZKTeco Attendance Management*) di komputer lain tidak sedang mengunci koneksi soket mesin secara eksklusif.

### 3. Perintah Sukses, Tapi Mesin Tidak Bersuara
* Masuk ke menu mesin &rarr; **System** &rarr; **Voice / Audio**, pastikan volume speaker mesin tidak berada di level 0 (mute).
* Suara default yang dipanggil adalah `voiceIndex = 0` yang bersesuaian dengan *"Terima Kasih"* (*Thank You*).

---

## Menjalankan Server Aplikasi

* **Mode Pengembangan:**
  ```bash
  bun dev
  ```
* **Mode Produksi (PM2):**
  ```bash
  pm2 start ecosystem.config.cjs
  ```
  Aplikasi akan berjalan pada port `3289` (`http://localhost:3289`).
