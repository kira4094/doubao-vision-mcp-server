# Doubao Vision MCP Server

[![npm version](https://img.shields.io/npm/v/doubao-vision-mcp-server)](https://www.npmjs.com/package/doubao-vision-mcp-server)

火山方舟（Volcengine Ark）豆包系列 MCP Server：**视觉理解 + Seedream 图像生成 + Seedance 视频生成**，一套密钥全打通。

## 特性

- 🖼️ **4 个工具**：视觉理解 / 图像生成 / 视频提交 / 视频轮询
- 🎬 **Seedream 同步出图**：图像几秒返回，无需轮询
- 🎥 **Seedance 两段式**：异步提交 task_id → 轮询拿视频（MCP stdio 不超时）
- 💬 自定义 prompt，支持中文/英文
- 🔄 所有模型可用环境变量切换，代码零改动
- ⚡ 一行 npx 部署
- 💰 支持火山方舟赠送的免费 token

## 支持的模型

### 视觉理解

| 项目 | 说明 |
|------|------|
| **模型 ID** | `doubao-seed-2-0-mini-260428`（默认，`DOUBAO_MODEL` 可换） |
| **接入点** | 预置推理接入点（无需创建，直接填模型名） |
| **模态** | 文本 + 图片 + 语音 + 视频 |

### 图像生成（Seedream）

| 项目 | 说明 |
|------|------|
| **模型 ID** | `doubao-seedream-5-0-lite-260128`（默认，`SEEDREAM_MODEL` 可换） |
| **图生图** | `doubao-seededit-3-0-i2i-250628`（`SEEDREAM_I2I_MODEL`，传 `image` 参数自动切换） |
| **备选** | `doubao-seedream-5-0-pro-260628` / `doubao-seedream-4-0-250828` / `doubao-seedream-4-5-251128` 等 |

### 视频生成（Seedance）

| 项目 | 说明 |
|------|------|
| **模型 ID** | `doubao-seedance-2-0-260128`（默认，`SEEDANCE_MODEL` 可换） |
| **备选** | `doubao-seedance-2-5-260628` / `doubao-seedance-2-0-fast-260128` / `doubao-seedance-2-0-mini-260615` |
| **⚠️ 注意** | 需在火山方舟控制台**开通对应模型**；`doubao-seedance-1-5-pro-251215` 已退役（Retiring），API 不接受新任务 |

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ARK_API_KEY` | ✅ | — | 火山方舟 API Key。获取：控制台 → API Key 管理 |
| `DOUBAO_MODEL` | 否 | `doubao-seed-2-0-mini-260428` | 视觉模型名（预置接入点）或 ep-xxxxx |
| `SEEDREAM_MODEL` | 否 | `doubao-seedream-5-0-lite-260128` | Seedream 文生图模型 |
| `SEEDREAM_I2I_MODEL` | 否 | `doubao-seededit-3-0-i2i-250628` | Seedream 图生图模型（传 `image` 时自动用） |
| `SEEDANCE_MODEL` | 否 | `doubao-seedance-2-0-260128` | Seedance 视频生成模型 |
| `DOUBAO_BASE_URL` | 否 | `https://ark.cn-beijing.volces.com/api/v3` | API 地址，通常无需修改 |

## 开通模型（重要）

在 [火山方舟控制台](https://console.volcengine.com/ark) → **开通管理** 开通需要的模型（通常有免费试用额度）：
- 图像生成：`Doubao Seedream` 系列
- 视频生成：`Doubao Seedance` 系列（建议 2.0 / 2.5）

## 快速开始

### npx 部署

```json
{
  "mcpServers": {
    "doubao-vision": {
      "command": "npx",
      "args": ["-y", "doubao-vision-mcp-server"],
      "env": {
        "ARK_API_KEY": "ark-xxxxxxxxx-xxxxx"
      }
    }
  }
}
```

### 自定义模型

```json
{
  "mcpServers": {
    "doubao-vision": {
      "command": "npx",
      "args": ["-y", "doubao-vision-mcp-server"],
      "env": {
        "ARK_API_KEY": "ark-xxxxxxxxx-xxxxx",
        "SEEDREAM_MODEL": "doubao-seedream-5-0-pro-260628",
        "SEEDANCE_MODEL": "doubao-seedance-2-5-260628"
      }
    }
  }
}
```

## 工具

### `doubao_vision_understand` — 视觉理解

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `image` | ✅ | — | 本地图片路径 `C:/img.png` 或 URL |
| `prompt` | ✅ | — | 对图片的指令，越具体越好 |
| `detail` | 否 | `auto` | 图片精度：`auto` / `low` / `high` |
| `max_tokens` | 否 | `4096` | 最大输出 token 数 |
| `temperature` | 否 | `1` | 采样温度（0~2） |

### `doubao_seedream_generate` — 图像生成（同步）

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `prompt` | ✅ | — | 图像描述（中英文皆可） |
| `image` | 否 | — | 参考图（本地路径/URL），传了即图生图 |
| `size` | 否 | — | 分辨率，如 `2048x2048`、`1920x1080` |
| `ratio` | 否 | — | 宽高比：`1:1` / `3:4` / `4:3` / `16:9` / `9:16` 等 |
| `n` | 否 | `1` | 生成数量 |

### `doubao_seedance_generate` — 视频生成（异步提交）

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `prompt` | ✅ | — | 视频描述 |
| `image` | 否 | — | 参考图（图生视频） |
| `resolution` | 否 | — | 分辨率（如 `720p`、`1080p`） |
| `duration` | 否 | — | 时长（秒，模型支持范围 4~30） |

返回 `task_id`，随后用 `doubao_seedance_query` 轮询。

### `doubao_seedance_query` — 视频生成（轮询）

| 参数 | 必填 | 说明 |
|------|------|------|
| `task_id` | ✅ | `doubao_seedance_generate` 返回的任务 ID |

返回 `status`（queued / running / succeeded / failed），`succeeded` 时给出视频下载 URL。

## 使用示例

> 分析这张 UI 截图：`C:\screenshot.png`，描述它的布局和配色方案

> 生成一张暖色调复古酒吧氛围图，两个人西装对话，电影胶片质感

> 用这张参考图生成一段 5 秒视频：角色转头看向镜头，微笑（会返回 task_id，再查询）

## 本地开发

```bash
git clone https://github.com/kira4094/doubao-vision-mcp-server.git
cd doubao-vision-mcp-server
npm install
node src/index.js
```

## 验证结果

| 能力 | 模型 | 结果 |
|------|------|------|
| 视觉理解 | `doubao-seed-2-0-mini-260428` | ✅ |
| 图像生成（文生图） | `doubao-seedream-5-0-lite-260128` | ✅ 实测出图 |
| 图像生成（图生图） | `doubao-seededit-3-0-i2i-250628` | ✅ 模型已开通 |
| 视频生成 | `doubao-seedance-2-0-260128` | ⏳ 需控制台开通后启用 |

## 关联项目

- [glm-vision-mcp-server](https://github.com/kira4094/glm-vision-mcp-server) — 智谱 GLM 视觉模型 MCP
- [agnes-image-mcp-server](https://github.com/kira4094/agnes-image-mcp-server) — Agnes 图像生成 MCP
- [agnes-video-mcp-server](https://github.com/kira4094/agnes-video-mcp-server) — Agnes 视频生成 MCP
