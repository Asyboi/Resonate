# Resonate

Stop asking "what should I post?" Start asking "who needs me today?"

Resonate turns what a creator has lived through into lessons, finds people on the live web who wrote in the last 7 days about living that problem, and helps the creator write the post for them.

Built at Creator Economy Hack, 2026-11-22. Track: Idea to Post.

## How it works

1. **Lessons.** Paste or type posts and notes. Every lesson links to a quote from the creator's own words. Optionally confirm one line about who reads you, which steers the searches.
2. **Map.** Live searches find people and cluster them around each lesson, labeled by situation and never by name.
3. **Post.** See what the niche is saying, answer one question, and get a finished, editable post.
4. **Resonance loop.** Paste a comment that resonated. With identifying details removed, it becomes new searches and the cluster grows.

## Works alongside Stanley

Optional. Resonate can connect to Stanley over MCP to pull a creator's past posts (confirmed by the creator before use) and to send a brief they have read and edited, to be saved as an unscheduled draft. It asks for the `chat` permission only and refuses a token that can publish. It identifies itself with a [Client ID Metadata Document](https://app.getstanley.ai/docs/mcp), so signing in works only on a public https deployment, not on localhost. The finished post never depends on Stanley.

## How it uses You.com

| API | What it powers |
|---|---|
| Search | Finds people writing in the voice of someone who needs each lesson, and powers the resonance loop |
| Contents | Checks that each quote is on the page and reads the page's own publish date |
| Research | Finds pressures the lessons didn't predict, as a second wave of searches |
| Answer | Says what the niche is saying this week, with sources |

Without the live web the map is empty.

## Stack

Next.js, TypeScript, Tailwind, react-force-graph-2d, MCP TypeScript SDK, OpenAI GPT-6.2 Sol with structured outputs, IndexedDB.

## Run it

```bash
pnpm install
cp .env.example .env.local   # add YOU_API_KEY and OPENAI_API_KEY
pnpm dev
```

`pnpm smoke` checks each live connection. `pnpm test` runs the tests. In production, set `DEMO_CODE`: the API routes refuse requests without it. Set `COOKIE_SECRET` (16+ random characters) to show the Stanley connection.

## Privacy

- The creator's data is saved in their browser. It is sent to OpenAI for processing, with response storage off.
- You.com gets searches, lesson names and audience descriptions. Identifying details are removed from pasted comments before searching.
- Stanley gets a brief only when the creator sends it. Its tokens stay in encrypted, httpOnly cookies.
- A post never receives a found person's name, quote or link.
- People who appear to be minors or in crisis, or whose struggle centers on illness, loss or trauma, are not shown.
- Nothing is sent or published on the creator's behalf.
