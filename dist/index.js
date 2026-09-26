import { Plugin } from "@opencode/plugin";
const DEFAULT_BASE_URL = "https://ollama.com";
// Integration IDs to try when resolving a connected Ollama account, in order.
// "ollama-cloud" is the current OpenCode integration; "ollama" is kept for
// forward-compatibility with alternative catalog IDs.
const INTEGRATION_IDS = ["ollama-cloud", "ollama"];
/**
 * Resolve the Ollama API key, preferring a key the user already connected via
 * `/connect providers`, then the plugin option, then the `OLLAMA_API_KEY`
 * environment variable.
 */
async function resolveApiKey(ctx, options) {
    if (typeof options.apiKey === "string" && options.apiKey)
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
function normalizeMaxResults(value) {
    if (typeof value !== "number" || !Number.isFinite(value))
        return 5;
    return Math.min(Math.max(value, 1), 10);
}
export default Plugin.define({
    id: "opencode.ollama.websearch",
    async setup(ctx) {
        const options = (ctx.options ?? {});
        const baseURL = typeof options.baseURL === "string" && options.baseURL
            ? options.baseURL.replace(/\/+$/, "")
            : DEFAULT_BASE_URL;
        const webSearchURL = `${baseURL}/api/web_search`;
        const maxResults = normalizeMaxResults(options.maxResults);
        await ctx.websearch.transform((editor) => {
            editor.add({
                id: "ollama",
                name: "Ollama",
                // Resolve the key per query rather than once at setup so that a
                // connection made via /connect providers after OpenCode starts, or
                // a refreshed OAuth token, is picked up without a restart.
                execute: async ({ query }, { signal }) => {
                    const apiKey = await resolveApiKey(ctx, options);
                    if (!apiKey) {
                        throw new Error("Ollama web search: no API key found. Connect Ollama Cloud with /connect providers, set the apiKey plugin option, or export OLLAMA_API_KEY.");
                    }
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
    },
});
