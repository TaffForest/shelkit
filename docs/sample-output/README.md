# ShelKit Build — sample-output baseline

Frozen reference output from the six demo prompts, generated against the v1
system prompt at commit `8ba0e64` (`feat(build): full v1 system prompt +
edit-mode addendum`). Use this directory as a visual regression baseline:
when the system prompt changes, generate the same six prompts and compare
against these.

## Demos

| # | Brief | Directory |
|---|---|---|
| 1 | A portfolio site for a freelance illustrator with a gallery and contact form. | [1-illustrator-portfolio](1-illustrator-portfolio/) |
| 2 | A landing page for a SaaS that helps developers manage cron jobs. | [2-cron-saas-landing](2-cron-saas-landing/) |
| 3 | A personal site for a Welsh musician with bio, music samples, and tour dates. | [3-welsh-musician](3-welsh-musician/) |
| 4 | A menu and ordering page for a Pembrokeshire pizza place. | [4-pembrokeshire-pizza](4-pembrokeshire-pizza/) |
| 5 | A link-in-bio page for a crypto YouTuber. | [5-crypto-youtuber-bio](5-crypto-youtuber-bio/) |
| 6 | A pitch deck site for a stealth-stage AI startup. | [6-ai-startup-pitch-deck](6-ai-startup-pitch-deck/) |

## How to view

Each subdirectory contains a self-contained `index.html`. Open directly in
a browser, or serve the whole directory:

```
cd docs/sample-output && python3 -m http.server 8000
# then visit http://localhost:8000/1-illustrator-portfolio/
```

## When to regenerate

After any change to `server/services/aiProviders/anthropic.js` that touches
`BASE_SYSTEM_PROMPT` or `EDIT_MODE_ADDENDUM`. Compare the new output to this
baseline; if regressions appear, fix the prompt before merging.

To regenerate, with the dev server running and `ANTHROPIC_API_KEY` set:

```
node scripts/test-build.js "<the brief from the demo's README>"
# then curl /api/build/preview/<sessionId>/index.html > docs/sample-output/<n>-<slug>/index.html
```
