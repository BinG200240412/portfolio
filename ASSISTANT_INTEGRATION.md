# 作品集助手：未来接入说明

当前交付只有界面与连接边界，没有配置模型、API、个人知识库或 agent 规范。默认 `reply()` 返回 `not_connected`，不会发送网络请求，也不会模拟助手回答。

## UI 协议

界面是页面底部居中的非模态小浮窗。首次点击首屏红点只进入姓名与“关于我 / 作品集”导航；完成这一步后，在导航或作品集状态点击同一个红点才打开或收起助手。浮窗保留背景与页面交互；点击窗外、按 Escape 或进入页面也会收起。没有独立二级界面或全屏遮罩。

`PortfolioAssistant.open()` / `.close()` / `.toggle()` 管理浮窗。开关派发 `portfolio:assistant`，`detail.open` 为布尔值。导航广播使用 `detail.reason` 区分真正导航、助手开关及打字完成，避免浮窗自关；关闭只中止请求，不清除已输入的对话。

加载 `assets/assistant-connection.js` 后使用：

```js
const controller = new AbortController();
const result = await window.PortfolioAssistantConnection.reply(
  [{ role: 'user', content: '用户实际输入' }],
  { signal: controller.signal }
);
```

`messages` 是历史消息数组，仅接受 `user` / `assistant` 以及非空字符串 `content`。连接层只复制这两个字段，不修改输入数组。个人资料和系统指令由未来服务端添加，不从浏览器消息中冒充 `system`。

`reply()` 的正常调用始终 resolve 为以下一种结果：

| status | 内容 | UI 处理 |
| --- | --- | --- |
| `not_connected` | 无回答 | 显示“尚未接入”的界面状态，不追加助手消息 |
| `ok` | `message: {role: 'assistant', content: string}` | 仅此状态可显示为助手回答 |
| `error` | `error: {code: string, message: string}` | 显示可重试的本地错误状态；不是助手说的话 |
| `aborted` | 无回答 | 结束等待，不追加回答 |

等待状态由 UI 在调用前设置、完成后清除。关闭、清空或离开时执行 `controller.abort()`；UI 也应保留自己的请求代次校验，忽略过期结果。连接层会及时返回 `aborted`，即使自定义 transport 没有响应取消；真正停止其后台工作仍需 transport 遵循 signal。连接配置在调用开始时拍快照，改配置不会主动取消已经开始的请求。

错误码包括 `invalid_messages`、`invalid_signal`、`invalid_response`、`http_error`、`network_error`、`transport_error`；HTTP 失败还带 `httpStatus`。错误文字供开发定位，UI 请按 `code` 提供中英文提示。协议不包含 HTML，回答应作为文本渲染。

## 未来接入同源服务端

GitHub Pages 本身不能保存密钥或运行模型代理。以后先准备同源服务端路由，再在受控初始化代码中配置；以下为配置方法，本次没有执行：

```js
PortfolioAssistantConnection.configure({ endpoint: '/api/portfolio-assistant' });
```

也接受绝对的同源 HTTP(S) URL。跨源地址、URL 内用户名密码、fragment 以及额外配置项会被拒绝。不要把密钥放进 URL、静态文件、浏览器存储或 `configure()`；模型密钥只放未来服务端的环境配置中。

浏览器只在之后实际调用 `reply()` 时 POST：

```json
{
  "version": 1,
  "messages": [{"role": "user", "content": "用户实际输入"}]
}
```

请求是 JSON，携带同源会话凭证，禁止跟随重定向。服务端重新校验消息、会话和请求来源，并负责调用所选模型；不要把前端角色当作可信系统指令。

成功响应 HTTP 200，JSON 协议如下（`content` 必须是服务端实际生成的非空内容）：

```text
{status: "ok", message: {role: "assistant", content: 实际生成的文本}}
```

服务端尚未就绪时可返回 `{status: "not_connected"}`；可恢复的应用错误可返回 `{status: "error", error: {code, message}}`。非 2xx 作为 `http_error` 处理，不把服务端错误页或堆栈插入对话。

## 自定义 transport 与重置

需要接入既有个人 agent 服务时，可用一个受信任的适配函数替代 endpoint；两个选项不能同时配置：

```js
PortfolioAssistantConnection.configure({
  transport: async (messages, { signal }) => {
    // 在此调用自己的同源服务端，遵守 signal，并返回上面的结构化结果。
    return { status: 'not_connected' }; // 未接入时保持诚实；不要编写假回答。
  }
});
```

`configure()` 不会发请求。`configure({})` 恢复默认未连接状态。`PortfolioAssistantConnection.mode` 可读取 `not_connected` / `endpoint` / `transport`；后两者只表示已经填写配置，不表示服务已验证可用。非法配置会同步抛 `TypeError`，旧配置保持不变；此项针对开发配置，不是对话结果。当前不提供前端密钥、model、任意 headers、工具执行或自动重试等选项。

## 后续填写个人资料与 agent 规范

资料由作者实际提供、审核，再存放于服务端；以下仅是待填写的结构，不代表已经存在的事实：

- 自我介绍与公开联系方式：只填确认可公开的内容。
- 作品条目：项目名称、背景、本人角色、实际完成内容、时间、可引用链接；区分成品、原型与设想。
- 常见问题：作者认可的回答范围，以及不确定时应如何说明。
- agent 规范：语气、中英文规则、可引用材料、禁止推断的个人事实、何时回答“不知道”。
- Skills / 工具：清单、各自用途、输入输出与执行权限；工具是否能发请求或改外部状态，需要单独明确。

接入时让服务端读取这些材料并构造指令或检索上下文，不把完整私有资料打包进公开网站。没有提供或核实的个人事实，不作为答案补全。前端接入层不持有这些内容，也不假定任何具体模型供应商。
