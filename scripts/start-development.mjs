import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { createRequire } from "node:module";

const service = "web";
const port = 3000;
const origin = `http://localhost:${port}`;
const occupied = await new Promise((resolve, reject) => {
  const socket = createConnection({ host: "localhost", port });
  socket.once("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.once("error", (error) => {
    socket.destroy();
    if (error.code === "ECONNREFUSED") resolve(false);
    else reject(error);
  });
  socket.setTimeout(3000, () => {
    socket.destroy();
    reject(new Error("Port check timed out"));
  });
});
if (occupied) {
  console.log(
    `Port ${port} already has a server. No duplicate instance was started.`,
  );
  try {
    const response = await fetch(`${origin}/api/healthz`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    if (!response.ok || body.status !== "ok")
      throw new Error("Service not confirmed");
    console.log(
      `Existing Trybe ${service} responds at ${origin}. Use its existing terminal; press Ctrl+C there before restarting.`,
    );
  } catch {
    console.error(
      "The existing service could not be confirmed. Inspect the port owner; do not start another copy or terminate unrelated processes.",
    );
    process.exitCode = 1;
  }
} else {
  const require = createRequire(import.meta.url);
  const command = process.execPath;
  const args = [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--port",
    String(port),
  ];
  const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
  child.once("error", () => {
    console.error(
      `Could not start Trybe ${service}. Check that its dependencies are installed.`,
    );
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (child.pid && child.exitCode === null) {
        if (process.platform === "win32") {
          spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
        } else child.kill(signal);
      }
    });
  }
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}
