import { Plugin } from "@opencode/plugin"

const API_URL = "https://ollama.com/api/web_search"

interface OllamaSearchResult {
  title?: string
  url?: string
  content?: string
}

interface OllamaSearchResponse {
  results?: OllamaSearchResult[]
}

interface ProviderOptions {
  /**
   * Ollama API key. Defaults to the `OLLAMA_API_KEY` environment variable.
   */
  apiKey?: string
  /**
   * Maximum number of results per query. Ollama allows 1-10; defaults to 5.
   */
  maxResults?: number
}

export default Plugin.define({
  id: "opencode.ollama.websearch",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as ProviderOptions

    await ctx.websearch.transform((editor) => {
      editor.add({
        id: "ollama",
        name: "Ollama",
        execute: async ({ query }, { signal }) => {
          const apiKey = options.apiKey ?? process.env.OLLAMA_API_KEY
          if (!apiKey) {
            throw new Error(
              "Ollama web search requires an API key. Create one at https://ollama.com/settings/keys and set it via the `apiKey` plugin option or the OLLAMA_API_KEY environment variable.",
            )
          }

          const maxResults = Math.min(
            Math.max(options.maxResults ?? 5, 1),
            10,
          )

          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, max_results: maxResults }),
            signal,
          })

          if (!response.ok) {
            throw new Error(
              `Ollama web search failed: ${response.status} ${response.statusText}`,
            )
          }

          const body = (await response.json()) as OllamaSearchResponse

          return (body.results ?? []).map((result) => ({
            url: result.url ?? "",
            title: result.title ?? "",
            content: result.content ?? "",
            time: {},
          }))
        },
      })

      // Make Ollama the default websearch provider unless the user has
      // selected another one in their OpenCode config.
      const current = editor.default.get()
      if (current === undefined) editor.default.set("ollama")
    })
  },
})