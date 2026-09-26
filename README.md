# opencode-ollama-websearch-plugin

An [OpenCode](https://opencode.ai) plugin that adds [Ollama's web search API](https://docs.ollama.com/capabilities/web-search.md) as a websearch provider.

OpenCode can search the web for current information; this plugin routes those searches through Ollama instead of the built-in providers (Exa, Firecrawl, Parallel, Tavily).

## Prerequisites

- An Ollama account with a web search API key — create one at [ollama.com/settings/keys](https://ollama.com/settings/keys) (free tier available)

## Authentication

The plugin resolves your API key in this order:

1. **`ollama-cloud` integration connection** — if you've already connected Ollama Cloud via `/connect providers`, the plugin reuses that key automatically. No extra setup needed.
2. **`apiKey` plugin option** — set explicitly in `opencode.json(c)`.
3. **`OLLAMA_API_KEY` environment variable** — exported before starting OpenCode.

## Install

### From GitHub (config)

Add the HTTPS Git spec to your `opencode.json(c)`. OpenCode resolves and installs it on startup:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["git+https://github.com/vardhanreddyG/opencode-ollama-websearch-plugin.git#main"],
  "websearch": {
    "provider": "ollama"
  },
}
```

> **Note:** `opencode plugin add` currently fails with `git dep preparation failed` for **all** Git specs (SSH and HTTPS, any repo) due to a bug in OpenCode's bundled npm runtime — it invokes its internal npm without the package spec. Installing via the config entry works reliably. The `dist/` build output is committed, so no build toolchain is needed on the installing machine.

### From npm (once published)

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

### Local development

Clone the repo and point OpenCode at it:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./path/to/opencode-ollama-websearch-plugin"],
  "websearch": {
    "provider": "ollama"
  },
}
```

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | string | integration / `OLLAMA_API_KEY` env var | Ollama API key |
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

The plugin registers an `ollama` provider via OpenCode's `websearch` transform, calling `POST https://ollama.com/api/web_search` with your query and mapping results (title, url, content) into OpenCode's websearch result format.

## License

[MIT](./LICENSE)