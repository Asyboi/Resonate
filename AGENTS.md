## Judging gate (required)

Before any change, feature or plan goes ahead:

1. Read `JUDGING.md` at the repo root, even for a small change.
2. Run its gate against the current Eastern time.
3. State the verdict to the user, using the block in that file, before editing or approving a plan.
4. On REVISE or CUT, stop and tell the user. Continue only after a revised PASS or the user's explicit override.

This also applies to subagents: include this rule in their prompts. Reading and research need no verdict.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
