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
}

function getStoredLocations(): LocationsData {
  try {
    if (fs.existsSync(LOCATIONS_FILE)) {
      const content = fs.readFileSync(LOCATIONS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read locations.json:", err);
  }
  return {
    locations: [
      {
        id: "factory",
        name: "Pabrik PT. Citi Plumb",
        lat: -7.1043177,
        lng: 112.3820146,
        radius: 100,
      },
    ],
  };
}

export async function GET() {
  const data = getStoredLocations();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();

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
        radius: 100,
      });
    }

    fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({
      message: "Lokasi Ruang IT berhasil disimpan sebagai titik lokasi resmi.",
      locations: data.locations,
    });
  } catch (err) {
    console.error("Failed to update location:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan koordinat lokasi." },
      { status: 500 }
    );
  }
}
