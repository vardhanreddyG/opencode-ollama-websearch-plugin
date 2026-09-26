# opencode-ollama-websearch-plugin

An [OpenCode](https://opencode.ai) plugin that adds [Ollama's web search API](https://docs.ollama.com/capabilities/web-search.md) as a websearch provider.

OpenCode can search the web for current information; this plugin routes those searches through Ollama instead of the built-in providers (Exa, Firecrawl, Parallel, Tavily).

## Prerequisites

- An Ollama account with a web search API key — create one at [ollama.com/settings/keys](https://ollama.com/settings/keys) (free tier available)

## Install

### CLI (global)

```sh
opencode plugin add opencode-ollama-websearch-plugin
```

### Config

Add it to `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-ollama-websearch-plugin"],
  "websearch": {
    "provider": "ollama"
  },
}
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
| `apiKey` | string | `OLLAMA_API_KEY` env var | Ollama API key |
| `maxResults` | number | `5` | Max results per query (Ollama allows 1–10) |

## Usage

Set your API key before starting OpenCode:

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