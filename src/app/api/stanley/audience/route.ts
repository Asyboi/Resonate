import { guard } from "@/lib/guard";
import { EmptyBody } from "@/lib/schemas";
import { message, stanleyResponse } from "@/lib/stanley";
import { PULL_AUDIENCE } from "@/lib/stanley-protocol";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, EmptyBody);
  if ("response" in checked) return checked.response;
  return stanleyResponse(request, (provider) => message(provider, PULL_AUDIENCE), "Stanley couldn't share your audience. Paste it instead.");
}
