import { NextResponse } from "next/server";
import { triggerAttendanceVoice, triggerMachineVoice } from "@/lib/zk-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sensorId, ip, port, voiceIndex } = body;

    let result;
    if (ip) {
      result = await triggerMachineVoice(
        ip,
        Number(port) || 4370,
        typeof voiceIndex === "number" ? voiceIndex : 0
      );
    } else {
      result = await triggerAttendanceVoice(sensorId || "4");
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 502 });
    }
  } catch (err) {
    console.error("Error in test-voice route:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan server saat memicu suara mesin.",
      },
      { status: 500 }
    );
  }
}
