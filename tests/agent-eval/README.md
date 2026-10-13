# WhatsApp agent evaluation

25 simulated people talk to the real WhatsApp agent, each in their own way: European and Brazilian Portuguese, Pidgin, typos, three-word messages, long stories, vague dates, groups, changing their mind, cancelling, moving, rudeness, and an attempt to take over the rules. Each conversation is checked by rules and reviewed by a second model. The result is a pass rate and a report with every conversation.

Nothing touches Supabase or WhatsApp: the agent runs against `fixtures.mjs`, a frozen copy of the business data (The Brick Dev as it is live, three made-up businesses with the same shapes, and a demo page). Only Anthropic's API is called.

## Run

In PowerShell, from the repo root:

```powershell
$env:ANTHROPIC_API_KEY = Read-Host "Anthropic key"
npm run eval:agent
```

The key lives only in that window. It is never written to a file.

Options, after `--`:

- `--only pidgin` runs the personas whose id contains the word.
- `--model claude-sonnet-5-5` uses another model for the agent, to compare on the same 25.
- `--parallel 1` runs one conversation at a time (default 2); use it if Anthropic says too many requests.
- `--judge-model` and `--sim-model` change the reviewer (default claude-sonnet-5-5, falls back to the agent's model) and the simulated person (default claude-haiku-5-5).

The report is written to `tests/agent-eval/out/report.md`, which git ignores.

## What decides pass or fail

Every reply: no long dashes, no double-asterisk bold, no headings, no emojis, no "€0", no dates as 2026-10-12, no fallback or paused message, and the language of the person (European Portuguese for Portuguese, English for English and Pidgin).

Each persona: its own `expect` in `personas.mjs` (the right business, service, day, time, number of people, email, payment link, or nothing booked).

The review: a second model reads the conversation with the business data and fails it only for problems a real client would notice.

## Change it

- A new kind of person: copy a block in `personas.mjs`.
- A business or service: `fixtures.mjs`. Keep the field names; they match the database functions.
- When `whatsapp/index.ts` changes what happens after Yes, change `settle` in `run.mjs` the same way.
