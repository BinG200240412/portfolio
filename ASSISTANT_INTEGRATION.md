# 作品集 AI：连接与部署

2026.10.31：红点连接、DeepSeek 后端和公开知识草稿已准备，29 项本地检查通过。杭州服务器的独立服务、DNS 和 HTTPS 已部署；**尚未填写真实 API Key，也未完成模型问答验收**。线上前端保持 `not_connected`，不生成模拟答案。部署记录见 `docs/portfolio-ai-deployment-20261031.md`。

用户最终选择在现有阿里云杭州服务器上使用 DeepSeek。采用官方 API 和新作品集专用 Key，不复用旧数独凭据。独立服务、独立状态目录、独立子域；不购买服务器。新增路由须核对现有配置并先 validate，不能重启或覆盖既有数独服务。

部署说明、完整限制与测试在 [server/portfolio-ai/README.md](server/portfolio-ai/README.md)。独立域名为 `ai.bing2002.com`；当前 health 返回 `ready:false`，无密钥时主动拒绝模型调用。

## 保留的界面规则

首次点击首屏进入姓名与 About me / 作品集导航，完成这一步之后红点才打开 AI。对话是底部居中的非模态小浮窗，没有独立全屏页；窗外、Escape 或导航会关闭并取消浏览器请求，输入问题保留。当前语音按钮只是面板预览，尚无录音、识别或语音 API。

所有回答使用 `textContent`。仅真实 `ok/assistant` 结果进入对话历史，失败不会伪装成助手回答。输入最多 1000 字符，保留有限的完整问答轮次；失败后可以直接重试，不把未答问题连续提交为多个 user 轮次。

## 连接边界

默认无请求。保留 `configure({endpoint})` 的严格同源校验，或受信任的自定义 `transport`；任意跨源 URL、用户名密码、fragment 或密钥配置仍被拒绝。

后端部署并验收后，在首页连接脚本之后按 defer 顺序加载受控初始化脚本：

```js
PortfolioAssistantConnection.configureHosted();
```

**当前没有执行这句，也没有在入口中添加它。** 它只可在正式站点 origin 上设置固定的 `https://ai.bing2002.com/portfolio-ai/` 适配器，不接受用户提供的主机、模型或密钥。

实际第一次发送时才请求 `POST session`，携带 `{version:1}`；后端返回 CSRF token 并设置 Secure / HttpOnly / SameSite=Strict / host-only cookie。随后 `POST chat` 携带 cookie、`X-CSRF-Token` 和 `{version:1,messages}`。CSRF token 仅在内存中，不进入浏览器存储。前端等待上限 22 秒，仅 `invalid_session` 这种尚未调用模型的拒绝会更新会话并重试一次，其他错误不自动重发。

回复协议：

```text
{status:"ok", message:{role:"assistant", content:真实模型返回的文本}}
{status:"error", error:{code:稳定错误码, message:通用描述}}
{status:"not_connected"}
{status:"aborted"}
```

错误状态在 UI 中采用简短中英文提示；不展示供应商原始错误、堆栈、配置或密钥。关闭、清空或导航后通过 AbortSignal 和请求代次忽略过期回复；已提交的模型工作未必能被浏览器取消，服务端仍计入次数。

## 密钥、额度与知识

密钥只放服务器私密环境配置，不进入 GitHub Pages、JS、URL、源码仓库、聊天或日志。使用新的作品集专用项目，不能与数独等现有服务共用历史凭据。

后端固定官方 DeepSeek Chat Completions API / `deepseek-flash`，关闭思考、输出最多 400 tokens，无工具执行或任意网络转发。SQLite 在调用前事务预占次数，失败也计数，重启不重置。默认全站 100 次/日、1000 次/月，并有 IP、会话、并发限制；次数限制不是金额预算，供应商侧只使用本人设置的小额余额，不擅自充值。CORS、Origin、cookie 与 CSRF 不是防脚本盗刷的身份认证。

公开知识见 `server/portfolio-ai/knowledge.md`，来源见同目录 `knowledge-sources.md`；上线前作者审核。未公布的工作邀约、薪酬、合作和个人信息不能猜测；案例完成度按公开证据区分成品、原型、设想。这版是受限的文本问答，并不具备执行本机 Skill、读取私有笔记或修改外部系统的能力。
