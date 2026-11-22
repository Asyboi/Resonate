import { guard } from "@/lib/guard";
import { EmptyBody } from "@/lib/schemas";
import { message, stanleyResponse } from "@/lib/stanley";
import { PULL } from "@/lib/stanley-protocol";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, EmptyBody);
  if ("response" in checked) return checked.response;
  return stanleyResponse(request, (provider) => message(provider, PULL), "Stanley couldn't share posts. Paste them instead.");
}
