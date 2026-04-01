

## Pre-publish Audit (noleak)

Before running `npm publish` or any package publish command, ALWAYS run:

```bash
npx noleak npm .
```

- **BLOCK** → Do NOT publish. Fix the issues first.
- **WARN** → Inform the user and ask whether to proceed.
- **PASS** → Safe to publish.

This catches source maps, credentials, env files, and other sensitive content
that should not be in published packages.
