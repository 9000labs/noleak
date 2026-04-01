

## Pre-publish Audit

Before running `npm publish` or any package publish command, ALWAYS run:

```bash
npx noleak npm .
```

If the result is BLOCK, do NOT publish. Fix the issues first.
If the result is WARN, inform the user and ask whether to proceed.
If the result is PASS, safe to publish.

This catches source maps, credentials, env files, and other sensitive content
that should not be in published packages.
