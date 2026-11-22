import { cookies } from "next/headers";
import { connection, NextResponse } from "next/server";
import { startSignIn } from "@/lib/stanley";
import { originOf, StanleyAuth, stanleyAvailable } from "@/lib/stanley-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const origin = originOf(request);
  const back = (result: string) => NextResponse.redirect(`${origin}/?stanley=${result}`);
  if (!stanleyAvailable()) return back("unavailable");
  const jar = await cookies();
  try {
    return NextResponse.redirect(await startSignIn(new StanleyAuth(origin, jar)));
  } catch (error) {
    console.error("stanley connect:", error instanceof Error ? error.message : error);
    return back("failed");
  }
}
