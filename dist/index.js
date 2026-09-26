import { Plugin } from "@opencode/plugin";
const DEFAULT_BASE_URL = "https://ollama.com";
// Integration IDs to try when resolving a connected Ollama account, in order.
const INTEGRATION_IDS = ["ollama-cloud", "ollama"];
/**
 * Resolve the Ollama API key, preferring a key the user already connected via
 * `/connect providers`, then the plugin option, then the `OLLAMA_API_KEY`
 * environment variable.
 */
async function resolveApiKey(ctx, options) {
    if (options.apiKey)
        return options.apiKey;
    for (const integrationID of INTEGRATION_IDS) {
        try {
            const connection = await ctx.integration.connection.active(integrationID);
            if (!connection)
                continue;
            const credential = (await ctx.integration.connection.resolve(connection));
            if (credential?.type === "key")
                return credential.key;
            if (credential?.type === "oauth")
                return credential.access;
        }
        catch {
            // Integration unavailable; try the next one.
        }
    }
    return process.env.OLLAMA_API_KEY;
}
export default Plugin.define({
    id: "opencode.ollama.websearch",
    async setup(ctx) {
        const options = (ctx.options ?? {});
        const apiKey = await resolveApiKey(ctx, options);
        if (!apiKey) {
            console.log("ollama-websearch: no API key found (options.apiKey, OLLAMA_API_KEY, or connected Ollama account); provider not registered");
            return;
        }
        const baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
        const webSearchURL = `${baseURL}/api/web_search`;
        const maxResults = Math.min(Math.max(options.maxResults ?? 5, 1), 10);
        await ctx.websearch.transform((editor) => {
            editor.add({
                id: "ollama",
                name: "Ollama",
                execute: async ({ query }, { signal }) => {
                    const response = await fetch(webSearchURL, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query, max_results: maxResults }),
                        signal,
                    });
                    if (!response.ok) {
                        // Ollama returns {"error": "..."} bodies (e.g. 429 quota
                        // messages) — surface them.
                        let detail = "";
                        try {
                            const body = (await response.json());
                            if (typeof body.error === "string")
                                detail = `: ${body.error}`;
                        }
                        catch {
                            // Non-JSON error body; fall back to status text.
                        }
                        throw new Error(`Ollama web search failed: HTTP ${response.status} ${response.statusText}${detail}`);
                    }
                    const body = (await response.json());
                    if (!Array.isArray(body.results)) {
                        throw new Error("Ollama web search returned malformed JSON: missing results array");
                    }
                    return body.results.map((result) => ({
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
        console.log("ollama-websearch: ollama provider registered");
    },
});
