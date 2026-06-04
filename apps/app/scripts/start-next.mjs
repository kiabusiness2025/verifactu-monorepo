import { spawn } from "node:child_process";

const port = process.env.PORT || "8080";
const args = ["start", "-p", port];

if (process.env.HOSTNAME) {
  args.push("-H", process.env.HOSTNAME);
}

const command = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
