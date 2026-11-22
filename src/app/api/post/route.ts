import { guard } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { writePost } from "@/lib/post";
import { POST as POST_PROMPT } from "@/lib/prompts";
import { PostBody, PostOutput } from "@/lib/schemas";

export const maxDuration = 120;

// The guaranteed output: it must never depend on Stanley.
export async function POST(request: Request) {
  const checked = await guard(request, PostBody);
  if ("response" in checked) return checked.response;
  try {
    const post = await writePost(checked.data, async (input) => {
      const output = await structured({
        system: POST_PROMPT,
        input,
        schema: PostOutput,
        effort: "medium",
        signal: request.signal,
      });
      return output.post;
    });
    return Response.json({ post });
  } catch (error) {
    console.error("post:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't write the post. Your take is safe, try again." }, { status: 502 });
  }
}
