import fs from "node:fs/promises";
import path from "node:path";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

async function main() {
  const standaloneAppServerDir = path.join(
    process.cwd(),
    ".next",
    "standalone",
    path.relative(path.resolve(process.cwd(), "..", ".."), process.cwd()),
    ".next",
    "server",
    "app"
  );

  const appServerDirs = [
    path.join(process.cwd(), ".next", "server", "app"),
    standaloneAppServerDir,
  ];

  let created = 0;

  for (const appServerDir of appServerDirs) {
    created += await fixAppServerDir(appServerDir);
  }

  if (created > 0) {
    console.log(`[postbuild] Created ${created} missing page_client-reference-manifest.js files`);
  }
}

async function fixAppServerDir(appServerDir) {
  if (!(await fileExists(appServerDir))) {
    // Not an app-router build output; nothing to do.
    return 0;
  }

  const allFiles = await walk(appServerDir);
  const nftFiles = allFiles.filter((p) => p.endsWith(".nft.json"));

  const placeholder = "\"use strict\";\nmodule.exports = {};\n";
  let created = 0;

  for (const nftFile of nftFiles) {
    let parsed;
    try {
      const raw = await fs.readFile(nftFile, "utf8");
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const files = Array.isArray(parsed?.files) ? parsed.files : [];
    if (!files.includes("page_client-reference-manifest.js")) continue;

    const manifestPath = path.join(path.dirname(nftFile), "page_client-reference-manifest.js");
    if (await fileExists(manifestPath)) continue;

    await fs.writeFile(manifestPath, placeholder, "utf8");
    created += 1;
  }

  return created;
}

await main();
