import { connection } from "next/server";
import { clientDocument, originOf } from "@/lib/stanley-auth";

// Public by design: Stanley fetches this to learn who is asking to connect. It holds no secrets.
export async function GET(request: Request) {
  await connection();
  return Response.json(clientDocument(originOf(request)), { headers: { "Cache-Control": "no-cache" } });
}
