# 作品集 AI：连接与部署

2026.10.31：独立 DeepSeek 服务、DNS / HTTPS 与真实问答已验证，密钥从本人指定的本机文件私密填入服务器，没有进入网页或日志。首页通过 `assets/assistant-hosted.js` 启用连接；初始化不请求接口，实际发送才建立会话。部署与验收记录见 `docs/portfolio-ai-deployment-20261031.md`。

用户最终选择在现有阿里云杭州服务器上使用 DeepSeek。采用官方 API 和新作品集专用 Key，不复用旧数独凭据。独立服务、独立状态目录、独立子域；不购买服务器。新增路由须核对现有配置并先 validate，不能重启或覆盖既有数独服务。

部署说明、完整限制与测试在 [server/portfolio-ai/README.md](server/portfolio-ai/README.md)。独立域名为 `ai.bing2002.com`；当前 health 返回 `ready:true`，缺失密钥时仍主动拒绝模型调用。

## 保留的界面规则

首次点击首屏进入姓名与 About me / 作品集导航，完成这一步之后红点才打开 AI。对话是底部居中的非模态小浮窗，没有独立全屏页；窗外、Escape 或导航会关闭并取消浏览器请求，输入问题保留。语音输入已接入真实录音、音量分析和独立识别服务；服务器中英文与公网短语音识别已通过，浏览器完整录音链路已用合成音频验证。实体麦克风和不同设备的授权体验仍需各设备实测。

所有回答使用 `textContent`。仅真实 `ok/assistant` 结果进入对话历史，失败不会伪装成助手回答。输入最多 1000 字符，保留有限的完整问答轮次；失败后可以直接重试，不把未答问题连续提交为多个 user 轮次。

## 连接边界

默认无请求。保留 `configure({endpoint})` 的严格同源校验，或受信任的自定义 `transport`；任意跨源 URL、用户名密码、fragment 或密钥配置仍被拒绝。

后端部署并验收后，在首页连接脚本之后按 defer 顺序加载受控初始化脚本：

```js
PortfolioAssistantConnection.configureHosted();
```

首页现已通过独立的 `defer` 脚本调用，在连接模块之后、聊天 UI 之前执行。它只可在正式站点 origin 上设置固定的 `https://ai.bing2002.com/portfolio-ai/` 适配器，不接受用户提供的主机、模型或密钥。本地和其他 origin 保持默认未连接。

实际第一次发送时才请求 `POST session`，携带 `{version:1}`；后端返回 CSRF token 并设置 Secure / HttpOnly / SameSite=Strict / host-only cookie。随后 `POST chat` 携带 cookie、`X-CSRF-Token` 和 `{version:1,messages}`。CSRF token 仅在内存中，不进入浏览器存储。前端等待上限 22 秒，仅 `invalid_session` 这种尚未调用模型的拒绝会更新会话并重试一次，其他错误不自动重发。

回复协议：

```text
{status:"ok", message:{role:"assistant", content:真实模型返回的文本}}
{status:"error", error:{code:稳定错误码, message:通用描述}}
{status:"not_connected"}
{status:"aborted"}
```

错误状态在 UI 中采用简短中英文提示；不展示供应商原始错误、堆栈、配置或密钥。关闭、清空或导航后通过 AbortSignal 和请求代次忽略过期回复；已提交的模型工作未必能被浏览器取消，服务端仍计入次数。

## 语音输入

点击麦克风后才申请浏览器权限并启动录音；Web Audio 在本地分析实际音量，点阵随声音强弱变化，不用随机动画冒充实时声音。停顿或再次点击后停止，转写文字只填入输入框，保留修改机会，不自动向 DeepSeek 发送。关闭、导航或页面隐藏会停止麦克风、音频处理与动画，并忽略过期识别结果。首页初始化不获取麦克风，也不下载工作线程或请求识别接口。

DeepSeek 继续负责文字问答；语音采用独立的 CPU SenseVoiceSmall int8 / sherpa-onnx 服务，不需要新增语音供应商 Key 或按分钟付费。实时点阵留在浏览器，只有结束后的短 WAV 发送至本人的 HTTPS 服务，录音和识别文本不写入服务端文件或日志。

`POST /portfolio-ai/transcribe` 接收 `Content-Type: audio/wav`，携带与文字问答相同的 cookie、`X-CSRF-Token` 和允许来源；音频限定单声道、16kHz、PCM16、不超过 20 秒和 644096 字节。成功返回 `{status:"ok",text:"…"}`，其他结果沿用通用错误协议。前端最长等待 40 秒，只对尚未进入推理的 `invalid_session` 更新会话并重试一次；其他失败不自动重传录音。

公网网关仍运行在 `127.0.0.1:8791`；模型放在独立、无登录权限的 `portfolio-speech.service` 中，仅监听 `127.0.0.1:8792`，不开放新的公网端口。CPU 单线程、单并发、内存上限 700MiB；模型在子进程中常驻，28 秒未返回则终止该子进程并让 systemd 重启语音服务，不重启数独或文字问答。主服务仅启用经过实测的 worker，默认 `SPEECH_ENABLED=0`。

语音使用 SQLite 独立的 `voice-*` 限额桶：每 IP 3 次/分钟、20 次/日；每会话 15 次/日；全站 60 次/日、600 次/月。推理前事务预占，失败仍计数，和 DeepSeek 问答次数分开。CORS 与会话仍不等于防脚本身份认证。部署时已实测完整 20 秒输入耗时 6.375 秒、服务峰值约 401MiB，未发生重启；公网合成中文短句约 1.3 秒返回。原数独和 Caddy 进程身份保持一致。实体麦克风录音不属于这次合成音频验收，详见 `docs/portfolio-speech-deployment-20261031.md`。

## 密钥、额度与知识

密钥只放服务器私密环境配置，不进入 GitHub Pages、JS、URL、源码仓库、聊天或日志。使用新的作品集专用项目，不能与数独等现有服务共用历史凭据。

后端固定官方 DeepSeek Chat Completions API / `deepseek-flash`，关闭思考、输出最多 400 tokens，无工具执行或任意网络转发。SQLite 在调用前事务预占次数，失败也计数，重启不重置。默认全站 100 次/日、1000 次/月，并有 IP、会话、并发限制；次数限制不是金额预算，供应商侧只使用本人设置的小额余额，不擅自充值。CORS、Origin、cookie 与 CSRF 不是防脚本盗刷的身份认证。

公开知识见 `server/portfolio-ai/knowledge.md`，来源见同目录 `knowledge-sources.md`；上线前作者审核。未公布的工作邀约、薪酬、合作和个人信息不能猜测；案例完成度按公开证据区分成品、原型、设想。这版是受限的文本问答，并不具备执行本机 Skill、读取私有笔记或修改外部系统的能力。
