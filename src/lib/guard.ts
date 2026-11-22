import { createHash, timingSafeEqual } from "node:crypto";
import type { z } from "zod";

// 20 contexts of 10,000 characters, plus room for lessons and JSON overhead.
const MAX_BODY_CHARS = 250_000;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Returns the validated body, or the Response to send back. */
export async function guard<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: Response }> {
  const fail = (status: number, error: string) => ({ response: Response.json({ error }, { status }) });

  const code = process.env.DEMO_CODE;
  if (!code && process.env.NODE_ENV === "production") return fail(503, "Demo code is not configured.");
  if (code && !timingSafeEqual(digest(request.headers.get("x-demo-code") ?? ""), digest(code))) {
    return fail(401, "Enter the demo code.");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return fail(413, "That's too much text at once. Remove a few items.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "Couldn't read that request.");
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { data: parsed.data } : fail(400, "Some fields are missing or too long.");
}
