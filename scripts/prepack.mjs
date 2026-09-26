// Build before packing (npm publish / pack). When the TypeScript toolchain
// is unavailable (e.g. Git dependency installs, which do not install
// devDependencies), fall back to the committed dist/ output as-is.
import { existsSync } from "node:fs"
import { execSync } from "node:child_process"

try {
  execSync("tsc -p tsconfig.build.json", { stdio: "inherit" })
} catch {
  if (!existsSync(new URL("../dist/index.js", import.meta.url))) {
    throw new Error(
      "dist/index.js is missing and the TypeScript compiler is unavailable. " +
        "Run `npm run build` in a full checkout before packing.",
    )
  }
  // No toolchain but a committed dist/ exists — use it as-is.
}