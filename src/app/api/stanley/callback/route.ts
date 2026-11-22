import { cookies } from "next/headers";
import { connection, NextResponse } from "next/server";
import { finishSignIn } from "@/lib/stanley";
import { originOf, PublishScopeError, StanleyAuth, stanleyAvailable } from "@/lib/stanley-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  const origin = originOf(request);
  const back = (result: string) => NextResponse.redirect(`${origin}/?stanley=${result}`);
  if (!stanleyAvailable()) return back("unavailable");

  const params = new URL(request.url).searchParams;
  const provider = new StanleyAuth(origin, await cookies());
  if (!provider.checkState(params.get("state"))) return back("failed");
  const code = params.get("code");
  if (!code) return back("denied");
  try {
    await finishSignIn(provider, code);
    return back("connected");
  } catch (error) {
    console.error("stanley callback:", error instanceof Error ? error.message : error);
    return back(error instanceof PublishScopeError ? "publish" : "failed");
  }
}
