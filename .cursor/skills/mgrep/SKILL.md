---
name: mgrep
description: Semantic codebase search using mgrep (mixedbread). Use when exploring the codebase by intent, finding where something is implemented, or when the user asks "where do we X?", "how does Y work?", or similar. Prefer grep/ripgrep for exact symbols, refactors, and regex.
---

# mgrep — semantic search

[mgrep](https://github.com/mixedbread-ai/mgrep) searches by meaning, not exact text. Use it for intent and concept search; use grep/ripgrep for exact matches and symbol tracing.

## When to use

| Use **mgrep** for             | Use **grep/ripgrep** for   |
| ----------------------------- | -------------------------- |
| "Where is auth configured?"   | Exact symbol or identifier |
| "How do we parse chunks?"     | Refactoring, rename        |
| Feature discovery, onboarding | Regex, known patterns      |

## How to run

From the **workspace root**:

```bash
mgrep -c -m 15 "<query>" [path]
```

- `-c` / `--content`: include snippet content (recommended for agent use).
- `-m <n>`: max results (e.g. 15–25).
- Optional `path`: e.g. `src/` or `src/gitUtils`.

Examples:

```bash
mgrep -c -m 15 "where do we set up auth?"
mgrep -c -m 15 "branch checking logic" src/gitUtils
```

## Optional flags

- `--answer` / `-a`: summarized answer from results.
- `--web` / `-w`: include web search (docs, tutorials).
- `--agentic`: break complex questions into sub-queries.
- `--sync` / `-s`: sync store before searching (if index may be stale).

## Using results

Rely on mgrep output (paths and snippets) to answer or edit; do not invent file contents. If needed, read the reported files for full context.

## Setup (if mgrep unavailable)

- Install: `npm install -g @mixedbread/mgrep` (or pnpm/bun).
- Auth: `mgrep login` or set `MXBAI_API_KEY`.
- Index (optional): `mgrep watch` in project root.
