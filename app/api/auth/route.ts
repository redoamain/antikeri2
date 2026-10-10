import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.APP_PASSWORD || "2027";

    if (!password) {
      return NextResponse.json(
        { error: "Kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    if (password === correctPassword) {
      return NextResponse.json({
        success: true,
        message: "Autentikasi berhasil.",
      });
    }

    return NextResponse.json(
      { error: "Kata sandi salah. Silakan coba lagi." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memverifikasi kata sandi." },
      { status: 500 }
    );
  }
}
