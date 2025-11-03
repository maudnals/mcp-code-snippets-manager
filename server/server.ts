import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  getSnippetsByUserId,
  createSnippet,
  updateSnippet,
  deleteSnippet,
} from "./storage";
import express from "express";
import fs from "node:fs";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Dummy userId for now
// TODO replace with actual user ID from auth
const DUMMY_USER_ID = "user123";

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

server.registerTool(
  "create_snippet",
  {
    title: "Create Code Snippet",
    description: "Saves a new code snippet.",
    inputSchema: {
      title: z.string().describe("The title of the snippet."),
      language: z.string().describe("The programming language."),
      code: z.string().describe("The code content."),
    },
  },
  async ({ title, language, code }) => {
    try {
      const newSnippet = await createSnippet(
        DUMMY_USER_ID,
        title,
        language,
        code
      );
      return {
        content: [
          {
            type: "text",
            text: `Snippet "${newSnippet.title}" created with ID: ${newSnippet.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating snippet: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "get_snippets",
  {
    title: "Get Code Snippets",
    description: "Retrieves all code snippets for the user.",
    inputSchema: {}, // No input needed
  },
  async () => {
    try {
      const snippets = await getSnippetsByUserId(DUMMY_USER_ID);
      return {
        content: [{ type: "text", text: JSON.stringify(snippets) }],
        structuredContent: { snippetsAsArr: snippets },
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting snippets: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "update_snippet",
  {
    title: "Update Code Snippet",
    description: "Updates an existing code snippet.",
    inputSchema: {
      id: z.string().describe("The ID of the snippet to update."),
      title: z.string().describe("The new title."),
      language: z.string().describe("The new language."),
      code: z.string().describe("The new code content."),
    },
  },
  async ({ id, title, language, code }) => {
    try {
      const updatedSnippet = await updateSnippet(
        DUMMY_USER_ID,
        id,
        title,
        language,
        code
      );
      if (updatedSnippet) {
        return {
          content: [
            {
              type: "text",
              text: `Snippet "${updatedSnippet.title}" (ID: ${id}) updated.`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Snippet with ID: ${id} not found or access denied.`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error updating snippet: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.registerTool(
  "delete_snippet",
  {
    title: "Delete Code Snippet",
    description: "Deletes a code snippet.",
    inputSchema: {
      id: z.string().describe("The ID of the snippet to delete."),
    },
  },
  async ({ id }) => {
    try {
      const deleted = await deleteSnippet(DUMMY_USER_ID, id);
      if (deleted) {
        return {
          content: [{ type: "text", text: `Snippet with ID: ${id} deleted.` }],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Snippet with ID: ${id} not found or access denied.`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting snippet: ${(error as Error).message}`,
          },
        ],
      };
    }
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

// Load locally built assets
const TEST_COMPONENT_JS = readFileSync(
  "../web-app/dist/assets/index.js",
  "utf8"
);
const TEST_COMPONENT_CSS = (() => {
  try {
    return readFileSync("../web-app/dist/assets/index.css", "utf8");
  } catch {
    return ""; // CSS optional
  }
})();

// Replaced this with inline HTML
// const TEST_COMPONENT_HTML = fs.readFileSync("../web-app/dist/index.html", "utf8");

// UI resource (no inline data assignment; host will inject data)
server.registerResource(
  "test-component-widget",
  "ui://widget/test-component.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/test-component.html",
        mimeType: "text/html+skybridge",
        text: `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>web-app</title>
            <script type="module">${TEST_COMPONENT_JS}</script>
            <style>${TEST_COMPONENT_CSS}</style>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>`,
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
          // Allow the test-component tool to call tools
          "openai/widgetAccessible": true,
        },
      },
    ],
  })
);

server.registerTool(
  "test-component",
  {
    title: "Show test component",
    _meta: {
      // associate this tool with the HTML template
      "openai/outputTemplate": "ui://widget/test-component.html",
      // labels to display in ChatGPT when the tool is called
      "openai/toolInvocation/invoking": "Displaying the test component",
      "openai/toolInvocation/invoked": "Displayed the test component",
    },
    inputSchema: { userInput: z.string() },
  },
  async () => {
    return {
      content: [{ type: "text", text: "Displayed the test component!" }],
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
