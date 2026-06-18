#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { isAbsolute } from "path";

// ─── Configuration ────────────────────────────────────────────
const API_KEY = process.env.ARK_API_KEY;
if (!API_KEY) {
  console.error("❌ ARK_API_KEY environment variable is required");
  process.exit(1);
}

const BASE_URL = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const MODEL = process.env.DOUBAO_MODEL || "doubao-seed-2-0-mini-260428";

// ─── Helpers ──────────────────────────────────────────────────

function resolveImageSource(image) {
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const absPath = isAbsolute(image) ? image : process.cwd() + "/" + image;

  if (!existsSync(absPath)) {
    throw new Error(`Image file not found: ${image}`);
  }

  const buffer = readFileSync(absPath);
  const ext = absPath.split(".").pop().toLowerCase();
  const mimeMap = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };
  const mime = mimeMap[ext] || "image/png";
  const base64 = buffer.toString("base64");

  return `data:${mime};base64,${base64}`;
}

async function callDoubaoVision({ image, prompt, detail, maxTokens, temperature }) {
  const imageSource = resolveImageSource(image);

  const content = [
    { type: "text", text: prompt },
    {
      type: "image_url",
      image_url: {
        url: imageSource,
        detail: detail || "auto",
      },
    },
  ];

  const body = {
    model: MODEL,
    messages: [{ role: "user", content }],
    temperature: temperature ?? 1,
    max_tokens: maxTokens ?? 4096,
    stream: false,
  };

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ark API error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage || null,
    model: data.model,
  };
}

// ─── MCP Server ───────────────────────────────────────────────

const server = new Server(
  { name: "doubao-vision-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "doubao_vision_understand",
      description: `Analyze an image using Doubao vision model via Volcengine Ark API.
Supports both preset inference (model name) and custom inference (ep-xxxxx endpoint ID).
Configure via DOUBAO_MODEL environment variable.`,
      inputSchema: {
        type: "object",
        properties: {
          image: {
            type: "string",
            description:
              "Image source: local file path (e.g. C:/path/to/screenshot.png) or URL (https://...)",
          },
          prompt: {
            type: "string",
            description: "What to ask about the image. Be specific for best results.",
          },
          detail: {
            type: "string",
            enum: ["auto", "low", "high"],
            default: "auto",
            description: "Image detail level. 'high' for fine-grained analysis",
          },
          max_tokens: {
            type: "number",
            default: 4096,
            description: "Maximum output tokens",
          },
          temperature: {
            type: "number",
            default: 1,
            description: "Sampling temperature (0-2)",
          },
        },
        required: ["image", "prompt"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "doubao_vision_understand") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments;
  if (!args.image || !args.prompt) {
    throw new Error("Missing required parameters: image and prompt");
  }

  try {
    const result = await callDoubaoVision({
      image: args.image,
      prompt: args.prompt,
      detail: args.detail,
      maxTokens: args.max_tokens,
      temperature: args.temperature,
    });

    let text = result.content;

    if (result.usage) {
      text += `\n\n---\n_⚡ ${result.usage.prompt_tokens ?? "?"} in → ${result.usage.completion_tokens ?? "?"} out (model: ${result.model})_`;
    }

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ Doubao Vision MCP Server ready (model: ${MODEL})`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
