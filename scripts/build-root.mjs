import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const isVercel = process.env.VERCEL === "1";

if (isVercel) {
  const outputDir = resolve(process.cwd(), "public");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verifactu Monorepo</title>
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }

      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 64px 24px;
      }

      h1 {
        margin-bottom: 16px;
        color: #0f172a;
      }

      p, li {
        line-height: 1.6;
      }

      code {
        background: #e2e8f0;
        border-radius: 6px;
        padding: 2px 6px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Verifactu monorepo root</h1>
      <p>This repository root is not a deployable app.</p>
      <p>Configure the Vercel project to use one app directory instead:</p>
      <ul>
        <li><code>apps/landing</code> for verifactu.business</li>
        <li><code>apps/holded</code> for holded.verifactu.business</li>
        <li><code>apps/isaak</code> for isaak.verifactu.business</li>
        <li><code>apps/app</code> for app.verifactu.business</li>
      </ul>
    </main>
  </body>
</html>`;

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, "index.html"), html, "utf8");
  console.log("Skipping root build on Vercel; generated placeholder output in /public.");
  process.exit(0);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["turbo", "run", "build"], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
