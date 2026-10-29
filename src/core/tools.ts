import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type Shape = Record<string, z.ZodTypeAny>;

export interface ToolOutput {
  /** The answer in words. */
  text: string;
  /** The same answer as fields, shaped by the output schema of the tool. */
  structured: Record<string, unknown>;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** The shape of the fields the tool returns, so a client can read the numbers. */
  outputSchema?: Shape;
  run: (args: any) => ToolOutput;
}

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function runTool(tool: ToolDef, args: unknown): ToolResult {
  try {
    const out = tool.run(args);
    return { content: [{ type: "text", text: out.text }], structuredContent: out.structured };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
}

export function registerTools(server: McpServer, tools: ToolDef[]): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async (args: unknown) => runTool(tool, args),
    );
  }
}
