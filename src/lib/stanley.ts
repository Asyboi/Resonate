// Every Stanley call lives in this file.
import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { cookies } from "next/headers";
import { originOf, PublishScopeError, SCOPE, StanleyAuth, stanleyAvailable } from "./stanley-auth";
import { pendingId, type StanleyResult } from "./stanley-protocol";

// Stanley holds each call for up to 45 seconds before answering "still working".
const CALL_TIMEOUT_MS = 75_000;

// The override is for testing against a local stand-in, never for production.
const serverUrl = () =>
  (process.env.NODE_ENV !== "production" && process.env.STANLEY_MCP_URL) || "https://xapi.getstanley.ai/mcp";

export async function startSignIn(provider: StanleyAuth): Promise<URL> {
  provider.invalidateCredentials("tokens");
  // Passed explicitly: otherwise the SDK registers for every scope the server advertises.
  await auth(provider, { serverUrl: serverUrl(), scope: SCOPE });
  if (!provider.authorizationUrl) throw new Error("Stanley didn't return a sign-in page");
  return provider.authorizationUrl;
}

export async function finishSignIn(provider: StanleyAuth, code: string): Promise<void> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl()), { authProvider: provider });
  try {
    await transport.finishAuth(code);
  } finally {
    await transport.close();
  }
}

async function callTool(provider: StanleyAuth, name: string, args: Record<string, string>, earlierId?: string): Promise<StanleyResult> {
  const client = new Client({ name: "resonate", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl()), { authProvider: provider });
  try {
    await client.connect(transport, { timeout: 20_000 });
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: CALL_TIMEOUT_MS });
    const blocks = result.content as { type: string; text?: string }[];
    const reply = blocks.flatMap((block) => (block.type === "text" && block.text ? [block.text] : [])).join("\n");
    if (result.isError || !reply) throw new Error("Stanley returned an error");
    const id = pendingId(reply);
    // While it works, the reply names the id to poll. A poll may repeat itself without the id.
    if (id) return { status: "pending", id };
    if (earlierId && /still working/i.test(reply.slice(0, 120))) return { status: "pending", id: earlierId };
    return { status: "done", reply };
  } finally {
    await client.close();
  }
}

// No retries: resending starts the task over and could save two drafts.
export const message = (provider: StanleyAuth, text: string) => callTool(provider, "message_stanley", { message: text });
export const checkReply = (provider: StanleyAuth, id: string) => callTool(provider, "check_stanley_reply", { message_id: id }, id);

/** Shared by the Stanley routes. Never answers 401: in this app that means "enter the demo code". */
export async function stanleyResponse(
  request: Request,
  work: (provider: StanleyAuth) => Promise<StanleyResult>,
  failure: string,
): Promise<Response> {
  const fail = (status: number, error: string) => Response.json({ error }, { status });
  const origin = originOf(request);
  if (request.headers.get("origin") !== origin) return fail(403, "Open Resonate to do that.");
  if (!stanleyAvailable()) return fail(503, "Stanley isn't set up here. Copy the brief instead.");

  const provider = new StanleyAuth(origin, await cookies());
  if (!provider.connected()) return fail(409, "Connect Stanley first.");
  try {
    return Response.json(await work(provider));
  } catch (error) {
    console.error("stanley:", error instanceof Error ? error.message : error);
    if (error instanceof PublishScopeError) return fail(409, "Stanley offered publish access. Reconnect with chat only.");
    if (error instanceof UnauthorizedError) {
      provider.invalidateCredentials("tokens");
      return fail(409, "Stanley signed you out. Connect again.");
    }
    return fail(502, failure);
  }
}
