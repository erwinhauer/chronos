// Loader voor de tests: laat Node de "@/..."-imports van de app (tsconfig paths) herkennen.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const basis = fileURLToPath(new URL(`../src/${specifier.slice(2)}`, import.meta.url));
    for (const kandidaat of [`${basis}.ts`, `${basis}.tsx`, `${basis}/index.ts`]) {
      if (existsSync(kandidaat)) return nextResolve(pathToFileURL(kandidaat).href, context);
    }
  }
  return nextResolve(specifier, context);
}
