import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import fs from "node:fs";
import { readFileSync } from "node:fs";
import { z } from "zod";

const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
  capabilities: {
    resources: {
      subscribe: true,
      listChanged: true,
    },
    prompts: {
      listChanged: true,
    },
  },
});

// Multiplication tool
server.registerTool(
  "multiply",
  {
    title: "Multiplication tool",
    description: "Multiply two numbers",
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
    outputSchema: { result: z.number() },
  },
  async ({ a, b }) => {
    const output = { result: a * b };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }
);

// Addition tool
server.registerTool(
  "add",
  {
    title: "Addition Tool",
    description: "Add two numbers",
    inputSchema: { a: z.number(), b: z.number() },
    outputSchema: { result: z.number() },
  },
  async ({ a, b }) => {
    const output = { result: a + b };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }
);

// Hello tool
server.registerTool(
  "hello",
  {
    title: "Hello tool",
    description: "Just saying hello",
    inputSchema: {
      name: z.string(),
    },
    outputSchema: {
      result: z.string(),
    },
  },
  async ({ name }) => {
    const output = { result: `Hello ${name}` };
    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }
);

// Dynamic resource with parameters
server.registerResource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  {
    title: "Greeting Resource", // Display name for UI
    description: "Dynamic greeting generator",
  },
  async (uri, { name }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Hello, ${name}!`,
      },
    ],
  })
);

// Static resource
server.registerResource(
  "config",
  "config://app",
  {
    title: "Application Config",
    description: "Application configuration data",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: "App configuration here",
      },
    ],
  })
);

// Dynamic resource with parameters
server.registerResource(
  "user-profile",
  new ResourceTemplate("users://{userId}/profile", { list: undefined }),
  {
    title: "User Profile",
    description: "User profile information",
  },
  async (uri, { userId }) => ({
    contents: [
      {
        uri: uri.href,
        text: `Profile data for user ${userId}`,
      },
    ],
  })
);

// Load locally built assets (produced by your component build)
const KANBAN_JS = readFileSync(
  "../web-app/dist/assets/index-DDMyXTNR.js",
  "utf8"
);

const KANBAN_CSS = (() => {
  try {
    return readFileSync("../web-app/dist/assets/index-BMeT29y7.css", "utf8");
  } catch {
    return ""; // CSS optional
  }
})();

// const KANBAN_HTML = fs.readFileSync("../web-app/dist/index.html", "utf8");
// Replaced this with inline HTML

// UI resource (no inline data assignment; host will inject data)
server.registerResource(
  "kanban-widget",
  "ui://widget/kanban-board.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/kanban-board.html",
        mimeType: "text/html+skybridge",
        text: `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>web-app</title>
            <script type="module">${KANBAN_JS}</script>
            <style>${KANBAN_CSS}</style>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>`,

        //         text: `
        // <div id="kanban-root"></div><h1>Hello world</h1>
        // ${KANBAN_CSS ? `<style>${KANBAN_CSS}</style>` : ""}
        // <script type="module">${KANBAN_JS}</script>
        //         `.trim(),
        _meta: {
          /* 
            Renders the widget within a rounded border and shadow. 
            Otherwise, the HTML is rendered full-bleed in the conversation
          */
          "openai/widgetPrefersBorder": true,

          /* 
            Assigns a subdomain for the HTML. 
            When set, the HTML is rendered within `chatgpt-com.web-sandbox.oaiusercontent.com`
            It's also used to configure the base url for external links.
          */
          "openai/widgetDomain": "https://chatgpt.com",

          /*
            Required to make external network requests from the HTML code. 
            Also used to validate `openai.openExternal()` requests. 
          */
          "openai/widgetCSP": {
            // Maps to `connect-src` rule in the iframe CSP
            connect_domains: ["https://chatgpt.com"],
            // Maps to style-src, style-src-elem, img-src, font-src, media-src etc. in the iframe CSP
            resource_domains: ["https://*.oaistatic.com"],
          },
        },
      },
    ],
  })
);

server.registerTool(
  "kanban-board",
  {
    title: "Show Kanban Board",
    _meta: {
      // associate this tool with the HTML template
      "openai/outputTemplate": "ui://widget/kanban-board.html",
      // labels to display in ChatGPT when the tool is called
      "openai/toolInvocation/invoking": "Displaying the board",
      "openai/toolInvocation/invoked": "Displayed the board",
    },
    inputSchema: { tasks: z.string() },
  },
  async () => {
    return {
      content: [{ type: "text", text: "Displayed the kanban board!" }],
      structuredContent: {},
    };
  }
);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "3000");
app
  .listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
