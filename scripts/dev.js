const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const managedChildren = [];

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net
      .createConnection({ port, host: "127.0.0.1" }, () => {
        socket.destroy();
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
  });
}

function startWorkspace(name) {
  const child = spawn(npmCommand, ["run", "dev"], {
    stdio: "inherit",
    cwd: path.join(__dirname, "..", name),
  });

  managedChildren.push({ name, child });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
}

function shutdown(exitCode = 0) {
  for (const { child } of managedChildren) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
  process.exit(exitCode);
}

async function main() {
  const backendRunning = await isPortInUse(3001);
  const frontendRunning = await isPortInUse(3000);

  if (backendRunning) {
    console.log("Backend already running on http://localhost:3001, reusing it.");
  } else {
    startWorkspace("backend");
  }

  if (frontendRunning) {
    console.log("Frontend already running on http://localhost:3000, reusing it.");
  } else {
    startWorkspace("frontend");
  }

  if (managedChildren.length === 0) {
    console.log("Frontend and backend are already running.");
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
