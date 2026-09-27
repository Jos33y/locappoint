# Tests

Frontend checks that run in a real Chrome against a stand-in Supabase. Nothing touches the real database.

| Command | What it checks | Time |
|---------|----------------|------|
| `npm run test:flows` | Clicks through the shell, hubs, account menu, search, tour and the Business page, including autosave | about 1 minute |
| `npm run test:layout` | 13 screens from a 320px phone to 1920 x 1080, including the 13-inch at 1272 x 588: overflow, clipping, fit, touch sizes | about 4 minutes |
| `npm test` | Both | about 5 minutes |

One-time setup: `npm install -D puppeteer-core`. The runner uses the Chrome or Edge already on the computer. If it cannot find one, set `CHROME_PATH` to the full path of `chrome.exe`.

- `harness/` renders the business side with a fake signed-in owner (Femtos Barbearia) and a fake Supabase that records every call.
- `suites/` holds the checks. Add to them when a screen changes.
- `node tests/run.mjs layout 1272` runs only the screens whose name contains `1272`.
