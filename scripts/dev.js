import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("Run this script through npm so npm_execpath is available.");
}

function startWorkspace(workspace) {
  return spawn(process.execPath, [npmCli, "run", "dev", "-w", workspace], {
    stdio: "inherit",
  });
}

const children = [startWorkspace("client"), startWorkspace("server")];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(exitCode);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
