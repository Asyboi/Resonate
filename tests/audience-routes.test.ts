import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ structured: vi.fn(), message: vi.fn() }));
vi.mock("@/lib/llm", () => ({ structured: mocks.structured }));
vi.mock("@/lib/stanley", () => ({
  message: mocks.message,
  stanleyResponse: async (_: Request, work: (provider: object) => Promise<unknown>) => Response.json(await work({})),
}));

import { POST as summarize } from "../src/app/api/audience/route";
import { POST as pull } from "../src/app/api/stanley/audience/route";
import { PULL_AUDIENCE } from "../src/lib/stanley-protocol";

const post = (body: object) =>
  new Request("http://localhost/api", { method: "POST", headers: { "x-demo-code": "test-code" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.stubEnv("DEMO_CODE", "test-code");
  mocks.structured.mockReset();
  mocks.message.mockReset();
});

test("pasted analytics become one line", async () => {
  mocks.structured.mockResolvedValue({ line: " University students and software engineers " });
  expect(await (await summarize(post({ text: "Students 40%" }))).json()).toEqual({ line: "University students and software engineers" });
});
test.each(["", "20 students at a school", "students like @someone"])("an unsafe summary is never shown: %s", async (line) => {
  mocks.structured.mockResolvedValue({ line });
  expect((await summarize(post({ text: "Students 40%" }))).status).toBe(422);
});
test("pasted analytics need the demo code", async () => {
  const request = new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ text: "Students 40%" }) });
  expect((await summarize(request)).status).toBe(401);
  expect(mocks.structured).not.toHaveBeenCalled();
});
test("the Stanley pull sends only the fixed read-only question", async () => {
  mocks.message.mockResolvedValue({ status: "done", reply: "UNAVAILABLE" });
  await pull(post({}));
  expect(mocks.message).toHaveBeenCalledWith({}, PULL_AUDIENCE);
});
