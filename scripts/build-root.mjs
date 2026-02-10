import { spawn } from "node:child_process";

const isVercel = process.env.VERCEL === "1";

if (isVercel) {
  console.log("Skipping root build on Vercel; use package-level build.");
  process.exit(0);
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["turbo", "run", "build"], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
