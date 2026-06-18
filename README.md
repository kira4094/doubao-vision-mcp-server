# Doubao Vision MCP Server

[![npm version](https://img.shields.io/npm/v/doubao-vision-mcp-server)](https://www.npmjs.com/package/doubao-vision-mcp-server)

火山方舟豆包视觉模型 MCP Server，兼容预置推理接入点和模型推理接入点。

## 特性

- 🖼️ 支持本地图片文件路径和远程 URL
- 💬 自定义 prompt
- 🎯 **双模式兼容**：模型名（预置推理接入点）/ ep-ID（模型推理接入点）
- 🔄 切换模型只需改一行环境变量，代码零改动
- ⚡ 一行 npx 部署
- 💰 支持使用火山方舟赠送的免费 token

## 支持的模型

### Doubao-Seed-2.0-Mini（推荐）

| 项目 | 说明 |
|------|------|
| **模型 ID** | `doubao-seed-2-0-mini-260428` |
| **推理接入点** | 预置推理接入点（**无需创建**，直接填模型名） |
| **上下文** | 256K |
| **最大输出** | 128K |
| **输入价格** | ¥0.2 / 百万 tokens |
| **输出价格** | ¥2 / 百万 tokens |
| **模态** | 文本 + 图片 + 语音 + 视频（四模态） |
| **定位** | 轻量均衡，适合通用多模态解析、高并发、成本敏感场景 |

### Doubao-Seed-1.6-Vision（备选）

| 项目 | 说明 |
|------|------|
| **模型 ID** | `doubao-seed-1-6-vision-250815` |
| **推理接入点** | 模型推理接入点（**需要创建**，填 ep-xxxxx ID） |
| **上下文** | 256K |
| **最大输出** | 32K~64K |
| **输入价格** | ¥0.8 / 百万 tokens（0~32K） |
| **输出价格** | ¥8 / 百万 tokens（0~32K） |
| **定位** | 视觉深度思考模型，适合复杂视觉推理任务 |

### 快速对比

| | Doubao-Seed-2.0-Mini | Doubao-Seed-1.6-Vision |
|---|---|---|
| 接入点类型 | 预置（用模型名） | 自定义（用 ep-ID） |
| 上下文 | 256K | 256K |
| 最大输出 | **128K** | 32K~64K |
| 输入价格 | **¥0.2** | ¥0.8 |
| 输出价格 | **¥2** | ¥8 |

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ARK_API_KEY` | ✅ | — | 火山方舟 API Key。获取：控制台 → API Key 管理 |
| `DOUBAO_MODEL` | 否 | `doubao-seed-2-0-mini-260428` | 模型名（预置接入点）或 ep-xxxxx（模型推理接入点） |
| `DOUBAO_BASE_URL` | 否 | `https://ark.cn-beijing.volces.com/api/v3` | API 地址，通常无需修改 |

## 快速开始

### 使用预置推理接入点（推荐，无需创建）

```json
{
  "mcpServers": {
    "doubao-vision": {
      "command": "npx",
      "args": ["-y", "doubao-vision-mcp-server"],
      "env": {
        "ARK_API_KEY": "ark-xxxxxxxxx-xxxxx",
        "DOUBAO_MODEL": "doubao-seed-2-0-mini-260428"
      }
    }
  }
}
```

### 使用模型推理接入点（ep-）

需要先在火山方舟控制台创建推理接入点：

```json
{
  "mcpServers": {
    "doubao-vision": {
      "command": "npx",
      "args": ["-y", "doubao-vision-mcp-server"],
      "env": {
        "ARK_API_KEY": "ark-xxxxxxxxx-xxxxx",
        "DOUBAO_MODEL": "ep-20260607xxxxx-xxxxx"
      }
    }
  }
}
```

## 使用本地路径（开发调试）

```json
{
  "mcpServers": {
    "doubao-vision": {
      "command": "node",
      "args": ["E:\\Projects\\Claude\\MCP\\doubao\\doubao-vision-mcp-server\\src\\index.js"],
      "env": {
        "ARK_API_KEY": "ark-xxxxxxxxx-xxxxx",
        "DOUBAO_MODEL": "doubao-seed-2-0-mini-260428"
      }
    }
  }
}
```

## 工具

### `doubao_vision_understand`

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `image` | ✅ | — | 本地图片路径 `C:/img.png` 或 URL `https://...` |
| `prompt` | ✅ | — | 对图片的指令，越具体越好 |
| `detail` | 否 | `auto` | 图片精度：`auto` / `low` / `high` |
| `max_tokens` | 否 | `4096` | 最大输出 token 数 |
| `temperature` | 否 | `1` | 采样温度（0~2） |

### 使用示例

> 分析这张 UI 截图：`C:\screenshot.png`，描述它的布局和配色方案

> 识别这张图片里的文字：`https://example.com/doc.png`

## 本地开发

```bash
git clone https://github.com/kira4094/doubao-vision-mcp-server.git
cd doubao-vision-mcp-server
npm install
node src/index.js
```

## 验证结果

实测通过以下两种接入点：

| 类型 | DOUBAO_MODEL | Token 消耗 | 状态 |
|------|-------------|-----------|------|
| 预置推理接入点 | `doubao-seed-2-0-mini-260428` | 1314 in → 295 out | ✅ |
| 模型推理接入点 | `ep-xxxxxxx-xxxxx` | 683 in → 277 out | ✅ |

## 关联项目

- [glm-vision-mcp-server](https://github.com/kira4094/glm-vision-mcp-server) — 智谱 GLM 视觉模型 MCP（GLM-5V-Turbo / GLM-4.6V 等）
