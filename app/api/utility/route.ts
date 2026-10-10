import { GET as disklogGET, POST as disklogPOST } from "@/app/api/admin/disklog/route";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Jika ada query execute=true atau x-repair-password
  if (url.searchParams.get("execute") === "true" || request.headers.get("x-repair-password")) {
    return disklogPOST();
  }
  return disklogGET();
}

export async function POST() {
  return disklogPOST();
}
