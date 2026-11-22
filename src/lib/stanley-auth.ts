// OAuth for Stanley. Everything lives in encrypted, httpOnly cookies, so there is no database.
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { open, seal } from "./sealed";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

// Chat lets Resonate talk to Stanley and save drafts. It never asks for publish.
export const SCOPE = "chat";

const COOKIE = {
  client: "resonate_stanley_client",
  verifier: "resonate_stanley_verifier",
  state: "resonate_stanley_state",
  tokens: "resonate_stanley_tokens",
} as const;
const CHUNK_CHARS = 3500; // Browsers drop cookies over 4KB, and tokens can be long.
const MAX_CHUNKS = 4;
const SIGN_IN_SECONDS = 10 * 60;
const SAVED_SECONDS = 30 * 24 * 60 * 60;

export class PublishScopeError extends Error {
  constructor() {
    super("Stanley granted publish access, which Resonate refuses to hold");
  }
}

export function stanleyAvailable(): boolean {
  return (process.env.COOKIE_SECRET?.length ?? 0) >= 16;
}

/** The origin the browser used. Behind Vercel's proxy, request.url alone can't be trusted for this. */
export function originOf(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

const redirectFor = (origin: string) => `${origin}/api/stanley/callback`;
const documentUrlFor = (origin: string) => `${origin}/api/stanley/client`;

const metadataFor = (origin: string) => ({
  client_name: "Resonate",
  redirect_uris: [redirectFor(origin)],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
  scope: SCOPE,
});

/**
 * Our Client ID Metadata Document. Stanley allows dynamic registration only for approved clients,
 * so the client_id is this document's URL and Stanley fetches it. See app.getstanley.ai/docs/mcp.
 */
export function clientDocument(origin: string) {
  return { client_id: documentUrlFor(origin), client_uri: origin, ...metadataFor(origin) };
}

export class StanleyAuth implements OAuthClientProvider {
  authorizationUrl: URL | undefined;
  private readonly secret: string;

  constructor(
    private readonly origin: string,
    private readonly jar: CookieStore,
  ) {
    const secret = process.env.COOKIE_SECRET;
    if (!secret || !stanleyAvailable()) throw new Error("COOKIE_SECRET is not set");
    this.secret = secret;
  }

  private read<T>(name: string): T | undefined {
    let sealed = "";
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const part = this.jar.get(`${name}.${i}`)?.value;
      if (!part) break;
      sealed += part;
    }
    return sealed ? open<T>(name, sealed, this.secret) : undefined;
  }

  private write(name: string, value: unknown, maxAge: number) {
    const sealed = seal(name, value, this.secret);
    if (sealed.length > CHUNK_CHARS * MAX_CHUNKS) throw new Error(`${name} is too big for cookies`);
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const part = sealed.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
      if (part) {
        this.jar.set(`${name}.${i}`, part, {
          httpOnly: true,
          secure: this.origin.startsWith("https:"),
          sameSite: "lax",
          path: "/",
          maxAge,
        });
      } else if (this.jar.has(`${name}.${i}`)) {
        this.jar.delete(`${name}.${i}`);
      }
    }
  }

  private clear(name: string) {
    for (let i = 0; i < MAX_CHUNKS; i++) {
      if (this.jar.has(`${name}.${i}`)) this.jar.delete(`${name}.${i}`);
    }
  }

  get redirectUrl() {
    return redirectFor(this.origin);
  }

  get clientMetadata() {
    return metadataFor(this.origin);
  }

  /** The document must be public https, so signing in only works on the deployed site. */
  get clientMetadataUrl() {
    return this.origin.startsWith("https:") ? documentUrlFor(this.origin) : undefined;
  }

  connected(): boolean {
    return Boolean(this.read(COOKIE.tokens));
  }

  state(): string {
    const state = randomBytes(24).toString("base64url");
    this.write(COOKIE.state, state, SIGN_IN_SECONDS);
    return state;
  }

  checkState(received: string | null): boolean {
    const expected = this.read<string>(COOKIE.state);
    this.clear(COOKIE.state);
    if (!expected || !received || expected.length !== Buffer.byteLength(received)) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }

  clientInformation() {
    const saved = this.read<{ redirect: string; info: OAuthClientInformationMixed }>(COOKIE.client);
    // A registration only works for the redirect URL it was made with.
    return saved?.redirect === this.redirectUrl ? saved.info : undefined;
  }

  saveClientInformation(info: OAuthClientInformationMixed) {
    this.write(COOKIE.client, { redirect: this.redirectUrl, info }, SAVED_SECONDS);
  }

  tokens() {
    return this.read<OAuthTokens>(COOKIE.tokens);
  }

  saveTokens(tokens: OAuthTokens) {
    if (tokens.scope?.split(/\s+/).includes("publish")) {
      this.clear(COOKIE.tokens);
      throw new PublishScopeError();
    }
    this.write(COOKIE.tokens, tokens, SAVED_SECONDS);
    this.clear(COOKIE.verifier);
  }

  saveCodeVerifier(verifier: string) {
    this.write(COOKIE.verifier, verifier, SIGN_IN_SECONDS);
  }

  codeVerifier(): string {
    const verifier = this.read<string>(COOKIE.verifier);
    if (!verifier) throw new Error("That sign-in expired");
    return verifier;
  }

  redirectToAuthorization(url: URL) {
    // The SDK prefers any scopes the server advertises, so set ours last.
    url.searchParams.set("scope", SCOPE);
    this.authorizationUrl = url;
  }

  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    if (scope === "all" || scope === "client") this.clear(COOKIE.client);
    if (scope === "all" || scope === "tokens") this.clear(COOKIE.tokens);
    if (scope === "all" || scope === "verifier") this.clear(COOKIE.verifier);
  }
}
