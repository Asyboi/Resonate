import { guard } from "@/lib/guard";
import { SendBody } from "@/lib/schemas";
import { message, stanleyResponse } from "@/lib/stanley";
import { safeBrief } from "@/lib/stanley-protocol";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, SendBody);
  if ("response" in checked) return checked.response;
  let brief: string;
  try {
    brief = safeBrief(checked.data.text);
  } catch {
    return Response.json({ error: "That brief is too long for Stanley. Shorten it." }, { status: 400 });
  }
  return stanleyResponse(
    request,
    (provider) => message(provider, brief),
    "Stanley didn't confirm. Check your drafts before sending again.",
  );
}
