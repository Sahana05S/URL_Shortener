import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startMaintenance } from "./lib/maintenance.js";

const stopMaintenance = startMaintenance();
const server = createApp().listen(env.PORT, () => {
  console.log(`Linkora API listening on port ${env.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing HTTP server`);
  stopMaintenance();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
