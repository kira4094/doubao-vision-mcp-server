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

const BASE_URL =
  process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
const VISION_MODEL = process.env.DOUBAO_MODEL || "doubao-seed-2-0-mini-260428";
const SEEDREAM_MODEL =
  process.env.SEEDREAM_MODEL || "doubao-seedream-5-0-lite-260128";
const SEEDREAM_I2I_MODEL =
  process.env.SEEDREAM_I2I_MODEL || "doubao-seededit-3-0-i2i-250628";
const SEEDANCE_MODEL =
  process.env.SEEDANCE_MODEL || "doubao-seedance-2-0-260128";

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

async function arkFetch(path, body, method = "POST") {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ark API error (${response.status}): ${errText}`);
  }

  return response.json();
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

  const data = await arkFetch("/chat/completions", {
    model: VISION_MODEL,
    messages: [{ role: "user", content }],
    temperature: temperature ?? 1,
    max_tokens: maxTokens ?? 4096,
    stream: false,
  });

  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage || null,
    model: data.model,
  };
}

async function callSeedream({ prompt, image, size, ratio, n }) {
  const body = { model: SEEDREAM_MODEL, prompt, n: n || 1 };
  if (size) body.size = size;
  if (ratio) body.ratio = ratio;
  if (image) {
body.model = process.env.SEEDREAM_I2I_MODEL || "doubao-seededit-3-0-i2i-250628";
    // 图生图：image 传 base64 data URL（OpenAI 兼容 images/generations）
    body.image = resolveImageSource(image);
    body.response_format = "url";
  }
  return arkFetch("/images/generations", body);
}

async function createSeedanceTask({ prompt, image, resolution, duration }) {
  const content = image
    ? [
        { type: "image_url", image_url: { url: resolveImageSource(image) } },
        { type: "text", text: prompt },
      ]
    : [{ type: "text", text: prompt }];

  const body = { model: SEEDANCE_MODEL, content };
  if (resolution) body.resolution = resolution;
  if (duration) body.duration = duration;
  return arkFetch("/contents/generations/tasks", body);
}

async function pollSeedanceTask(taskId) {
  return arkFetch(
    `/contents/generations/tasks/${encodeURIComponent(taskId)}`,
    null,
    "GET"
  );
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
    {
      name: "doubao_seedream_generate",
      description: `Generate an image using Doubao Seedream model via Volcengine Ark API (SYNCHRONOUS, returns in seconds).
Supports text-to-image (prompt only) and image-to-image (with image param).
Configure model via SEEDREAM_MODEL environment variable.`,
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the image to generate. Supports Chinese and English.",
          },
          image: {
            type: "string",
            description:
              "Optional reference image (local path or URL) for image-to-image generation",
          },
          size: {
            type: "string",
            description:
              "Image resolution e.g. 2048x2048, 1920x1080, 1080x1920, 1024x1024 (if set, ratio is ignored)",
          },
          ratio: {
            type: "string",
            enum: ["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"],
            description: "Aspect ratio (ignored if size is set)",
          },
          n: {
            type: "number",
            default: 1,
            description: "Number of images to generate",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "doubao_seedance_generate",
      description: `Create a video generation task using Doubao Seedance model via Volcengine Ark API.
Video generation is ASYNCHRONOUS — submit a task, then use doubao_seedance_query to check results.
Configure model via SEEDANCE_MODEL environment variable.`,
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Text description of the video to generate",
          },
          image: {
            type: "string",
            description:
              "Optional reference image (local path or URL) for image-to-video generation",
          },
          resolution: {
            type: "string",
            description: "Video resolution e.g. 720p, 1080p (if supported by model)",
          },
          duration: {
            type: "number",
            description: "Video duration in seconds (if supported by model)",
          },
        },
        required: ["prompt"],
      },
    },
    {
      name: "doubao_seedance_query",
      description: `Poll a video generation task by task_id to check progress.
Returns task status and video URL when completed.
The task_id is returned by doubao_seedance_generate.`,
      inputSchema: {
        type: "object",
        properties: {
          task_id: {
            type: "string",
            description: "Task ID returned from doubao_seedance_generate",
          },
        },
        required: ["task_id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments;

  try {
    // 1. Vision (unchanged)
    if (request.params.name === "doubao_vision_understand") {
      if (!args.image || !args.prompt) {
        throw new Error("Missing required parameters: image and prompt");
      }

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
      return { content: [{ type: "text", text }] };
    }

    // 2. Seedream (synchronous image generation)
    if (request.params.name === "doubao_seedream_generate") {
      if (!args.prompt) {
        throw new Error("Missing required parameter: prompt");
      }

      const result = await callSeedream({
        prompt: args.prompt,
        image: args.image,
        size: args.size,
        ratio: args.ratio,
        n: args.n,
      });

      const images = result.data || [];
      if (images.length === 0) {
        return {
          content: [{ type: "text", text: "❌ No image generated." }],
          isError: true,
        };
      }

      const lines = images.map((img, i) => {
        const url = img.url || img.b64_json || "";
        if (!url) return `${i + 1}. (no URL)`;
        return `${i + 1}. ![Generated Image](${url})\n   ${url}`;
      });

      let text = lines.join("\n\n");
      if (result.usage) {
        text += `\n\n---\n_⚡ ${JSON.stringify(result.usage)}_`;
      }
      return { content: [{ type: "text", text }] };
    }

    // 3. Seedance (async submit)
    if (request.params.name === "doubao_seedance_generate") {
      if (!args.prompt) {
        throw new Error("Missing required parameter: prompt");
      }

      const result = await createSeedanceTask({
        prompt: args.prompt,
        image: args.image,
        resolution: args.resolution,
        duration: args.duration,
      });

      const taskId = result.id || result.task_id || "N/A";
      const status = result.status || "queued";

      let text = `🎬 Video task created\n\n**task_id:** \`${taskId}\`\n**status:** ${status}\n\n`;
      text += `Use \`doubao_seedance_query\` with \`task_id: "${taskId}"\` to check progress.`;
      return { content: [{ type: "text", text }] };
    }

    // 4. Seedance (async poll)
    if (request.params.name === "doubao_seedance_query") {
      if (!args.task_id) {
        throw new Error("Missing required parameter: task_id");
      }

      const result = await pollSeedanceTask(args.task_id);
      const status = result.status || result.state || "unknown";
      const videoUrl =
        result.video_url ||
        result.url ||
        result.content?.video_url ||
        result.output?.video_url ||
        "";
      const progress = result.progress ?? result.progress;

      let text = `**task_id:** \`${args.task_id}\`\n**status:** ${status}\n`;
      if (progress !== undefined && progress !== null) {
        text += `**progress:** ${progress}%\n`;
      }

      if (status === "succeeded" && videoUrl) {
        text += `\n✅ Video ready!\n\n📹 [Download Video](${videoUrl})\n\`${videoUrl}\``;
      } else if (status === "failed") {
        text += `\n❌ Failed: ${result.error || result.message || "Unknown error"}`;
      } else {
        text += `\n⏳ Still processing... Check again later.`;
      }

      return { content: [{ type: "text", text }] };
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
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
  console.error(
    `✅ Doubao MCP Server ready (vision: ${VISION_MODEL} | seedream: ${SEEDREAM_MODEL} | seedance: ${SEEDANCE_MODEL})`
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
