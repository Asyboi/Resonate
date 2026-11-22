import { guard } from "@/lib/guard";
import { CheckBody } from "@/lib/schemas";
import { checkReply, stanleyResponse } from "@/lib/stanley";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, CheckBody);
  if ("response" in checked) return checked.response;
  return stanleyResponse(request, (provider) => checkReply(provider, checked.data.id), "Couldn't reach Stanley.");
}
