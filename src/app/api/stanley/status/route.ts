import { cookies } from "next/headers";
import { connection } from "next/server";
import { originOf, StanleyAuth, stanleyAvailable } from "@/lib/stanley-auth";

// No secrets and no calls to Stanley: only whether the buttons should show.
export async function GET(request: Request) {
  await connection();
  if (!stanleyAvailable()) return Response.json({ available: false, connected: false });
  const provider = new StanleyAuth(originOf(request), await cookies());
  return Response.json({ available: true, connected: provider.connected() });
}
