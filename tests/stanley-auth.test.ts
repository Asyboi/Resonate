import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { clientDocument, StanleyAuth } from "../src/lib/stanley-auth";

const ORIGIN = "https://resonate.example";
const jar = { get: () => undefined, has: () => false, set: () => {}, delete: () => {} } as never;

beforeEach(() => vi.stubEnv("COOKIE_SECRET", "a-test-secret-for-cookies"));
afterEach(() => vi.unstubAllEnvs());

// Regression: Stanley only allows dynamic registration for approved clients.
test("identifies itself with a metadata document URL, not registration", () =>
  expect(new StanleyAuth(ORIGIN, jar).clientMetadataUrl).toBe(`${ORIGIN}/api/stanley/client`));
test("plain http can't host a metadata document", () =>
  expect(new StanleyAuth("http://localhost:3000", jar).clientMetadataUrl).toBeUndefined());
test("the document names its own URL and the exact redirect", () =>
  expect(clientDocument(ORIGIN)).toMatchObject({
    client_id: `${ORIGIN}/api/stanley/client`,
    client_name: "Resonate",
    redirect_uris: [`${ORIGIN}/api/stanley/callback`],
    token_endpoint_auth_method: "none",
    scope: "chat",
  }));
