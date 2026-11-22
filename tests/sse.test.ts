import { expect, test } from "vitest";
import { readEvents } from "../src/lib/sse";

test("parses an event split across two chunks once and intact", async () => {
  const bytes = new TextEncoder().encode('data: {"type":"status","message":"héllo"}\n\n');
  // Split inside the two-byte "é".
  const cut = bytes.indexOf(0xc3) + 1;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, cut));
      controller.enqueue(bytes.slice(cut));
      controller.close();
    },
  });
  const events = [];
  for await (const event of readEvents(body)) events.push(event);
  expect(events).toEqual([{ type: "status", message: "héllo" }]);
});
