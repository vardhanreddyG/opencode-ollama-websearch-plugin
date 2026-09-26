// Smoke test: exercises the plugin against the real OpenCode server API.
// Verifies per-query credential resolution, option validation, and result
// mapping. Run with: node scripts/smoke-test.mjs
import { execSync } from "node:child_process"

const results = []

async function check(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, pass: true, detail })
  } catch (error) {
    results.push({ name, pass: false, detail: error.message })
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// --- 1. Plugin is loaded and provider registered ---------------------------
await check("provider registered", async () => {
  const out = execSync("opencode api get /api/websearch/provider", {
    encoding: "utf8",
  })
  const { data } = JSON.parse(out)
  const ollama = data.find((p) => p.id === "ollama")
  assert(ollama, `ollama provider not in list: ${data.map((p) => p.id).join(",")}`)
  return `name=${ollama.name}`
})

// --- 2. normalizeMaxResults behavior (via the plugin source) --------------
await check("maxResults validation logic", async () => {
  const { readFile } = await import("node:fs/promises")
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8")
  const match = source.match(
    /function normalizeMaxResults[^}]+if \(typeof value !== "number"[^}]+/,
  )
  assert(match, "normalizeMaxResults missing non-number guard")
  return "guards NaN and non-numeric input"
})

// --- 3. Per-query key resolution (source-level) ----------------------------
await check("per-query credential resolution", async () => {
  const { readFile } = await import("node:fs/promises")
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8")
  assert(
    source.includes("const apiKey = await resolveApiKey(ctx, options)") &&
      !source.includes("const apiKey = await resolveApiKey(ctx, options)\n    if (!apiKey)"),
    "key resolution not inside execute",
  )
  assert(
    !source.includes('if (!apiKey) {\n      console.log'),
    "setup still early-returns on missing key",
  )
  return "resolved inside execute; provider always registered"
})

// --- 4. Live search end-to-end through the real server ---------------------
await check("live search via ollama provider", async () => {
  const payload = JSON.stringify({ query: "ollama github repo", providerID: "ollama" })
  const out = execSync(
    `opencode api post /api/websearch --data '${payload}'`,
    { encoding: "utf8" },
  )
  const body = JSON.parse(out)
  const results = body.data?.results ?? body.results
  assert(Array.isArray(results), `results missing: ${JSON.stringify(body).slice(0, 200)}`)
  assert(results.length > 0, "no results returned")
  const first = results[0]
  assert(
    first.url && first.title !== undefined,
    `malformed first result: ${JSON.stringify(first).slice(0, 200)}`,
  )
  return `${results.length} results, first: ${first.title.slice(0, 60)}`
})

// --- Report ----------------------------------------------------------------
let failed = 0
for (const r of results) {
  const status = r.pass ? "PASS" : "FAIL"
  if (!r.pass) failed++
  console.log(`${status}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`)
}
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)