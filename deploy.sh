#!/bin/bash
# ==============================================================================
# Script Otomatis Deploy / Update ke aaPanel dengan PM2
# ==============================================================================

set -e

echo "🚀 [1/4] Memasang dependensi..."
pnpm install --frozen-lockfile || npm install

echo "🔨 [2/4] Melakukan build Next.js..."
pnpm build || npm run build

echo "🔄 [3/4] Menjalankan / Reload proses PM2..."
if pm2 describe antikeri-absensi > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env
    echo "✅ Aplikasi berhasil di-reload dengan PM2."
else
    pm2 start ecosystem.config.cjs
    echo "✅ Aplikasi berhasil dijalankan dengan PM2."
fi

echo "💾 [4/4] Menyimpan daftar proses PM2 agar auto-start saat reboot..."
pm2 save

echo ""
echo "🎉 Deployment selesai! Aplikasi berjalan di port 3289."
