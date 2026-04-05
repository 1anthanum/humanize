# Cloudflare Worker 部署指南 / Deployment Guide

## 概览

Humanize 的 AI 改写功能需要一个 CORS 代理来转发请求到 Anthropic API。这个 Cloudflare Worker 支持两种模式：

| 模式 | 说明 | 速率限制 | 模型 |
|------|------|----------|------|
| **Public** | 用户无需 API Key，Worker 使用服务端密钥 | 10 次/小时/IP | Haiku（控制成本） |
| **BYOK** | 用户自带 API Key | 无限制 | 用户选择 |

---

## 前置条件

1. [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
2. [Anthropic API Key](https://console.anthropic.com/)
3. Node.js 18+

---

## 步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. 部署 Worker

```bash
cd proxy
wrangler deploy
```

部署成功后会输出 Worker URL，类似：
```
https://humanize-proxy.<your-subdomain>.workers.dev
```

### 3. 设置 API Key（密钥）

```bash
wrangler secret put ANTHROPIC_API_KEY
# 粘贴你的 Anthropic API Key，回车确认
```

> 这个密钥存储在 Cloudflare 端，不会暴露给前端用户。

### 4.（可选）启用速率限制

默认情况下，如果不绑定 KV namespace，公共模式没有速率限制。建议启用：

```bash
# 创建 KV namespace
wrangler kv namespace create RATE_LIMIT
```

输出类似：
```
{ binding = "RATE_LIMIT", id = "abc123..." }
```

编辑 `wrangler.toml`，取消注释并填入 ID：

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "abc123..."  # 替换为你的实际 ID
```

重新部署：

```bash
wrangler deploy
```

### 5. 在 Humanize 中配置

打开 Humanize → Settings → 粘贴 Worker URL 到 "CORS Proxy URL"。

- 不填 API Key → 公共模式（Haiku，有速率限制）
- 填入 API Key → BYOK 模式（选择任意模型，无限制）

---

## 自定义

### 调整速率限制

编辑 `wrangler.toml`：

```toml
[vars]
RATE_LIMIT_PER_HOUR = "20"  # 改为你想要的数字
```

### 限制 CORS 来源

默认允许所有来源。如需限制，修改 `worker.js` 中的 `corsHeaders()` 函数，将 `'*'` 替换为你的域名。

---

## 成本估算

Cloudflare Workers 免费套餐：10 万请求/天。
Anthropic Haiku：约 $0.001/次请求（1K token 输入 + 1K token 输出）。

按 10 次/小时/IP 限速，月成本通常不超过 $5。

---

## 常见问题

**Q: Worker 部署成功但前端报 CORS 错误？**
确保 Worker URL 填写正确（包含 `https://`），不要末尾加 `/`。

**Q: 公共模式返回 503？**
检查是否执行了 `wrangler secret put ANTHROPIC_API_KEY`。

**Q: 返回 429 Too Many Requests？**
公共模式每 IP 每小时限制 10 次。等一小时或在 Settings 中填入自己的 API Key。
