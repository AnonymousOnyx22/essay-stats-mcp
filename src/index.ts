#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, VERSION } from "./server.js";

function usage(): void {
  console.log(`essay-stats-mcp ${VERSION}

Offline writing metrics for essays: word and page counts, readability, style flags and word limit checks.

Add it to your MCP app's config with command "npx" and args ["-y", "essay-stats-mcp"].

  --help, --version`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "--help" || cmd === "-h") return usage();
  if (cmd === "--version" || cmd === "-v") return console.log(VERSION);
  await createServer().connect(new StdioServerTransport());
  console.error(`essay-stats-mcp ${VERSION} running`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
