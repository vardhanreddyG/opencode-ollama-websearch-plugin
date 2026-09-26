import { Plugin } from "@opencode/plugin";
const API_URL = "https://ollama.com/api/web_search";
const INTEGRATION_ID = "ollama-cloud";
/**
 * Resolve the Ollama API key, preferring a key the user already connected via
 * `/connect providers` (the `ollama-cloud` integration), then the plugin
 * option, then the `OLLAMA_API_KEY` environment variable.
 */
async function resolveApiKey(ctx, options) {
    if (options.apiKey)
        return options.apiKey;
    try {
        const connection = await ctx.integration.connection.active(INTEGRATION_ID);
        if (connection) {
            const credential = (await ctx.integration.connection.resolve(connection));
            if (credential?.type === "key")
                return credential.key;
            if (credential?.type === "oauth")
                return credential.access;
        }
    }
    catch {
        // Integration unavailable; fall through to the environment variable.
    }
    return process.env.OLLAMA_API_KEY;
}
export default Plugin.define({
    id: "opencode.ollama.websearch",
    async setup(ctx) {
        const options = (ctx.options ?? {});
        await ctx.websearch.transform((editor) => {
            editor.add({
                id: "ollama",
                name: "Ollama",
                execute: async ({ query }, { signal }) => {
                    const apiKey = await resolveApiKey(ctx, options);
                    if (!apiKey) {
                        throw new Error("Ollama web search requires an API key. Connect the Ollama Cloud integration with /connect providers, set the `apiKey` plugin option, or export OLLAMA_API_KEY.");
                    }
                    const maxResults = Math.min(Math.max(options.maxResults ?? 5, 1), 10);
                    const response = await fetch(API_URL, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query, max_results: maxResults }),
                        signal,
                    });
                    if (!response.ok) {
                        throw new Error(`Ollama web search failed: ${response.status} ${response.statusText}`);
                    }
                    const body = (await response.json());
                    return (body.results ?? []).map((result) => ({
                        url: result.url ?? "",
                        title: result.title ?? "",
                        content: result.content ?? "",
                        time: {},
                    }));
                },
            });
            // Make Ollama the default websearch provider unless the user has
            // selected another one in their OpenCode config.
            const current = editor.default.get();
            if (current === undefined)
                editor.default.set("ollama");
        });
    },
});
