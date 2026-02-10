import { existsSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

if (process.platform === "win32") {
  process.exit(0);
}

const rootDir = resolve(process.cwd(), "..", "..");
const nodeModulesDir = resolve(rootDir, "node_modules");
const linkPath = "/node_modules";

try {
  if (!existsSync(linkPath)) {
    symlinkSync(nodeModulesDir, linkPath, "dir");
    console.log(`Linked ${linkPath} -> ${nodeModulesDir}`);
  }
} catch (error) {
  console.log(`Skipping node_modules link: ${error?.message ?? error}`);
}
