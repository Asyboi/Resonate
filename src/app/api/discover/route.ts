import { discover, seedsFrom } from "@/lib/discover";
import { guard } from "@/lib/guard";
import { liveDeps } from "@/lib/live";
import { DiscoverBody } from "@/lib/schemas";
import { eventStream } from "@/lib/sse";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, DiscoverBody);
  if ("response" in checked) return checked.response;
  const { lessons } = checked.data;
  return eventStream(
    discover({ lessons, seeds: seedsFrom(lessons), withResearch: true, signal: request.signal }, liveDeps),
  );
}
