# Job Center Admin UI

面向重构后 Job Center 的纯前端管理控制台，技术栈为 Vite + Vue 3 + TypeScript + Element Plus + Pinia + Vue Router。视觉风格参考 OpenMetadata（主色 `#7147E8`），不依赖旧版 PHP `job-admin`，也不实现自有后端。

## 功能页面

- 概览：探测 `/health/live`、`/health/ready`，展示服务规模与服务卡片
- 服务列表 / 服务详情（概览、任务、凭据）
- 任务详情（概览、调度、游标/状态、手动执行）
- 执行详情（含取消）
- 客户端（创建、编辑、轮换、吊销）
- 审计查询与详情（before / after JSON）
- 连接设置

管理端没有执行列表、实例管理、日志或 SSE 接口。执行页仅支持手动触发、按 ID 查看，以及本浏览器会话内的「最近触发」记录。

## 本地开发

```bash
pnpm install
pnpm dev
```

默认地址：[http://127.0.0.1:5174](http://127.0.0.1:5174)

生产构建：

```bash
pnpm build
pnpm preview
```

## 连接设置

打开「连接设置」页填写：

| 字段 | 说明 |
| --- | --- |
| Base URL | Job Center 根地址。默认占位为 `http://127.0.0.1:8080`。**留空或填写 `/`** 时使用相对路径，开发环境走 Vite 代理，可避免浏览器跨域。 |
| Client ID / Secret | Admin API 的 HMAC 凭证，仅保存在本机 `localStorage`，关闭一次性密钥弹窗后不会再存储明文。 |
| Operator ID / Name | 写入请求头并进入审计的操作者信息。 |

保存后可点击「测试连接」：先探测 `/health/*`（无需签名），再发起带签名的 `GET /v1/admin/services?limit=1`。

## Vite 代理

开发服务器会把 `/v1` 和 `/health` 代理到 Job Center，默认目标为 `http://127.0.0.1:8080`。如需改目标，可在 `.env.local` 中设置：

```bash
VITE_JC_PROXY_TARGET=http://127.0.0.1:8080
```

`.env.local` 已被 git 忽略，请勿把真实密钥提交到仓库。

## 鉴权说明

签名算法已与重构后的 Job Center 对齐（与旧版 job-center 不同）：

```
METHOD
PATH
QUERY
Client-Id
Timestamp
Nonce
Operator-Id
Operator-Name
hex(sha256(body))
```

- `PATH` 仅为路径，例如 `/v1/admin/services`
- `QUERY` 按 RFC3986 编码后，以 key、value 排序并以 `&` 连接；无查询串时为空
- `body` 为实际发送的紧凑 JSON 字节；无请求体时为空字符串
- 签名为 `HMAC-SHA256(canonical, client_secret)` 的小写十六进制，通过 Web Crypto 在浏览器内计算

请求头：`X-JC-Client-Id`、`X-JC-Timestamp`、`X-JC-Nonce`、`X-JC-Operator-Id`、`X-JC-Operator-Name`、`X-JC-Signature`。
