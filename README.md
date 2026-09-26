# opencode-ollama-websearch-plugin

An [OpenCode](https://opencode.ai) plugin that adds [Ollama's web search API](https://docs.ollama.com/capabilities/web-search.md) as a websearch provider.

OpenCode can search the web for current information; this plugin routes those searches through Ollama instead of the built-in providers (Exa, Firecrawl, Parallel, Tavily).

## Prerequisites

- An Ollama account with a web search API key — create one at [ollama.com/settings/keys](https://ollama.com/settings/keys) (free tier available)

## Authentication

The plugin resolves your API key per query, in this order:

1. **`ollama-cloud` integration connection** — if you've already connected Ollama Cloud via `/connect providers`, the plugin reuses that key automatically. No extra setup needed. Connections made while OpenCode is running are picked up without a restart.
2. **`apiKey` plugin option** — set explicitly in `opencode.json(c)`.
3. **`OLLAMA_API_KEY` environment variable** — exported before starting OpenCode.

> **Note:** the plugin resolves the key for **every query** rather than once at startup, so connecting your account later or refreshing credentials never requires a restart.

## Install

### From npm (recommended)

```sh
opencode plugin add opencode-ollama-websearch-plugin
```

Or with options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-ollama-websearch-plugin",
      "options": {
        "maxResults": 5
      }
    }
  ],
  "websearch": {
    "provider": "ollama"
  },
}
```

### From GitHub

Add the HTTPS Git spec to your `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["git+https://github.com/vardhanreddyG/opencode-ollama-websearch-plugin.git#main"],
  "websearch": {
    "provider": "ollama"
  },
}
```

> **Caveat:** on OpenCode 2.0.18, Git-spec installs fail with `git dep preparation failed` due to a bug in OpenCode's bundled npm runtime (it invokes its internal npm without the package spec; reproduces with any plugin repo, SSH or HTTPS). If you hit this, use the npm package or the local install below. The `dist/` build output is committed, so no build toolchain is needed on the installing machine.

### Local development (verified with OpenCode 2.0.18)

Clone the repo, then load it via OpenCode's plugin **discovery directory** — a config `plugins` entry with a local path does not load on 2.0.18 (silently skipped):

```sh
mkdir -p ~/.config/opencode/plugins/ollama-websearch
cd ~/.config/opencode/plugins/ollama-websearch
npm init -y >/dev/null
npm install @opencode/plugin
```

Create `index.ts` in that directory re-exporting the repo source:

```ts
export { default } from "/abs/path/to/opencode-ollama-websearch-plugin/src/index.ts"
```

Ensure the loader's `package.json` has `"main": "./index.ts"` (a `main` pointing at a missing or compiled file prevents loading). Reload after edits with `opencode service restart`, or `touch` the loader's `index.ts` to trigger a hot reload.

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | string | integration / `OLLAMA_API_KEY` env var | Ollama API key |
| `baseURL` | string | `https://ollama.com` | Base URL of the Ollama API |
| `maxResults` | number | `5` | Max results per query (Ollama allows 1–10) |

## Usage

If you haven't connected Ollama Cloud yet, run `/connect providers` in OpenCode and select **Ollama Cloud**, or set your API key before starting:

```sh
export OLLAMA_API_KEY="your_api_key"
opencode
```

Then just ask for current information:

```text
Find the latest Ollama release and summarize the changes.
```

OpenCode will use the `ollama` provider for web searches and include source links in its response.

## How it works

The plugin registers an `ollama` provider via OpenCode's `websearch` transform, calling `POST {baseURL}/api/web_search` with your query and mapping results (title, url, content) into OpenCode's websearch result format. The API key is resolved per query (integration → option → env var) so credential changes are picked up without restarting OpenCode.

## License

[MIT](./LICENSE)