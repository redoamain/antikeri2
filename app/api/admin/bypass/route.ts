import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOCATIONS_FILE = path.join(process.cwd(), "lib", "locations.json");

export async function GET() {
  try {
    if (fs.existsSync(LOCATIONS_FILE)) {
      const content = fs.readFileSync(LOCATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return NextResponse.json({
        bypassEnabled: Boolean(parsed.bypassEnabled),
      });
    }
  } catch (err) {
    console.error("Gagal membaca status bypass:", err);
  }
  return NextResponse.json({ bypassEnabled: false });
}

export async function POST(request: Request) {
  try {
    const { enabled } = await request.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Parameter 'enabled' bertipe boolean wajib disertakan." },
        { status: 400 }
      );
    }

    let fileData: { locations?: unknown[]; bypassEnabled?: boolean } = {
      locations: [],
      bypassEnabled: false,
    };

    if (fs.existsSync(LOCATIONS_FILE)) {
      try {
        fileData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, "utf-8"));
      } catch (e) {
        console.warn("Gagal parse locations.json, membuat template baru:", e);
      }
    }

    fileData.bypassEnabled = enabled;

    fs.writeFileSync(
      LOCATIONS_FILE,
      JSON.stringify(fileData, null, 2),
      "utf-8"
    );

    return NextResponse.json({
      success: true,
      bypassEnabled: enabled,
      message: enabled
        ? "Fitur bypass lokasi GPS (Mode Testing) BERHASIL DIAKTIFKAN."
        : "Fitur bypass lokasi GPS BERHASIL DINONAKTIFKAN (Ketat).",
    });
  } catch (err) {
    console.error("Gagal mengupdate status bypass:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan perubahan status bypass." },
      { status: 500 }
    );
  }
}
