// Build before packing (npm publish / pack), but skip gracefully when the
// TypeScript toolchain is unavailable (e.g. Git dependency installs, which
// do not install devDependencies). In that case the committed dist/ output
// is used as-is.
import { existsSync } from "node:fs"
import { execSync } from "node:child_process"

if (!existsSync(new URL("../dist/index.js", import.meta.url))) {
  try {
    execSync("tsc -p tsconfig.build.json", { stdio: "inherit" })
  } catch {
    throw new Error(
      "dist/index.js is missing and the TypeScript compiler is unavailable. " +
        "Run `npm run build` in a full checkout before packing.",
    )
  }
}