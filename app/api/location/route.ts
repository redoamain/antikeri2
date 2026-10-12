import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOCATIONS_FILE = path.join(process.cwd(), "lib", "locations.json");

interface LocationItem {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  radius: number;
}

interface LocationsData {
  locations: LocationItem[];
  bypassEnabled?: boolean;
}

function getStoredLocations(): LocationsData {
  const envRadius =
    Number(process.env.GEOFENCE_RADIUS || process.env.LOCATION_RADIUS) || null;
  let rawLocations: LocationItem[] = [];
  let bypassEnabled = false;

  try {
    if (fs.existsSync(LOCATIONS_FILE)) {
      const content = fs.readFileSync(LOCATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      rawLocations = Array.isArray(parsed.locations) ? parsed.locations : [];
      bypassEnabled = Boolean(parsed.bypassEnabled);
    }
  } catch (err) {
    console.error("Failed to read locations.json:", err);
  }

  if (rawLocations.length === 0) {
    rawLocations = [
      {
        id: "office",
        name: "PT. Citi Plumb",
        lat: -7.0975488,
        lng: 112.3876864,
        radius: envRadius || 500,
      },
      {
        id: "factory",
        name: "Pabrik PT. Citi Plumb",
        lat: -7.1043177,
        lng: 112.3820146,
        radius: envRadius || 500,
      },
    ];
  }

  // Jika radius disetel di ENV, terapkan ke semua titik lokasi
  const finalLocations = rawLocations.map((loc) => ({
    ...loc,
    radius: envRadius && envRadius > 0 ? envRadius : (loc.radius || 500),
  }));

  return {
    locations: finalLocations,
    bypassEnabled,
  };
}

export async function GET() {
  const data = getStoredLocations();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Jika update status bypassEnabled
    if (typeof body.bypassEnabled === "boolean") {
      const data = getStoredLocations();
      data.bypassEnabled = body.bypassEnabled;
      fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
      return NextResponse.json({
        success: true,
        message: body.bypassEnabled
          ? "Fitur bypass testing berhasil diaktifkan."
          : "Fitur bypass testing berhasil dinonaktifkan.",
        bypassEnabled: data.bypassEnabled,
      });
    }

    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Latitude dan Longitude harus berupa angka valid." },
        { status: 400 }
      );
    }

    const data = getStoredLocations();
    const itRoomIndex = data.locations.findIndex((l) => l.id === "it_room");

    if (itRoomIndex >= 0) {
      data.locations[itRoomIndex].lat = lat;
      data.locations[itRoomIndex].lng = lng;
    } else {
      data.locations.push({
        id: "it_room",
        name: "Ruang IT (Development)",
        lat,
        lng,
        radius:
          Number(process.env.GEOFENCE_RADIUS || process.env.LOCATION_RADIUS) || 500,
      });
    }

    fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({
      message: "Lokasi Ruang IT berhasil disimpan sebagai titik lokasi resmi.",
      locations: data.locations,
      bypassEnabled: data.bypassEnabled ?? false,
    });
  } catch (err) {
    console.error("Failed to update location:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan koordinat lokasi." },
      { status: 500 }
    );
  }
}
