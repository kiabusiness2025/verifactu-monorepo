import fs from "node:fs/promises";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");

try {
  await fs.rm(nextDir, { recursive: true, force: true });
} catch {
  // Ignore cleanup errors to avoid blocking builds.
}
