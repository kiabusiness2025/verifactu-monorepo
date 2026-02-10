import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const rootDir = resolve(process.cwd(), "..", "..");
const sourceDir = resolve(process.cwd(), ".next");
const targetDir = resolve(rootDir, ".next");

if (!existsSync(sourceDir)) {
  console.log(`No .next output found at ${sourceDir}`);
  process.exit(0);
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });
console.log(`Copied ${sourceDir} -> ${targetDir}`);
