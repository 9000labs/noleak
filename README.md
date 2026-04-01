# noleak

**No leaks. No regrets.**

Pre-publish security gate for packages. Scans what actually gets deployed and catches source maps, credentials, env files, and sensitive content before they ship.

Supports **10 ecosystems**: npm, PyPI, Docker, Maven, NuGet, Cargo, RubyGems, GitHub Releases, VS Code extensions, Chrome extensions.

> On March 31, 2026, a missing `.npmignore` entry exposed [512,000 lines of Claude Code source](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know/). No existing tool caught it. **noleak would have.**

---

## Quick Start

```bash
npm install -g noleak

# Auto-detect ecosystem and scan
noleak scan .

# Or specify explicitly
noleak npm .
noleak pypi .
noleak docker .
```

30 seconds to protect your next release:

```bash
npm install -g noleak && noleak scan .
```

---

## What It Catches

```
  noleak — npm audit

  Package: my-lib@2.3.1
  Files:   47 files, 2.1 MB total

  BLOCK  source-maps      dist/index.js.map (487 KB)
         Source map would expose original source code
         → Add "*.map" to .npmignore

  BLOCK  credentials      config/service-account.json (1.2 KB)
         Service account credentials file detected
         → Remove from package or add to .npmignore

  WARN   entropy-scan     src/config.js
         2 high-entropy string(s) found: line 12: "tok_***REDACTED***" (entropy: 4.8)
         → Review these strings. If they are secrets, use environment variables.

  ──────────────────────────────────────────────────
  Result: BLOCK (2 blocking, 1 warning)
```

---

## Supported Ecosystems

| Ecosystem | Command | Auto-detected by |
|-----------|---------|-----------------|
| **npm** | `noleak npm .` | `package.json` |
| **PyPI** | `noleak pypi .` | `pyproject.toml`, `setup.py` |
| **Docker** | `noleak docker .` | `Dockerfile`, `docker-compose.yml` |
| **Maven / Gradle** | `noleak maven .` | `pom.xml`, `build.gradle` |
| **NuGet** | `noleak nuget .` | `*.csproj` |
| **Cargo (crates.io)** | `noleak crates .` | `Cargo.toml` |
| **RubyGems** | `noleak rubygems .` | `*.gemspec` |
| **GitHub Releases** | `noleak github-release .` | scans `dist/`, `build/`, `release/` |
| **VS Code Extension** | `noleak vscode .` | `.vscodeignore`, `engines.vscode` in package.json |
| **Chrome Extension** | `noleak chrome .` | `manifest.json` with `manifest_version` |

`noleak scan .` auto-detects the ecosystem from project files.

---

## 14 Built-in Rules

| Rule | Severity | What it catches |
|------|:--------:|----------------|
| `source-maps` | BLOCK | `.js.map`, `.css.map`, `.d.ts.map` files that expose original source |
| `env-files` | BLOCK | `.env`, `.env.production` (allows `.env.example`) |
| `credentials` | BLOCK | `.pem`, `.key`, `id_rsa`, `credentials.json`, `.npmrc`, `.pypirc` |
| `git-directory` | BLOCK | `.git/` directory with full commit history |
| `entropy-scan` | WARN | High-entropy strings (API keys, tokens, secrets) |
| `internal-docs` | WARN | Files named `INTERNAL`, `CONFIDENTIAL`, `SECRET` |
| `test-fixtures` | WARN | `__fixtures__`, `__mocks__`, `*.test.ts`, `*.spec.js` |
| `large-files` | WARN | Single files over 1 MB |
| `lockfiles` | WARN | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| `ci-config` | WARN | `.github/`, `.gitlab-ci.yml`, `Jenkinsfile` |
| `unexpected-growth` | WARN | Package 2x larger than last published version |
| `build-artifacts` | INFO | `.tsbuildinfo`, cache directories |
| `docker-files` | INFO | `Dockerfile`, `docker-compose.yml` |
| `ide-config` | INFO | `.vscode/`, `.idea/` |

Rules apply to **all ecosystems**. A `.pem` file is dangerous whether you're publishing to npm, PyPI, or Docker Hub.

---

## Automate It

### Option 1: package.json (npm)

```json
{
  "scripts": {
    "prepublishOnly": "noleak npm ."
  }
}
```

Now `npm publish` automatically runs noleak first. BLOCK = publish stops.

### Option 2: CI Pipeline (GitHub Actions)

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build

      - name: Audit Gate
        uses: noleak/action@v1
        with:
          fail-on: block

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Option 3: Pre-commit hook

```bash
# .husky/pre-push
noleak scan .
```

---

## AI Coding Tools (Claude Code / Codex)

One command configures everything:

```bash
# Claude Code
noleak setup claude

# OpenAI Codex CLI
noleak setup codex

# Both
noleak setup all
```

This configures **three layers of protection**:

| Layer | What it does | Claude Code | Codex |
|-------|-------------|-------------|-------|
| **MCP Server** | Natural language: "audit this package" | `settings.json` | `config.toml` |
| **Pre-publish Hook** | Auto-intercepts `npm publish` | `hooks.PreToolUse` | `hooks.json` |
| **Project Instructions** | AI always runs audit before publish | `CLAUDE.md` | `AGENTS.md` |

After setup, when you or your AI assistant runs `npm publish`:

```
You:    "publish this package to npm"
Claude: Running noleak first...

        BLOCK  source-maps  dist/index.js.map
               Source map would expose original source code

        Blocked. Fixing the issue before publishing.
        Added "*.map" to .npmignore. Retrying...

        PASS  No issues found.
        Running npm publish...
```

### Manual MCP setup (without `noleak setup`)

**Claude Code** (`.claude/settings.json`):
```json
{
  "mcpServers": {
    "noleak": {
      "command": "npx",
      "args": ["-y", "noleak", "--mcp"]
    }
  }
}
```

**Codex** (`~/.codex/config.toml`):
```toml
[mcp_servers.noleak]
command = "npx"
args = ["-y", "noleak", "--mcp"]
enabled = true
```

**MCP tools exposed:**
- `audit_package` -- scan a package directory
- `list_rules` -- show all available rules

---

## Configuration

Create `.auditgaterc.json` (or run `noleak init`):

```json
{
  "rules": {
    "source-maps": { "severity": "block" },
    "lockfiles": { "enabled": false },
    "large-files": { "severity": "warn", "options": { "maxSize": 2097152 } }
  },
  "ignore": ["dist/vendor/**"],
  "failOn": "block",
  "llm": {
    "enabled": true,
    "provider": "claude"
  }
}
```

Config is loaded via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) from:
`.auditgaterc`, `.auditgaterc.json`, `.auditgaterc.yaml`, `auditgate.config.js`, or `"auditgate"` in `package.json`.

### LLM Analysis (Optional)

AI-powered analysis for files that pass rule-based checks:

```bash
export ANTHROPIC_API_KEY=sk-...   # Claude
# or
export OPENAI_API_KEY=sk-...      # OpenAI
```

```json
{ "llm": { "enabled": true, "provider": "claude" } }
```

The LLM reviews unflagged files for embedded secrets, internal URLs, and accidental inclusions. Results are cached by content hash for 7 days. Cost: ~$0.01 per scan.

---

## CLI Reference

```
noleak scan [path]              Auto-detect ecosystem and audit
noleak npm [path]               Audit npm package
noleak pypi [path]              Audit Python package
noleak docker [path]            Audit Docker build context
noleak maven [path]             Audit Maven/Gradle project
noleak nuget [path]             Audit NuGet package
noleak crates [path]            Audit Cargo crate
noleak rubygems [path]          Audit Ruby gem
noleak github-release [path]    Audit release artifacts
noleak vscode [path]            Audit VS Code extension
noleak chrome [path]            Audit Chrome extension

noleak init [path]              Create .auditgaterc.json
noleak setup <claude|codex|all> Configure AI tool integration
noleak rules                    List all rules and ecosystems
noleak --version                Version info
```

### Common flags

```
-o, --output <format>     console | json (default: console)
-e, --ecosystem <type>    Override auto-detection
--fail-on <level>         block | warn | info (default: block)
```

### Exit codes

| Code | Meaning |
|:----:|---------|
| 0 | **PASS** -- no findings at or above fail-on level |
| 1 | **WARN** -- warnings found, fail-on is warn |
| 2 | **BLOCK** -- blocking findings, publish should not proceed |
| 3 | **ERROR** -- tool failed to run |

---

## Why Not Just Use...

| Tool | What it does | What it misses |
|------|-------------|----------------|
| `npm audit` | Dependency vulnerabilities | Your own files, source maps, credentials |
| GitGuardian | Secrets in git commits | Source maps, accidental file inclusion, publish context |
| Snyk | Dependency + code vulnerabilities | Published package contents, .map files |
| CodeRabbit | AI PR review | Package artifacts (reviews diffs, not publish output) |
| SonarQube | Code quality + SAST | Package contents, publish context |
| Trivy | Container image vulnerabilities | Application-level secrets, source maps |
| Docker Scout | Image CVEs | Secrets baked into build context |

**noleak is the only tool that checks what actually gets published, across 10 ecosystems.**

---

## How It Works

```
Your project files
       |
       v
  [Extractor]          Determines what files would be published
       |                (npm-packlist, cargo package --list, .dockerignore, etc.)
       v
  [14 Rules]            Pattern matching: source maps, env files, credentials...
       |
       v
  [LLM Analysis]        Optional: AI reviews unflagged files for hidden risks
       |
       v
  [Verdict]             PASS / WARN / BLOCK
       |
       v
  [Reporter]            Console (colored) or JSON output
       |
       v
  Exit code 0/1/2       CI-friendly: non-zero = don't publish
```

---

## Contributing

```bash
git clone https://github.com/user/noleak.git
cd noleak
npm install
npm test                    # 31 tests
npx tsx src/cli.ts scan .   # dog-food
```

### Adding a new rule

1. Create `src/rules/builtin/my-rule.ts` implementing the `Rule` interface
2. Register in `src/rules/rule-registry.ts`
3. Add tests in `test/unit/rules/my-rule.test.ts`

### Adding a new ecosystem

1. Create `src/extractors/my-extractor.ts` implementing `PackageExtractor`
2. Register in `src/extractors/factory.ts`
3. Auto-detection logic in `detectEcosystem()`

---

## License

MIT
