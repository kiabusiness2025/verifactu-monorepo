import { existsSync, lstatSync, rmSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

if (process.platform === "win32") {
  process.exit(0);
}

const appDir = process.cwd();
const rootDir = resolve(appDir, "..", "..");
const nodeModulesDir = resolve(rootDir, "node_modules");
const linkPath = "/node_modules";
const rootLibPath = resolve(rootDir, "lib");
const appLibPath = resolve(appDir, "lib");

try {
  if (!existsSync(linkPath)) {
    symlinkSync(nodeModulesDir, linkPath, "dir");
    console.log(`Linked ${linkPath} -> ${nodeModulesDir}`);
  }
} catch (error) {
  console.log(`Skipping node_modules link: ${error?.message ?? error}`);
}

try {
  if (existsSync(appLibPath)) {
    if (existsSync(rootLibPath)) {
      const stat = lstatSync(rootLibPath);
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        rmSync(rootLibPath, { recursive: true, force: true });
      }
    }
    symlinkSync(appLibPath, rootLibPath, "dir");
    console.log(`Linked ${rootLibPath} -> ${appLibPath}`);
  }
} catch (error) {
  console.log(`Skipping lib link: ${error?.message ?? error}`);
}
